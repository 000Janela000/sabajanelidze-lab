import { describe, expect, test } from 'vitest'
import {
  ANNA,
  annaMessages,
  BORIS,
  COMPARISON,
  canTrade,
  compareWithProvider,
  EVENT_RESULT,
  HOLD_REASON,
  handleEvent,
  KYC_STATUS,
  lastNightOnV01,
  MemoryKycStore,
  MemoryProviderApi,
  MemoryRefusalLog,
  newApplicant,
  PROVIDER_TEST_KEY,
  type ProviderApi,
  providerRecords,
  reconcileWithProvider,
  sign,
  signatureCheck,
} from '../../src/index.ts'

const anna = providerRecords().find((record) => record.applicantId === ANNA)
const boris = providerRecords().find((record) => record.applicantId === BORIS)

describe("our record against the provider's own record", () => {
  test('the same status at the provider’s latest version matches', () => {
    if (!anna) throw new Error('missing record')
    const ours = { ...newApplicant(ANNA), status: KYC_STATUS.APPROVED, version: 2 }
    expect(compareWithProvider(ours, anna).result).toBe(COMPARISON.MATCHES)
  })

  test('a status the provider sent, at an older version, is behind', () => {
    if (!anna) throw new Error('missing record')
    const ours = { ...newApplicant(ANNA), status: KYC_STATUS.PENDING, version: 1 }
    expect(compareWithProvider(ours, anna)).toEqual({
      result: COMPARISON.BEHIND,
      ours: { status: KYC_STATUS.PENDING, version: 1 },
      provider: { status: KYC_STATUS.APPROVED, version: 2 },
    })
  })

  test('a version the provider never sent is not from the provider', () => {
    if (!boris) throw new Error('missing record')
    const ours = { ...newApplicant(BORIS), status: KYC_STATUS.APPROVED, version: 3 }
    expect(compareWithProvider(ours, boris).result).toBe(COMPARISON.NOT_FROM_PROVIDER)
  })

  test('a status the provider never sent at that version is not from the provider either', () => {
    if (!boris) throw new Error('missing record')
    const ours = { ...newApplicant(BORIS), status: KYC_STATUS.APPROVED, version: 2 }
    expect(compareWithProvider(ours, boris).result).toBe(COMPARISON.NOT_FROM_PROVIDER)
  })
})

describe('the clean-up after last night on build v0.1', () => {
  test('Anna is behind: caught up to the provider’s "approved", and she can trade', async () => {
    const { store } = await lastNightOnV01()
    const provider = new MemoryProviderApi(providerRecords())
    const comparison = await reconcileWithProvider(store, provider, ANNA)
    expect(comparison.result).toBe(COMPARISON.BEHIND)
    expect(store.applicant(ANNA)).toMatchObject({ status: KYC_STATUS.APPROVED, version: 2, hold: null })
    expect(canTrade(store.applicant(ANNA))).toBe(true)
  })

  test('Boris’s approval is not from the provider: trading held, his record kept as it is', async () => {
    const { store } = await lastNightOnV01()
    const provider = new MemoryProviderApi(providerRecords())
    const comparison = await reconcileWithProvider(store, provider, BORIS)
    expect(comparison).toEqual({
      result: COMPARISON.NOT_FROM_PROVIDER,
      ours: { status: KYC_STATUS.APPROVED, version: 3 },
      provider: { status: KYC_STATUS.IN_REVIEW, version: 2 },
    })
    // Not rolled back: the record stays as evidence, and only the hold stops him.
    expect(store.applicant(BORIS)).toMatchObject({
      status: KYC_STATUS.APPROVED,
      version: 3,
      hold: HOLD_REASON.NOT_FROM_PROVIDER,
    })
    expect(canTrade(store.applicant(BORIS))).toBe(false)
  })
})

describe('the clean-up while messages still arrive', () => {
  function setUp() {
    const store = new MemoryKycStore([ANNA])
    const ports = { store, signatures: signatureCheck(PROVIDER_TEST_KEY), refusals: new MemoryRefusalLog() }
    return { store, ports }
  }

  test('a message parked before the clean-up is applied once the clean-up has caught up', async () => {
    const { store, ports } = setUp()
    const [pending] = await annaMessages()
    if (!pending) throw new Error('missing message')
    // #3 "rejected" comes before #2 and is parked; the provider's answer still ends at #2.
    const third = await sign(
      {
        eventId: 'evt_anna_3',
        applicantId: ANNA,
        version: 3,
        status: KYC_STATUS.REJECTED,
        sentAt: '2026-10-14T17:05:00Z',
      },
      PROVIDER_TEST_KEY,
    )
    await handleEvent(ports, pending)
    expect(await handleEvent(ports, third)).toBe(EVENT_RESULT.PARKED)
    const comparison = await reconcileWithProvider(store, new MemoryProviderApi(providerRecords()), ANNA)
    expect(comparison.result).toBe(COMPARISON.BEHIND)
    expect(store.applicant(ANNA)).toMatchObject({ status: KYC_STATUS.REJECTED, version: 3 })
    expect(canTrade(store.applicant(ANNA))).toBe(false)
  })

  test('a real message applied after the provider answered is not called forged: the provider is asked again', async () => {
    const { store, ports } = setUp()
    const [pending, approved] = await annaMessages()
    if (!pending || !approved || !anna) throw new Error('missing message')
    await handleEvent(ports, pending)
    // The first answer was made before #2; #2 is applied while that answer is on its way.
    let asks = 0
    const provider: ProviderApi = {
      async record() {
        asks++
        if (asks > 1) return anna
        await handleEvent(ports, approved)
        return { applicantId: ANNA, history: anna.history.slice(0, 1) }
      },
    }
    const comparison = await reconcileWithProvider(store, provider, ANNA)
    expect(asks).toBe(2)
    expect(comparison.result).toBe(COMPARISON.MATCHES)
    expect(store.applicant(ANNA)).toMatchObject({ status: KYC_STATUS.APPROVED, version: 2, hold: null })
  })
})
