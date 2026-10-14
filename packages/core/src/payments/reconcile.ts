import type { Cents } from '../money.ts'
import type { FakeBank, MemoryPaymentsStore } from './memory.ts'

/** Where one customer's money is, comparing our books with the bank's own record. */
export interface MoneyPicture {
  readonly deposited: Cents
  readonly available: Cents
  readonly held: Cents
  readonly paidOut: Cents
  /** What the exchange gave out beyond what it received. 0 when the books are right. */
  readonly lost: Cents
}

// #region reconcile
export function moneyPicture(
  store: MemoryPaymentsStore,
  bank: FakeBank,
  customerId: string,
  deposited: Cents,
): MoneyPicture {
  const available = store.available(customerId)
  const held = store.held(customerId)
  const paidOut = bank.paidOut(customerId)
  return { deposited, available, held, paidOut, lost: available + held + paidOut - deposited }
}
// #endregion reconcile
