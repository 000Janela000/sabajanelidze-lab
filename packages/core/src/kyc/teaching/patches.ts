import { EVENT_RESULT, KYC_STATUS, type KycStatus } from '../codes.ts'
import type { HandleEvent } from '../ports.ts'

/*
 * Teaching code: plausible-looking patches for build v0.1 that the game offers next to the real fix.
 * Both check the signature first, as build v1 does, so the attack compares only how they order messages.
 * Both still lock customers out; the game proves it by delivering the messages in every possible order.
 */

// #region kyc-patch-timestamp
/**
 * "Ignore older messages": refuses a message whose timestamp is older than the last one applied. Fails
 * when two messages carry the same second; and the timestamp is set by the sender, and a timestamp
 * cannot notice a missing message.
 */
export const handleEventTimestamp: HandleEvent = async ({ store, signatures }, event) => {
  const signatureValid = await signatures.verify(event)
  if (!signatureValid) return EVENT_RESULT.BAD_SIGNATURE
  return store.forApplicant(event.applicantId, async (tx) => {
    const applicant = await tx.loadApplicant()
    const older = event.sentAt < applicant.lastSentAt
    if (older) return EVENT_RESULT.OLDER_TIMESTAMP
    await tx.saveApplicant({
      ...applicant,
      status: event.status,
      version: event.version,
      lastSentAt: event.sentAt,
    })
    return EVENT_RESULT.APPLIED
  })
}
// #endregion kyc-patch-timestamp

const { NOT_STARTED, PENDING, IN_REVIEW, APPROVED, REJECTED } = KYC_STATUS

/** The moves a status may make. Approved and rejected cases must be able to go back to review. */
export const ALLOWED_MOVES: Readonly<Record<KycStatus, readonly KycStatus[]>> = {
  [NOT_STARTED]: [PENDING],
  [PENDING]: [IN_REVIEW, APPROVED, REJECTED],
  [IN_REVIEW]: [APPROVED, REJECTED],
  [APPROVED]: [IN_REVIEW], // a document expired: check again
  [REJECTED]: [IN_REVIEW], // the applicant appealed
}

// #region kyc-patch-allowed-moves
/**
 * "Refuse moves that aren't allowed": throws away a real update that arrives early; it is answered,
 * so the provider never sends it again.
 */
export const handleEventAllowedMoves: HandleEvent = async ({ store, signatures }, event) => {
  const signatureValid = await signatures.verify(event)
  if (!signatureValid) return EVENT_RESULT.BAD_SIGNATURE
  return store.forApplicant(event.applicantId, async (tx) => {
    const applicant = await tx.loadApplicant()
    const allowed = ALLOWED_MOVES[applicant.status].includes(event.status)
    if (!allowed) return EVENT_RESULT.MOVE_NOT_ALLOWED
    await tx.saveApplicant({
      ...applicant,
      status: event.status,
      version: event.version,
      lastSentAt: event.sentAt,
    })
    return EVENT_RESULT.APPLIED
  })
}
// #endregion kyc-patch-allowed-moves
