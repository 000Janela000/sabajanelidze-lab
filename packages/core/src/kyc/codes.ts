/*
 * Every status and result in the identity-check (KYC) code, as UPPER_CASE codes.
 * Code compares codes only. The words a person reads live in the site's texts files.
 */

type ValueOf<T> = T[keyof T]

/** Where an applicant is in the identity check. Only APPROVED customers can trade. */
export const KYC_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  /** Documents received; the provider's checks are running. */
  PENDING: 'PENDING',
  /** A person at the provider is looking at the case. */
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const
export type KycStatus = ValueOf<typeof KYC_STATUS>

/** What our server did with one message from the identity provider. */
export const EVENT_RESULT = {
  APPLIED: 'APPLIED',
  /** This exact message (same event ID) was already stored: nothing changes. */
  DUPLICATE: 'DUPLICATE',
  /** A newer version is already applied: this message is out of date. */
  STALE: 'STALE',
  /** It arrived before an earlier version: stored, and applied once the gap closes. */
  PARKED: 'PARKED',
  /** The signature does not match: someone other than the provider sent it. */
  BAD_SIGNATURE: 'BAD_SIGNATURE',
  /** Teaching patch only: refused because its timestamp is older than the last one applied. */
  OLDER_TIMESTAMP: 'OLDER_TIMESTAMP',
  /** Teaching patch only: refused because the move between statuses is not on the allowed list. */
  MOVE_NOT_ALLOWED: 'MOVE_NOT_ALLOWED',
} as const
export type EventResult = ValueOf<typeof EVENT_RESULT>
