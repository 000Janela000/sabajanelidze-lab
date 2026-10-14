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
  MemoryKycStore,
  PROVIDER_TEST_KEY,
  type ProviderEvent,
  sign,
  signatureCheck,
} from '../../src/index.ts'

function setUp() {
  const store = new MemoryKycStore([ANNA, BORIS])
  const ports = { store, signatures: signatureCheck(PROVIDER_TEST_KEY) }
  const send = (event: ProviderEvent) => handleEvent(ports, event)
  return { store, send }
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

  test('a forged message is refused before anything is stored', async () => {
    const { store, send } = setUp()
    for (const message of await borisMessages()) await send(message)
    expect(await send(await forgedApprovalForBoris())).toBe(EVENT_RESULT.BAD_SIGNATURE)
    expect(store.applicant(BORIS)).toMatchObject({ status: KYC_STATUS.IN_REVIEW, version: 2 })
  })

  test('a real message with one field changed is refused', async () => {
    const { store, send } = setUp()
    const [pending] = await borisMessages()
    if (!pending) throw new Error('missing message')
    expect(await send({ ...pending, status: KYC_STATUS.APPROVED })).toBe(EVENT_RESULT.BAD_SIGNATURE)
    expect(store.applicant(BORIS).status).toBe(KYC_STATUS.NOT_STARTED)
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
