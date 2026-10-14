import type { Cents } from '../money.ts'
import { BankTimeout, type PaymentPorts } from './ports.ts'

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

// #region build-v0.1
/**
 * Build v0.1, the naive withdrawal. It checks the balance, so it looks safe.
 * But two copies running at once can both read the old balance before either saves.
 */
export const withdrawV01: Withdraw = async ({ store, bank }, request) => {
  await store.loadCustomer(request.customerId)
  const available = await store.readAvailable(request.customerId)
  if (available < request.amount) return { status: 'refused', reason: 'not enough money' }
  await store.writeAvailable(request.customerId, available - request.amount)
  await bank.pay(request.payoutId, request.customerId, request.amount)
  return { status: 'paid' }
}
// #endregion build-v0.1

// #region build-v1
/**
 * Build v1: reserve, then settle. The check and the move are one atomic step,
 * so a second request can never reserve money the first one already holds.
 */
export const withdraw: Withdraw = async ({ store, bank }, request) => {
  await store.loadCustomer(request.customerId)
  const reserved = await store.reserve(request.customerId, request.amount, request.payoutId)
  if (!reserved) return { status: 'refused', reason: 'not enough money' }

  let answer: Awaited<ReturnType<typeof bank.pay>>
  try {
    answer = await bank.pay(request.payoutId, request.customerId, request.amount)
  } catch (error) {
    // Never retry blindly: the bank may already have paid. Keep the hold and resolve it later.
    if (error instanceof BankTimeout) return { status: 'unknown' }
    throw error
  }

  if (answer.status === 'paid') {
    await store.settle(request.payoutId)
    return { status: 'paid' }
  }
  await store.release(request.payoutId)
  return { status: 'refused', reason: 'the bank refused the payout' }
}
// #endregion build-v1

// #region resolve-unknown
/** Clean-up for an unknown outcome: ask the bank what happened, never pay again to find out. */
export async function resolveUnknownPayout(
  { store, bank }: PaymentPorts,
  payoutId: string,
): Promise<'paid' | 'released'> {
  const status = await bank.status(payoutId)
  if (status === 'paid') {
    await store.settle(payoutId)
    return 'paid'
  }
  await store.release(payoutId)
  return 'released'
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
