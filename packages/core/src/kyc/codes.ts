/*
 * Every status and result in the identity-check (KYC) code, as UPPER_CASE codes.
 * Code compares codes only. The words a person reads live in the site's texts files.
 */

type ValueOf<T> = T[keyof T]

/** Where an applicant is in the identity check. Only APPROVED customers with no hold can trade. */
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
  /** A different message already holds this version for this applicant: refused and logged, never applied. */
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  /** Teaching patch only: refused because its timestamp is older than the last one applied. */
  OLDER_TIMESTAMP: 'OLDER_TIMESTAMP',
  /** Teaching patch only: refused because the move between statuses is not on the allowed list. */
  MOVE_NOT_ALLOWED: 'MOVE_NOT_ALLOWED',
} as const
export type EventResult = ValueOf<typeof EVENT_RESULT>

/** What the store found when asked to keep a message. */
export const RECORD_RESULT = {
  /** Kept: the first time this message arrived. */
  NEW: 'NEW',
  /** This exact message (same event ID) is already kept. */
  SAME_ID: 'SAME_ID',
  /** A different message already holds this applicant's version. */
  SAME_VERSION: 'SAME_VERSION',
} as const
export type RecordResult = ValueOf<typeof RECORD_RESULT>

/** Our record of an applicant, compared with the provider's own record of them. */
export const COMPARISON = {
  /** Our status and version are the provider's latest. */
  MATCHES: 'MATCHES',
  /** Our status and version came from the provider, but it has sent newer ones since. */
  BEHIND: 'BEHIND',
  /** The provider never sent our status at our version: it came from somewhere else. */
  NOT_FROM_PROVIDER: 'NOT_FROM_PROVIDER',
} as const
export type Comparison = ValueOf<typeof COMPARISON>

/** Why trading is held for an applicant, whatever their status says. */
export const HOLD_REASON = {
  NOT_FROM_PROVIDER: 'NOT_FROM_PROVIDER',
} as const
export type HoldReason = ValueOf<typeof HOLD_REASON>
