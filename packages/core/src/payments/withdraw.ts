import type { Cents } from '../money.ts'
import { BankTimeout, isValidAmount, type PaymentPorts, type PayoutRecord } from './ports.ts'

export interface WithdrawRequest {
  readonly customerId: string
  readonly amount: Cents
  /** A unique ID per withdrawal; also the idempotency key the bank sees. */
  readonly payoutId: string
}

export type WithdrawResult =
  | { readonly status: 'paid' }
  | { readonly status: 'refused'; readonly reason: string }
  /** The bank timed out: the money stays on hold until the payout is resolved. */
  | { readonly status: 'unknown' }

export type Withdraw = (ports: PaymentPorts, request: WithdrawRequest) => Promise<WithdrawResult>

const INVALID: WithdrawResult = { status: 'refused', reason: 'the amount must be more than zero' }
const NOT_ENOUGH: WithdrawResult = { status: 'refused', reason: 'not enough money' }

// #region build-v0.1
/**
 * Build v0.1, the naive withdrawal. It checks the balance, so it looks safe.
 * But two copies running at once can both read the old balance before either saves.
 */
export const withdrawV01: Withdraw = async ({ store, bank }, { customerId, amount, payoutId }) => {
  if (!isValidAmount(amount)) return INVALID
  await store.loadCustomer(customerId)
  const available = await store.readAvailable(customerId)
  if (available < amount) return NOT_ENOUGH
  await store.writeAvailable(customerId, available - amount)
  await bank.pay(payoutId, customerId, amount)
  return { status: 'paid' }
}
// #endregion build-v0.1

// #region build-v1
/**
 * Build v1: reserve, then settle. The check and the move are one atomic step,
 * so a second request can never reserve money the first one already holds.
 * A repeated payout ID gets the first request's answer, and nothing moves twice.
 */
export const withdraw: Withdraw = async ({ store, bank }, { customerId, amount, payoutId }) => {
  if (!isValidAmount(amount)) return INVALID
  await store.loadCustomer(customerId)
  const reserved = await store.reserve(customerId, amount, payoutId)
  if (reserved === 'duplicate') return answerFor(await store.payout(payoutId), customerId, amount)
  if (reserved === 'not enough money') return NOT_ENOUGH

  let answer: Awaited<ReturnType<typeof bank.pay>>
  try {
    answer = await bank.pay(payoutId, customerId, amount)
  } catch (error) {
    // Never retry blindly: the bank may already have paid. Keep the hold and resolve it later.
    if (error instanceof BankTimeout) return { status: 'unknown' }
    throw error
  }

  if (answer.status === 'paid') {
    await store.settle(payoutId)
    return { status: 'paid' }
  }
  await store.release(payoutId)
  return { status: 'refused', reason: 'the bank refused the payout' }
}

/** The stored answer for a repeated payout ID. The same ID with a different request is refused. */
function answerFor(record: PayoutRecord | null, customerId: string, amount: Cents): WithdrawResult {
  if (!record || record.customerId !== customerId || record.amount !== amount) {
    return { status: 'refused', reason: 'this payout ID was already used for a different withdrawal' }
  }
  if (record.status === 'paid') return { status: 'paid' }
  if (record.status === 'released') return { status: 'refused', reason: 'the bank refused the payout' }
  return { status: 'unknown' }
}
// #endregion build-v1

// #region resolve-unknown
/**
 * Clean-up for an unknown outcome: ask the bank what happened, never pay again to find out.
 * "Not found" is not final (the bank may still be processing it), so the money stays on hold.
 */
export async function resolveUnknownPayout(
  { store, bank }: PaymentPorts,
  payoutId: string,
): Promise<'paid' | 'released' | 'still unknown'> {
  const status = await bank.status(payoutId)
  if (status === 'paid') {
    await store.settle(payoutId)
    return 'paid'
  }
  if (status === 'refused') {
    await store.release(payoutId)
    return 'released'
  }
  return 'still unknown'
}
// #endregion resolve-unknown

/** Named defences. The game's "build v0.1" and the CI defence check both switch these off. */
export interface PaymentDefences {
  readonly atomicReserve: boolean
}

export const ALL_DEFENCES: PaymentDefences = { atomicReserve: true }

export function withdrawWith(defences: PaymentDefences): Withdraw {
  return defences.atomicReserve ? withdraw : withdrawV01
}
