import { COMPARISON, type Comparison, HOLD_REASON, KYC_STATUS, type KycStatus } from './codes.ts'
import type { Applicant, KycStore, ProviderApi, ProviderRecord } from './ports.ts'

/** A status at a version, as one side sees it. */
export interface Position {
  readonly status: KycStatus
  readonly version: number
}

export interface ProviderComparison {
  readonly result: Comparison
  readonly ours: Position
  /** The provider's latest status and version. */
  readonly provider: Position
}

// #region kyc-compare
/**
 * Our record of an applicant against the provider's own record of them. Every status we hold must be one the
 * provider sent at that version; if it is, we are either up to date or behind; if it is not, it came from
 * somewhere else (a message the provider never sent).
 */
export function compareWithProvider(applicant: Applicant, record: ProviderRecord): ProviderComparison {
  const ours = { status: applicant.status, version: applicant.version }
  const latest = record.history.reduce<Position>(
    (best, entry) => (entry.version > best.version ? { status: entry.status, version: entry.version } : best),
    { status: KYC_STATUS.NOT_STARTED, version: 0 },
  )
  const untouched = applicant.version === 0 && applicant.status === KYC_STATUS.NOT_STARTED
  const sent = record.history.some((entry) => entry.version === ours.version && entry.status === ours.status)
  const fromProvider = untouched || sent
  if (!fromProvider) return { result: COMPARISON.NOT_FROM_PROVIDER, ours, provider: latest }
  const behind = ours.version < latest.version
  if (behind) return { result: COMPARISON.BEHIND, ours, provider: latest }
  return { result: COMPARISON.MATCHES, ours, provider: latest }
}
// #endregion kyc-compare

// #region kyc-reconcile
/**
 * The clean-up: ask the provider (over our authenticated connection), compare, and act. Behind → catch up to
 * the provider's latest. Not from the provider → hold trading and keep the record as it is, as evidence (the
 * version is not rolled back, so a genuine message with that version is still recognised as new when it comes).
 */
export async function reconcileWithProvider(
  store: KycStore,
  provider: ProviderApi,
  applicantId: string,
): Promise<ProviderComparison> {
  const record = await provider.record(applicantId)
  return store.forApplicant(applicantId, async (tx) => {
    const applicant = await tx.loadApplicant()
    const comparison = compareWithProvider(applicant, record)
    if (comparison.result === COMPARISON.BEHIND) {
      const latest = record.history.find((entry) => entry.version === comparison.provider.version)
      await tx.saveApplicant({
        ...applicant,
        status: comparison.provider.status,
        version: comparison.provider.version,
        lastSentAt: latest?.sentAt ?? applicant.lastSentAt,
      })
    }
    if (comparison.result === COMPARISON.NOT_FROM_PROVIDER) {
      await tx.saveApplicant({ ...applicant, hold: HOLD_REASON.NOT_FROM_PROVIDER })
    }
    return comparison
  })
}
// #endregion kyc-reconcile

/** Only an approved applicant with no hold can trade. */
export function canTrade(applicant: Applicant): boolean {
  return applicant.status === KYC_STATUS.APPROVED && applicant.hold === null
}
