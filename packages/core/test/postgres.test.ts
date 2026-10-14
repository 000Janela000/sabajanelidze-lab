import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  FakeBank,
  type PaymentsStore,
  POSTGRES_SCHEMA,
  PostgresPaymentsStore,
  type Sql,
  type Withdraw,
  withdraw,
  withdrawV01,
} from '../src/index.ts'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function freshCustomer(sql: Sql, customerId: string, opening: number) {
  await sql.query('INSERT INTO balances (customer_id, available) VALUES ($1, $2)', [customerId, opening])
}

async function lost(store: PostgresPaymentsStore, bank: FakeBank, customerId: string, opening: number) {
  const { available, held } = await store.balance(customerId)
  return available + held + bank.paidOut(customerId) - opening
}

// One connection, one request at a time: checks that the SQL itself is right. Runs everywhere.
describe('Postgres store on PGlite (the SQL, one request at a time)', () => {
  let db: PGlite
  let sql: Sql

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(POSTGRES_SCHEMA)
    const wrap = (target: Pick<PGlite, 'query'>): Sql => ({
      query: async (text, params) => ({ rows: (await target.query(text, params)).rows as never[] }),
      transaction: (work) => db.transaction((tx) => work(wrap(tx))),
    })
    sql = wrap(db)
  })

  afterAll(async () => {
    await db.close()
  })

  test('build v1 pays out, then refuses a second 80 from what is left', async () => {
    await freshCustomer(sql, 'p1', 10000)
    const store = new PostgresPaymentsStore(sql)
    const bank = new FakeBank()
    await expect(
      withdraw({ store, bank }, { customerId: 'p1', amount: 8000, payoutId: 'a' }),
    ).resolves.toEqual({
      status: 'paid',
    })
    await expect(
      withdraw({ store, bank }, { customerId: 'p1', amount: 8000, payoutId: 'b' }),
    ).resolves.toMatchObject({
      status: 'refused',
    })
    await expect(store.balance('p1')).resolves.toEqual({ available: 2000, held: 0 })
    await expect(lost(store, bank, 'p1', 10000)).resolves.toBe(0)
  })

  test('a refused payout gives the hold back', async () => {
    await freshCustomer(sql, 'p2', 10000)
    const store = new PostgresPaymentsStore(sql)
    const bank = new FakeBank()
    bank.failNext('refuse')
    await withdraw({ store, bank }, { customerId: 'p2', amount: 8000, payoutId: 'c' })
    await expect(store.balance('p2')).resolves.toEqual({ available: 10000, held: 0 })
  })

  test('a repeated payout ID gets the first answer, and no money moves twice', async () => {
    await freshCustomer(sql, 'p4', 20000)
    const store = new PostgresPaymentsStore(sql)
    const bank = new FakeBank()
    const request = { customerId: 'p4', amount: 8000, payoutId: 'same' }
    await withdraw({ store, bank }, request)
    await expect(withdraw({ store, bank }, request)).resolves.toEqual({ status: 'paid' })
    await expect(store.balance('p4')).resolves.toEqual({ available: 12000, held: 0 })
    expect(bank.payouts).toHaveLength(1)
  })

  test('the CHECK constraint is only a backstop: it refuses a negative balance', async () => {
    await freshCustomer(sql, 'p3', 100)
    await expect(new PostgresPaymentsStore(sql).writeAvailable('p3', -1)).rejects.toThrow()
  })
})

/**
 * Many connections at once on a real Postgres server (CI starts one and sets DATABASE_URL).
 * The store waits 20 ms after each read, like a slow network, so the naive code's gap is wide
 * enough to hit every time. Build v1 gets the same delay and must still pay out exactly once.
 */
describe.skipIf(!process.env.DATABASE_URL)('Postgres store on a real server (20 withdrawals at once)', () => {
  let pool: pg.Pool
  let sql: Sql

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 25 })
    sql = {
      query: async (text, params) => ({ rows: (await pool.query(text, params)).rows as never[] }),
      transaction: async (work) => {
        const client = await pool.connect()
        const tx: Sql = {
          query: async (text, params) => ({ rows: (await client.query(text, params)).rows as never[] }),
          transaction: () => Promise.reject(new Error('Nested transactions are not used')),
        }
        try {
          await client.query('BEGIN')
          const result = await work(tx)
          await client.query('COMMIT')
          return result
        } catch (error) {
          await client.query('ROLLBACK')
          throw error
        } finally {
          client.release()
        }
      },
    }
    await pool.query(
      'DROP TABLE IF EXISTS payouts; DROP TABLE IF EXISTS holds; DROP TABLE IF EXISTS balances',
    )
    await pool.query(POSTGRES_SCHEMA)
  })

  afterAll(async () => {
    await pool.end()
  })

  function slowReads(store: PostgresPaymentsStore): PaymentsStore {
    return {
      loadCustomer: (id) => store.loadCustomer(id),
      readAvailable: async (id) => {
        const value = await store.readAvailable(id)
        await sleep(20)
        return value
      },
      writeAvailable: (id, value) => store.writeAvailable(id, value),
      reserve: (id, amount, payoutId) => store.reserve(id, amount, payoutId),
      payout: (payoutId) => store.payout(payoutId),
      settle: (payoutId) => store.settle(payoutId),
      release: (payoutId) => store.release(payoutId),
      lock: () => store.lock(),
      unlock: () => store.unlock(),
    }
  }

  async function race(code: Withdraw, customerId: string) {
    await freshCustomer(sql, customerId, 10000)
    const store = new PostgresPaymentsStore(sql)
    const bank = new FakeBank()
    const ports = { store: slowReads(store), bank }
    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        code(ports, { customerId, amount: 8000, payoutId: `${customerId}-${index}` }),
      ),
    )
    return { payouts: bank.payouts.length, lost: await lost(store, bank, customerId, 10000) }
  }

  test('build v1 (reserve, then settle): exactly one payout, nothing lost', async () => {
    await expect(race(withdraw, 'real-v1')).resolves.toEqual({ payouts: 1, lost: 0 })
  })

  test('the same new payout ID sent 20 times at once moves the money once', async () => {
    await freshCustomer(sql, 'real-same-id', 30000)
    const store = new PostgresPaymentsStore(sql)
    const bank = new FakeBank()
    const ports = { store: slowReads(store), bank }
    await Promise.all(
      Array.from({ length: 20 }, () =>
        withdraw(ports, { customerId: 'real-same-id', amount: 8000, payoutId: 'one-id' }),
      ),
    )
    expect(bank.payouts).toHaveLength(1)
    await expect(lost(store, bank, 'real-same-id', 30000)).resolves.toBe(0)
  })

  // The defence check on a real database: without the reserve, the same race pays out more than once.
  test('build v0.1 on the same database pays out more than once', async () => {
    const result = await race(withdrawV01, 'real-v01')
    expect(result.payouts).toBeGreaterThan(1)
    expect(result.lost).not.toBe(0)
  })
})
