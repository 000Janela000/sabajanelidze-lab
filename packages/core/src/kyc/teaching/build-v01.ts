import { EVENT_RESULT } from '../codes.ts'
import type { HandleEvent } from '../ports.ts'

// #region kyc-build-v0.1
/**
 * Build v0.1, the naive handler: the last message received wins. It works while messages arrive once
 * and in order. Teaching code only.
 */
export const handleEventV01: HandleEvent = async ({ store }, event) =>
  store.forApplicant(event.applicantId, async (tx) => {
    const applicant = await tx.loadApplicant()
    await tx.saveApplicant({
      ...applicant,
      status: event.status,
      version: event.version,
      lastSentAt: event.sentAt,
    })
    return EVENT_RESULT.APPLIED
  })
// #endregion kyc-build-v0.1
