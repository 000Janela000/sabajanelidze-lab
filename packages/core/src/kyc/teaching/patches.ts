import { EVENT_RESULT, KYC_STATUS, type KycStatus } from '../codes.ts'
import type { HandleEvent } from '../ports.ts'

/*
 * Teaching code: plausible-looking patches for build v0.1 that the game offers next to the real fix.
 * Both still lock customers out; the game proves it by delivering the messages in every possible order.
 */

// #region kyc-patch-timestamp
/** "Ignore older messages": fails when two messages carry the same second, and lets forged ones in. */
export const handleEventTimestamp: HandleEvent = async ({ store }, event) =>
  store.forApplicant(event.applicantId, async (tx) => {
    const applicant = await tx.loadApplicant()
    if (event.sentAt < applicant.lastSentAt) return EVENT_RESULT.OLDER_TIMESTAMP
    await tx.saveApplicant({
      ...applicant,
      status: event.status,
      version: event.version,
      lastSentAt: event.sentAt,
    })
    return EVENT_RESULT.APPLIED
  })
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
/** "Refuse moves that aren't allowed": throws away a real update that arrives early, and lets forged ones in. */
export const handleEventAllowedMoves: HandleEvent = async ({ store }, event) =>
  store.forApplicant(event.applicantId, async (tx) => {
    const applicant = await tx.loadApplicant()
    if (!ALLOWED_MOVES[applicant.status].includes(event.status)) return EVENT_RESULT.MOVE_NOT_ALLOWED
    await tx.saveApplicant({
      ...applicant,
      status: event.status,
      version: event.version,
      lastSentAt: event.sentAt,
    })
    return EVENT_RESULT.APPLIED
  })
// #endregion kyc-patch-allowed-moves
