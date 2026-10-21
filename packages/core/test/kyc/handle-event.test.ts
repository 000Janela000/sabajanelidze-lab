import { describe, expect, test } from 'vitest'
import {
  ANNA,
  annaMessages,
  BORIS,
  borisMessages,
  EVENT_RESULT,
  forgedApprovalForBoris,
  handleEvent,
  KYC_STATUS,
  type KycStore,
  MemoryKycStore,
  MemoryRefusalLog,
  PROVIDER_TEST_KEY,
  type ProviderEvent,
  sign,
  signatureCheck,
} from '../../src/index.ts'

function setUp<S extends KycStore = MemoryKycStore>(
  store: S = new MemoryKycStore([ANNA, BORIS]) as unknown as S,
) {
  const refusals = new MemoryRefusalLog({ now: () => new Date('2026-10-15T03:12:41Z') })
  const ports = { store, signatures: signatureCheck(PROVIDER_TEST_KEY), refusals }
  const send = (event: ProviderEvent) => handleEvent(ports, event)
  return { store, refusals, send }
}

/**
 * The same store, staged for the race the lock prevents: #1's save waits at a gate, which opens when #2 has loaded
 * the applicant (so #2 saw the state from before #1's save), or after 50 ms if #2 cannot get in at all (the lock).
 */
function staged(store: KycStore) {
  let reachedSave = () => {}
  const atSave = new Promise<void>((resolve) => (reachedSave = resolve))
  let openGate = () => {}
  const gate = new Promise<void>((resolve) => (openGate = resolve))
  let loads = 0
  const wrapped: KycStore = {
    forApplicant: (applicantId, work) =>
      store.forApplicant(applicantId, (tx) =>
        work({
          ...tx,
          loadApplicant: async () => {
            const applicant = await tx.loadApplicant()
            loads += 1
            if (loads === 2) openGate()
            return applicant
          },
          saveApplicant: async (applicant) => {
            reachedSave()
            await gate
            await tx.saveApplicant(applicant)
          },
        }),
      ),
  }
  return { wrapped, atSave, openGate }
}

/** #1 gets as far as its save; then #2 arrives. */
async function race(memory: MemoryKycStore) {
  const { wrapped, atSave, openGate } = staged(memory)
  const { send } = setUp(wrapped)
  const [pending, approved] = await annaMessages()
  if (!pending || !approved) throw new Error('missing messages')
  const first = send(pending)
  await atSave
  setTimeout(openGate, 50)
  const results = [await send(approved), await first]
  return results
}

describe('build v1: one message from the identity provider', () => {
  test('applies messages that arrive once and in order', async () => {
    const { store, send } = setUp()
    const [pending, approved] = await annaMessages()
    if (!pending || !approved) throw new Error('missing messages')
    expect([await send(pending), await send(approved)]).toEqual([EVENT_RESULT.APPLIED, EVENT_RESULT.APPLIED])
    expect(store.applicant(ANNA)).toMatchObject({ status: KYC_STATUS.APPROVED, version: 2 })
  })

  test('a copy of a message changes nothing, even after a newer one', async () => {
    const { store, send } = setUp()
    const [pending, approved] = await annaMessages()
    if (!pending || !approved) throw new Error('missing messages')
    await send(pending)
    await send(approved)
    expect(await send(pending)).toBe(EVENT_RESULT.DUPLICATE)
    expect(store.applicant(ANNA).status).toBe(KYC_STATUS.APPROVED)
  })

  test('an older version under a new ID is out of date and changes nothing', async () => {
    const { store, send } = setUp()
    const [pending, approved] = await annaMessages()
    if (!pending || !approved) throw new Error('missing messages')
    await send(pending)
    await send(approved)
    const resent = await sign({ ...pending, eventId: 'evt_anna_1_again' }, PROVIDER_TEST_KEY)
    expect(await send(resent)).toBe(EVENT_RESULT.STALE)
    expect(store.applicant(ANNA).status).toBe(KYC_STATUS.APPROVED)
  })

  test('a message that arrives early is parked, then applied when the gap closes', async () => {
    const { store, send } = setUp()
    const [pending, approved] = await annaMessages()
    if (!pending || !approved) throw new Error('missing messages')
    expect(await send(approved)).toBe(EVENT_RESULT.PARKED)
    expect(store.applicant(ANNA).status).toBe(KYC_STATUS.NOT_STARTED)
    expect(await send(pending)).toBe(EVENT_RESULT.APPLIED)
    expect(store.applicant(ANNA)).toMatchObject({ status: KYC_STATUS.APPROVED, version: 2 })
  })

  test('a forged message is refused before anything is stored, and logged as evidence with when it came', async () => {
    const { store, refusals, send } = setUp()
    for (const message of await borisMessages()) await send(message)
    const forged = await forgedApprovalForBoris()
    expect(await send(forged)).toBe(EVENT_RESULT.BAD_SIGNATURE)
    expect(store.applicant(BORIS)).toMatchObject({ status: KYC_STATUS.IN_REVIEW, version: 2 })
    expect(store.events(BORIS)).toHaveLength(2)
    expect(refusals.list()).toEqual([
      { event: forged, reason: EVENT_RESULT.BAD_SIGNATURE, receivedAt: '2026-10-15T03:12:41.000Z' },
    ])
  })

  test("a forged message with a real message's ID cannot use that ID up", async () => {
    const { store, send } = setUp()
    const [pending, approved] = await annaMessages()
    if (!pending || !approved) throw new Error('missing messages')
    // The forger sends first, with the ID the provider will use for "approved".
    const fake = await sign({ ...approved, status: KYC_STATUS.REJECTED }, 'a-key-that-is-not-ours')
    expect(await send(fake)).toBe(EVENT_RESULT.BAD_SIGNATURE)
    expect([await send(pending), await send(approved)]).toEqual([EVENT_RESULT.APPLIED, EVENT_RESULT.APPLIED])
    expect(store.applicant(ANNA)).toMatchObject({ status: KYC_STATUS.APPROVED, version: 2 })
  })

  test('a different message claiming a version already kept is refused and logged, never applied', async () => {
    const { store, refusals, send } = setUp()
    const [pending, approved] = await annaMessages()
    if (!pending || !approved) throw new Error('missing messages')
    await send(pending)
    await send(approved)
    const rival = await sign(
      { ...approved, eventId: 'evt_anna_2b', status: KYC_STATUS.REJECTED },
      PROVIDER_TEST_KEY,
    )
    expect(await send(rival)).toBe(EVENT_RESULT.VERSION_CONFLICT)
    expect(store.applicant(ANNA)).toMatchObject({ status: KYC_STATUS.APPROVED, version: 2 })
    expect(refusals.list().map((refusal) => refusal.reason)).toEqual([EVENT_RESULT.VERSION_CONFLICT])
  })

  test('a signature written in capitals is the same signature', async () => {
    const { store, send } = setUp()
    const [pending] = await annaMessages()
    if (!pending) throw new Error('missing message')
    expect(await send({ ...pending, signature: pending.signature.toUpperCase() })).toBe(EVENT_RESULT.APPLIED)
    expect(store.applicant(ANNA).status).toBe(KYC_STATUS.PENDING)
  })

  test('a signature cannot be moved to another applicant by moving a "|" from one field to the next', async () => {
    const { store, send } = setUp()
    const [, approved] = await annaMessages()
    if (!approved) throw new Error('missing message')
    // Signed by the provider for an applicant whose ID holds a "|"; replayed with that part moved into the event ID.
    const signed = await sign({ ...approved, eventId: 'evt', applicantId: `x|${BORIS}` }, PROVIDER_TEST_KEY)
    const moved = { ...signed, eventId: 'evt|x', applicantId: BORIS }
    expect(await send(moved)).toBe(EVENT_RESULT.BAD_SIGNATURE)
    expect(store.applicant(BORIS).status).toBe(KYC_STATUS.NOT_STARTED)
  })

  test('a real message with one field changed is refused', async () => {
    const { store, send } = setUp()
    const [pending] = await borisMessages()
    if (!pending) throw new Error('missing message')
    expect(await send({ ...pending, status: KYC_STATUS.APPROVED })).toBe(EVENT_RESULT.BAD_SIGNATURE)
    expect(store.applicant(BORIS).status).toBe(KYC_STATUS.NOT_STARTED)
  })

  // The lock's own proof (a real row lock in Postgres): #1 has checked that nothing follows it and is saving when #2
  // arrives. With the lock, #2 waits, then follows #1. Without it, #2 reads the state from before #1's save, is
  // parked, and nothing ever applies it: Anna stuck at #1.
  test('with the lock, #2 arriving while #1 is saving still ends approved at version 2', async () => {
    const memory = new MemoryKycStore([ANNA])
    expect(await race(memory)).toEqual([EVENT_RESULT.APPLIED, EVENT_RESULT.APPLIED])
    expect(memory.applicant(ANNA)).toMatchObject({ status: KYC_STATUS.APPROVED, version: 2 })
  })

  // The defence check for the lock: switched off, the same test must fail.
  test('without the lock, the same two messages leave Anna stuck at #1', async () => {
    const memory = new MemoryKycStore([ANNA], { serialise: false })
    expect(await race(memory)).toEqual([EVENT_RESULT.PARKED, EVENT_RESULT.APPLIED])
    expect(memory.applicant(ANNA)).toMatchObject({ status: KYC_STATUS.PENDING, version: 1 })
  })

  test('messages for one applicant arriving at the same moment are handled one at a time', async () => {
    const { store, send } = setUp()
    const [pending, approved] = await annaMessages()
    if (!pending || !approved) throw new Error('missing messages')
    const results = await Promise.all([send(approved), send(pending), send(approved), send(pending)])
    expect(results.filter((result) => result === EVENT_RESULT.DUPLICATE)).toHaveLength(2)
    expect(store.applicant(ANNA)).toMatchObject({ status: KYC_STATUS.APPROVED, version: 2 })
  })
})
