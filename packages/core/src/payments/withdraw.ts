import type { Cents } from '../money/cents.ts'
import {
  BANK_ANSWER,
  PAYOUT_STATUS,
  REFUSAL,
  RESERVE_RESULT,
  type Refusal,
  WITHDRAW_STATUS,
} from './codes.ts'
import { BankTimeout, isValidAmount, type PaymentPorts, type PayoutRecord } from './ports.ts'

export interface WithdrawRequest {
  readonly customerId: string
  readonly amount: Cents
  /** A unique ID per withdrawal; also the idempotency key the bank sees. */
  readonly payoutId: string
}

export type WithdrawResult =
  | { readonly status: typeof WITHDRAW_STATUS.PAID }
  | { readonly status: typeof WITHDRAW_STATUS.REFUSED; readonly reason: Refusal }
  | { readonly status: typeof WITHDRAW_STATUS.UNKNOWN }

export type Withdraw = (ports: PaymentPorts, request: WithdrawRequest) => Promise<WithdrawResult>

export const PAID: WithdrawResult = { status: WITHDRAW_STATUS.PAID }
export const UNKNOWN: WithdrawResult = { status: WITHDRAW_STATUS.UNKNOWN }
export const refused = (reason: Refusal): WithdrawResult => ({ status: WITHDRAW_STATUS.REFUSED, reason })

// #region build-v1
/**
 * Build v1: reserve, then settle. The check and the move are one atomic step,
 * so a second request can never reserve money the first one already holds.
 * A repeated payout ID gets the first request's answer, and nothing moves twice.
 */
export const withdraw: Withdraw = async ({ store, bank }, { customerId, amount, payoutId }) => {
  if (!isValidAmount(amount)) return refused(REFUSAL.INVALID_AMOUNT)
  await store.loadCustomer(customerId)
  const reserved = await store.reserve(customerId, amount, payoutId)
  if (reserved === RESERVE_RESULT.DUPLICATE) {
    const record = await store.payout(payoutId)
    return answerFor(record, customerId, amount)
  }
  if (reserved === RESERVE_RESULT.INSUFFICIENT_FUNDS) return refused(REFUSAL.INSUFFICIENT_FUNDS)

  let answer: Awaited<ReturnType<typeof bank.pay>>
  try {
    answer = await bank.pay(payoutId, customerId, amount)
  } catch (error) {
    // Never retry blindly: the bank may already have paid. Keep the hold and resolve it later.
    if (error instanceof BankTimeout) return UNKNOWN
    throw error
  }

  if (answer === BANK_ANSWER.PAID) {
    await store.settle(payoutId)
    return PAID
  }
  await store.release(payoutId)
  return refused(REFUSAL.BANK_REFUSED)
}

/** The stored answer for a repeated payout ID. The same ID with a different request is refused. */
function answerFor(record: PayoutRecord | null, customerId: string, amount: Cents): WithdrawResult {
  if (!record || record.customerId !== customerId || record.amount !== amount) {
    return refused(REFUSAL.PAYOUT_ID_REUSED)
  }
  if (record.status === PAYOUT_STATUS.PAID) return PAID
  if (record.status === PAYOUT_STATUS.RELEASED) return refused(REFUSAL.BANK_REFUSED)
  return UNKNOWN
}
// #endregion build-v1
