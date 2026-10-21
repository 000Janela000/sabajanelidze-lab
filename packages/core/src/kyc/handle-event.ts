import { EVENT_RESULT, type EventResult, RECORD_RESULT } from './codes.ts'
import type { ApplicantTx, HandleEvent, ProviderEvent } from './ports.ts'

// #region kyc-build-v1
/**
 * Build v1: check the signature first, store each message once, and apply messages in the provider's
 * version order. A message that arrives before an earlier version is parked, and applied as soon as
 * the gap closes. One applicant's messages never interleave (a row lock in Postgres). A refused
 * message is logged as evidence, apart from the stored ones (so it can never use up a real message's ID)
 * and outside the applicant's lock.
 */
export const handleEvent: HandleEvent = async ({ store, signatures, refusals }, event) => {
  const signatureValid = await signatures.verify(event)
  if (!signatureValid) {
    await refusals.record(event, EVENT_RESULT.BAD_SIGNATURE)
    return EVENT_RESULT.BAD_SIGNATURE
  }
  const result = await store.forApplicant(event.applicantId, (tx) => applyInOrder(tx, event))
  if (result === EVENT_RESULT.VERSION_CONFLICT) await refusals.record(event, result)
  return result
}

/** Inside the applicant's lock: keep the message once, then apply it and every parked one that follows on. */
async function applyInOrder(tx: ApplicantTx, event: ProviderEvent): Promise<EventResult> {
  const recorded = await tx.recordEvent(event)
  if (recorded === RECORD_RESULT.SAME_ID) return EVENT_RESULT.DUPLICATE
  if (recorded === RECORD_RESULT.SAME_VERSION) {
    // The same version under a new ID: a copy if it says the same, a conflict if it says something else.
    const kept = await tx.storedEvent(event.version)
    const sameContent = kept?.status === event.status
    if (!sameContent) return EVENT_RESULT.VERSION_CONFLICT
  }
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
}
// #endregion kyc-build-v1
