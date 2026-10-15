import { EVENT_RESULT } from './codes.ts'
import type { HandleEvent, ProviderEvent } from './ports.ts'

// #region kyc-build-v1
/**
 * Build v1: check the signature first, store each message once, and apply messages in the provider's
 * version order. A message that arrives before an earlier version is parked, and applied as soon as
 * the gap closes. One applicant's messages never interleave (a row lock in Postgres).
 */
export const handleEvent: HandleEvent = async ({ store, signatures }, event) => {
  const signatureValid = await signatures.verify(event)
  if (!signatureValid) return EVENT_RESULT.BAD_SIGNATURE
  return store.forApplicant(event.applicantId, async (tx) => {
    const firstTime = await tx.recordEvent(event)
    if (!firstTime) return EVENT_RESULT.DUPLICATE
    let applicant = await tx.loadApplicant()
    if (event.version <= applicant.version) return EVENT_RESULT.STALE
    if (event.version > applicant.version + 1) return EVENT_RESULT.PARKED

    // Apply this message, then every parked one that now follows on.
    let next: ProviderEvent | null = event
    while (next) {
      applicant = { ...applicant, status: next.status, version: next.version, lastSentAt: next.sentAt }
      next = await tx.storedEvent(applicant.version + 1)
    }
    await tx.saveApplicant(applicant)
    return EVENT_RESULT.APPLIED
  })
}
// #endregion kyc-build-v1
