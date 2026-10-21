import { describe, expect, test } from 'vitest'
import {
  ANNA,
  BORIS,
  COMPARISON,
  canTrade,
  compareWithProvider,
  HOLD_REASON,
  KYC_STATUS,
  lastNightOnV01,
  MemoryProviderApi,
  newApplicant,
  providerRecords,
  reconcileWithProvider,
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
