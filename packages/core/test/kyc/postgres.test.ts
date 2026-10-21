import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  ANNA,
  annaMessages,
  BORIS,
  borisMessages,
  COMPARISON,
  EVENT_RESULT,
  forgedApprovalForBoris,
  HOLD_REASON,
  handleEvent,
  handleEventV01,
  KYC_POSTGRES_SCHEMA,
  KYC_STATUS,
  type KycStore,
  lostAnswerNight,
  MemoryProviderApi,
  PostgresKycStore,
  PostgresRefusalLog,
  PROVIDER_TEST_KEY,
  type ProviderEvent,
  providerRecords,
  reconcileWithProvider,
  type Sql,
  sign,
  signatureCheck,
} from '../../src/index.ts'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Anna's or Boris's messages under a new applicant ID, so each test has its own rows. */
async function messagesFor(applicantId: string, messages: readonly ProviderEvent[]) {
  return Promise.all(
    messages.map((message) =>
      sign({ ...message, applicantId, eventId: `${message.eventId}_${applicantId}` }, PROVIDER_TEST_KEY),
    ),
  )
}

// One connection, one message at a time: checks that the SQL itself is right. Runs everywhere.
describe('identity-check store on PGlite (the SQL, one message at a time)', () => {
  let db: PGlite
  let sql: Sql

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(KYC_POSTGRES_SCHEMA)
    const wrap = (target: Pick<PGlite, 'query'>): Sql => ({
      query: async (text, params) => ({ rows: (await target.query(text, params)).rows as never[] }),
      transaction: (work) => db.transaction((tx) => work(wrap(tx))),
    })
    sql = wrap(db)
  })

  afterAll(async () => {
    await db.close()
  })

  const portsOn = (store: KycStore, refusals = new PostgresRefusalLog(sql)) => ({
    store,
    signatures: signatureCheck(PROVIDER_TEST_KEY),
    refusals,
  })

  test('build v1 applies in version order, keeps each message once, and parks an early one', async () => {
    const store = new PostgresKycStore(sql)
    const [pending, approved] = await messagesFor('pg-a', await annaMessages())
    if (!pending || !approved) throw new Error('missing messages')
    const ports = portsOn(store)
    const results = [
      await handleEvent(ports, approved),
      await handleEvent(ports, approved),
      await handleEvent(ports, pending),
      await handleEvent(ports, pending),
    ]
    expect(results).toEqual([
      EVENT_RESULT.PARKED,
      EVENT_RESULT.DUPLICATE,
      EVENT_RESULT.APPLIED,
      EVENT_RESULT.DUPLICATE,
    ])
    await expect(store.applicant('pg-a')).resolves.toMatchObject({ status: KYC_STATUS.APPROVED, version: 2 })
    await expect(store.events('pg-a')).resolves.toHaveLength(2)
  })

  test('a forged message is refused and logged in its own table; a rival version is refused and logged', async () => {
    const store = new PostgresKycStore(sql)
    const refusals = new PostgresRefusalLog(sql)
    const ports = portsOn(store, refusals)
    for (const message of await messagesFor('pg-b', await borisMessages())) await handleEvent(ports, message)
    const forged = await sign(
      { ...(await forgedApprovalForBoris()), applicantId: 'pg-b' },
      'a-key-that-is-not-ours',
    )
    expect(await handleEvent(ports, forged)).toBe(EVENT_RESULT.BAD_SIGNATURE)
    const [, inReview] = await messagesFor('pg-b', await borisMessages())
    if (!inReview) throw new Error('missing message')
    const rival = await sign(
      { ...inReview, eventId: 'rival', status: KYC_STATUS.APPROVED },
      PROVIDER_TEST_KEY,
    )
    expect(await handleEvent(ports, rival)).toBe(EVENT_RESULT.VERSION_CONFLICT)
    await expect(store.applicant('pg-b')).resolves.toMatchObject({ status: KYC_STATUS.IN_REVIEW, version: 2 })
    await expect(refusals.reasons('pg-b')).resolves.toEqual([
      EVENT_RESULT.BAD_SIGNATURE,
      EVENT_RESULT.VERSION_CONFLICT,
    ])
  })

  test('the clean-up on Postgres: Anna caught up, Boris held with his record kept', async () => {
    const store = new PostgresKycStore(sql)
    const ports = portsOn(store)
    // Last night on build v0.1, on this database.
    const night = [
      ...lostAnswerNight(await annaMessages(), [1]),
      ...(await borisMessages()),
      await forgedApprovalForBoris(),
    ]
    for (const event of night) await handleEventV01(ports, event)
    const provider = new MemoryProviderApi(providerRecords())
    const anna = await reconcileWithProvider(store, provider, ANNA)
    const boris = await reconcileWithProvider(store, provider, BORIS)
    expect([anna.result, boris.result]).toEqual([COMPARISON.BEHIND, COMPARISON.NOT_FROM_PROVIDER])
    await expect(store.applicant(ANNA)).resolves.toMatchObject({ status: KYC_STATUS.APPROVED, version: 2 })
    await expect(store.applicant(BORIS)).resolves.toMatchObject({
      status: KYC_STATUS.APPROVED,
      version: 3,
      hold: HOLD_REASON.NOT_FROM_PROVIDER,
    })
  })
})

/**
 * Many connections at once on a real Postgres server (CI starts one and sets DATABASE_URL). The store waits after
 * each "is the next version here?" look, so that a message arriving at the same moment would slip in without the
 * row lock.
 */
describe.skipIf(!process.env.DATABASE_URL)('identity-check store on a real server (messages at once)', () => {
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
      'DROP TABLE IF EXISTS kyc_refused_messages; DROP TABLE IF EXISTS kyc_provider_events; DROP TABLE IF EXISTS kyc_applicants',
    )
    await pool.query(KYC_POSTGRES_SCHEMA)
  })

  afterAll(async () => {
    await pool.end()
  })

  /** The store, slowed down after each look for the next version: the moment a second message could slip in. */
  function slowLooks(store: PostgresKycStore): KycStore {
    return {
      forApplicant: (applicantId, work) =>
        store.forApplicant(applicantId, (tx) =>
          work({
            ...tx,
            storedEvent: async (version) => {
              const event = await tx.storedEvent(version)
              await sleep(40)
              return event
            },
          }),
        ),
    }
  }

  /** #1 first; #2 10 ms later, while #1 is between its look and its save. */
  async function race(store: PostgresKycStore, applicantId: string) {
    const [pending, approved] = await messagesFor(applicantId, await annaMessages())
    if (!pending || !approved) throw new Error('missing messages')
    const ports = {
      store: slowLooks(store),
      signatures: signatureCheck(PROVIDER_TEST_KEY),
      refusals: new PostgresRefusalLog(sql),
    }
    const first = handleEvent(ports, pending)
    await sleep(10)
    await Promise.all([first, handleEvent(ports, approved)])
    return store.applicant(applicantId)
  }

  test('with the row lock, #2 arriving while #1 is saving still ends approved at version 2', async () => {
    await expect(race(new PostgresKycStore(sql), 'real-lock')).resolves.toMatchObject({
      status: KYC_STATUS.APPROVED,
      version: 2,
    })
  })

  // The defence check on a real database: without the row lock, the same race leaves Anna stuck at #1.
  test('without the row lock, the same race leaves Anna stuck at #1', async () => {
    await expect(race(new PostgresKycStore(sql, { lockRow: false }), 'real-no-lock')).resolves.toMatchObject({
      status: KYC_STATUS.PENDING,
      version: 1,
    })
  })

  test('#1, #2 and their copies, 20 deliveries at once: approved at version 2, each message kept once', async () => {
    const store = new PostgresKycStore(sql)
    const [pending, approved] = await messagesFor('real-many', await annaMessages())
    if (!pending || !approved) throw new Error('missing messages')
    const ports = {
      store: slowLooks(store),
      signatures: signatureCheck(PROVIDER_TEST_KEY),
      refusals: new PostgresRefusalLog(sql),
    }
    const deliveries = Array.from({ length: 20 }, (_, index) => (index % 2 === 0 ? approved : pending))
    await Promise.all(deliveries.map((event) => handleEvent(ports, event)))
    await expect(store.applicant('real-many')).resolves.toMatchObject({
      status: KYC_STATUS.APPROVED,
      version: 2,
    })
    await expect(store.events('real-many')).resolves.toHaveLength(2)
  })
})
