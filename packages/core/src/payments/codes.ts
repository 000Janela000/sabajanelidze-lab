/*
 * Every status, result and reason in the payments code, as UPPER_CASE codes.
 * Code compares codes only. The words a person reads live in the site's texts files.
 */

type ValueOf<T> = T[keyof T]

/** The answer to a withdrawal request. */
export const WITHDRAW_STATUS = {
  PAID: 'PAID',
  REFUSED: 'REFUSED',
  /** The bank did not answer: the money stays on hold until the payout is resolved. */
  UNKNOWN: 'UNKNOWN',
} as const
export type WithdrawStatus = ValueOf<typeof WITHDRAW_STATUS>

/** Why a withdrawal was refused. */
export const REFUSAL = {
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  BANK_REFUSED: 'BANK_REFUSED',
  /** The same payout ID was already used for a different withdrawal. */
  PAYOUT_ID_REUSED: 'PAYOUT_ID_REUSED',
} as const
export type Refusal = ValueOf<typeof REFUSAL>

/** The result of the atomic reserve step. */
export const RESERVE_RESULT = {
  RESERVED: 'RESERVED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  DUPLICATE: 'DUPLICATE',
} as const
export type ReserveResult = ValueOf<typeof RESERVE_RESULT>

/** Our own lasting record of a payout. */
export const PAYOUT_STATUS = {
  HELD: 'HELD',
  PAID: 'PAID',
  RELEASED: 'RELEASED',
} as const
export type PayoutStatus = ValueOf<typeof PAYOUT_STATUS>

/** The bank's answer to a payout request. */
export const BANK_ANSWER = {
  PAID: 'PAID',
  REFUSED: 'REFUSED',
} as const
export type BankAnswer = ValueOf<typeof BANK_ANSWER>

/** What the bank says when asked about a payout. NOT_FOUND is not final: it may still be processing. */
export const BANK_STATUS = {
  PAID: 'PAID',
  REFUSED: 'REFUSED',
  NOT_FOUND: 'NOT_FOUND',
} as const
export type BankStatus = ValueOf<typeof BANK_STATUS>

/** Ways the fake bank can misbehave on its next payout. */
export const BANK_FAULT = {
  REFUSE: 'REFUSE',
  TIMEOUT_BEFORE_PAYING: 'TIMEOUT_BEFORE_PAYING',
  TIMEOUT_AFTER_PAYING: 'TIMEOUT_AFTER_PAYING',
} as const
export type BankFault = ValueOf<typeof BANK_FAULT>

/** The result of resolving a payout whose outcome was unknown. */
export const RESOLUTION = {
  PAID: 'PAID',
  RELEASED: 'RELEASED',
  STILL_UNKNOWN: 'STILL_UNKNOWN',
} as const
export type Resolution = ValueOf<typeof RESOLUTION>

/** What the end-of-day reconciliation did with one line. */
export const RECONCILE_ACTION = {
  SETTLED: 'SETTLED',
  RELEASED: 'RELEASED',
  LEFT_ON_HOLD: 'LEFT_ON_HOLD',
  FLAGGED: 'FLAGGED',
} as const
export type ReconcileAction = ValueOf<typeof RECONCILE_ACTION>

/** Why the reconciliation flagged a payout for a person to look at. */
export const RECONCILE_FLAG = {
  NOT_IN_OUR_BOOKS: 'NOT_IN_OUR_BOOKS',
  PAID_MORE_THAN_ONCE: 'PAID_MORE_THAN_ONCE',
  AMOUNT_OR_CUSTOMER_DIFFERS: 'AMOUNT_OR_CUSTOMER_DIFFERS',
  STATUS_DIFFERS: 'STATUS_DIFFERS',
} as const
export type ReconcileFlag = ValueOf<typeof RECONCILE_FLAG>

/** The kinds of ledger transaction the payments code writes. */
export const LEDGER_KIND = {
  OPENING_DEPOSIT: 'OPENING_DEPOSIT',
  RESERVE: 'RESERVE',
  SETTLE: 'SETTLE',
  RELEASE: 'RELEASE',
} as const
export type LedgerKind = ValueOf<typeof LEDGER_KIND>
