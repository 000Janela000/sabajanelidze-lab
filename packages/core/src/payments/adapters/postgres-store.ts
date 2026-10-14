import type { Cents } from '../../money/cents.ts'
import { PAYOUT_STATUS, type PayoutStatus, RESERVE_RESULT, type ReserveResult } from '../codes.ts'
import { isValidAmount, type PaymentsStore, type PayoutRecord } from '../ports.ts'

/** What both node-postgres and PGlite can do: run a statement, or several in one transaction. */
export interface Sql {
  query<Row = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: Row[] }>
  /** Runs `work` in one transaction, on one connection. */
  transaction<T>(work: (tx: Sql) => Promise<T>): Promise<T>
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
  status      text NOT NULL CHECK (status IN ('HELD', 'PAID', 'RELEASED'))
);`

/** The same store, on a real database. */
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
         SELECT $3, customer_id, $2, 'HELD' FROM moved
         RETURNING payout_id`,
        [customerId, amount, payoutId],
      )
      if (rows.length === 1) return RESERVE_RESULT.RESERVED
      // #endregion postgres-reserve
    } catch (error) {
      // Two requests with the same new ID at the same moment: the primary key stops the second,
      // and its whole statement, including the balance change, is rolled back.
      if ((error as { code?: string }).code === '23505') return RESERVE_RESULT.DUPLICATE
      throw error
    }
    return (await this.payout(payoutId)) ? RESERVE_RESULT.DUPLICATE : RESERVE_RESULT.INSUFFICIENT_FUNDS
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
    await this.#closeHold(payoutId, PAYOUT_STATUS.PAID, 'held = b.held - p.amount')
  }

  async release(payoutId: string): Promise<void> {
    await this.#closeHold(
      payoutId,
      PAYOUT_STATUS.RELEASED,
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
    await this.#sql.transaction(async (tx) => {
      // #region postgres-lock-order
      // Lock order: the balance row first, then the payout row, the same order as the reserve.
      // Payout first here would deadlock with a reserve that repeats this payout ID
      // (the real-database test in CI found it).
      await tx.query(
        `SELECT 1 FROM balances
          WHERE customer_id = (SELECT customer_id FROM payouts WHERE payout_id = $1)
            FOR UPDATE`,
        [payoutId],
      )
      // #endregion postgres-lock-order
      const { rows } = await tx.query(
        `WITH p AS (
           UPDATE payouts SET status = $2 WHERE payout_id = $1 AND status = 'HELD'
           RETURNING customer_id, amount
         )
         UPDATE balances b SET ${change} FROM p WHERE b.customer_id = p.customer_id
         RETURNING b.customer_id`,
        [payoutId, status],
      )
      if (rows.length === 0) throw new Error(`No open hold for payout ${payoutId}`)
    })
  }
}
