import type { Cents } from '../money.ts'
import {
  isValidAmount,
  type PaymentsStore,
  type PayoutRecord,
  type PayoutStatus,
  type ReserveResult,
} from './ports.ts'

/** The one thing both node-postgres and PGlite can do: run a statement. */
export interface Sql {
  query<Row = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: Row[] }>
}

/** The tables the store needs. The CHECKs are a backstop, not the fix: the fix is the reserve statement. */
export const POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS balances (
  customer_id text PRIMARY KEY,
  available   bigint NOT NULL CHECK (available >= 0),
  held        bigint NOT NULL DEFAULT 0 CHECK (held >= 0)
);
CREATE TABLE IF NOT EXISTS payouts (
  payout_id   text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES balances (customer_id),
  amount      bigint NOT NULL CHECK (amount > 0),
  status      text NOT NULL CHECK (status IN ('held', 'paid', 'released'))
);`

/** The same store, on a real database. Every method is one statement, so it is atomic on its own. */
export class PostgresPaymentsStore implements PaymentsStore {
  readonly #sql: Sql

  constructor(sql: Sql) {
    this.#sql = sql
  }

  async loadCustomer(customerId: string): Promise<void> {
    const { rows } = await this.#sql.query('SELECT 1 FROM balances WHERE customer_id = $1', [customerId])
    if (rows.length === 0) throw new Error(`Unknown customer ${customerId}`)
  }

  async readAvailable(customerId: string): Promise<Cents> {
    return (await this.balance(customerId)).available
  }

  async writeAvailable(customerId: string, value: Cents): Promise<void> {
    await this.#sql.query('UPDATE balances SET available = $2 WHERE customer_id = $1', [customerId, value])
  }

  async reserve(customerId: string, amount: Cents, payoutId: string): Promise<ReserveResult> {
    if (!isValidAmount(amount)) throw new RangeError(`Not a valid amount: ${amount}`)
    try {
      // #region postgres-reserve
      const { rows } = await this.#sql.query(
        `WITH moved AS (
           UPDATE balances
              SET available = available - $2, held = held + $2
            WHERE customer_id = $1 AND available >= $2
              AND NOT EXISTS (SELECT 1 FROM payouts WHERE payout_id = $3)
           RETURNING customer_id
         )
         INSERT INTO payouts (payout_id, customer_id, amount, status)
         SELECT $3, customer_id, $2, 'held' FROM moved
         RETURNING payout_id`,
        [customerId, amount, payoutId],
      )
      if (rows.length === 1) return 'reserved'
      // #endregion postgres-reserve
    } catch (error) {
      // Two requests with the same new ID at the same moment: the primary key stops the second,
      // and its whole statement, including the balance change, is rolled back.
      if ((error as { code?: string }).code === '23505') return 'duplicate'
      throw error
    }
    return (await this.payout(payoutId)) ? 'duplicate' : 'not enough money'
  }

  async payout(payoutId: string): Promise<PayoutRecord | null> {
    const { rows } = await this.#sql.query<{ customer_id: string; amount: unknown; status: PayoutStatus }>(
      'SELECT customer_id, amount, status FROM payouts WHERE payout_id = $1',
      [payoutId],
    )
    const row = rows[0]
    return row
      ? { payoutId, customerId: row.customer_id, amount: Number(row.amount), status: row.status }
      : null
  }

  async settle(payoutId: string): Promise<void> {
    await this.#closeHold(payoutId, 'paid', 'held = b.held - p.amount')
  }

  async release(payoutId: string): Promise<void> {
    await this.#closeHold(
      payoutId,
      'released',
      'held = b.held - p.amount, available = b.available + p.amount',
    )
  }

  async lock(): Promise<void> {
    throw new Error('The Postgres store needs no application lock: the reserve is one statement')
  }

  async unlock(): Promise<void> {
    throw new Error('The Postgres store needs no application lock: the reserve is one statement')
  }

  async balance(customerId: string): Promise<{ available: Cents; held: Cents }> {
    const { rows } = await this.#sql.query<{ available: unknown; held: unknown }>(
      'SELECT available, held FROM balances WHERE customer_id = $1',
      [customerId],
    )
    const row = rows[0]
    if (!row) throw new Error(`Unknown customer ${customerId}`)
    return { available: Number(row.available), held: Number(row.held) }
  }

  async #closeHold(payoutId: string, status: PayoutStatus, change: string): Promise<void> {
    const { rows } = await this.#sql.query(
      `WITH p AS (
         UPDATE payouts SET status = $2 WHERE payout_id = $1 AND status = 'held'
         RETURNING customer_id, amount
       )
       UPDATE balances b SET ${change} FROM p WHERE b.customer_id = p.customer_id
       RETURNING b.customer_id`,
      [payoutId, status],
    )
    if (rows.length === 0) throw new Error(`No open hold for payout ${payoutId}`)
  }
}
