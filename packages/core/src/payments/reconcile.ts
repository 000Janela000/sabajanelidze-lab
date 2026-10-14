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

export interface ReconcileLine {
  readonly payoutId: string
  readonly amount: Cents
  readonly found: 'paid' | 'refused' | 'not_found'
  readonly action: 'settled' | 'released' | 'left on hold'
}

// #region reconcile-holds
/**
 * The end-of-day job: every payout still on hold is compared with the bank's own statement.
 * Paid → settle. Refused → release. Not on the statement yet → leave it on hold for tomorrow.
 */
export async function reconcileHolds(store: MemoryPaymentsStore, bank: FakeBank): Promise<ReconcileLine[]> {
  const lines: ReconcileLine[] = []
  for (const hold of store.openHolds()) {
    const found = await bank.status(hold.payoutId)
    if (found === 'paid') await store.settle(hold.payoutId)
    if (found === 'refused') await store.release(hold.payoutId)
    const action = found === 'paid' ? 'settled' : found === 'refused' ? 'released' : 'left on hold'
    lines.push({ payoutId: hold.payoutId, amount: hold.amount, found, action })
  }
  return lines
}
// #endregion reconcile-holds
