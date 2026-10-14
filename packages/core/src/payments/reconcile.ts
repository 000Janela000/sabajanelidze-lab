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

// #region money-picture
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
// #endregion money-picture

export interface ReconcileLine {
  readonly payoutId: string
  readonly amount: Cents
  /** What the bank's own record says. */
  readonly bank: 'paid' | 'refused' | 'not found' | 'paid more than once'
  readonly action: 'settled' | 'released' | 'left on hold' | 'flagged'
  readonly note?: string
}

// #region reconcile
/**
 * The end-of-day job, in two passes.
 * 1. Every payout still on hold is checked with the bank: paid → settle, refused → release,
 *    not found → leave on hold, unless the bank's statement for the day is final.
 * 2. Every payout on the bank's statement must match one of our payout records.
 *    Anything else is flagged for a person: money left that our books can't explain.
 */
export async function reconcile(
  store: MemoryPaymentsStore,
  bank: FakeBank,
  options: { readonly statementIsFinal: boolean } = { statementIsFinal: false },
): Promise<ReconcileLine[]> {
  const lines: ReconcileLine[] = []

  for (const hold of store.openHolds()) {
    const found = await bank.status(hold.payoutId)
    if (found === 'paid') {
      await store.settle(hold.payoutId)
      lines.push({ payoutId: hold.payoutId, amount: hold.amount, bank: 'paid', action: 'settled' })
    } else if (found === 'refused' || options.statementIsFinal) {
      await store.release(hold.payoutId)
      lines.push({
        payoutId: hold.payoutId,
        amount: hold.amount,
        bank: found === 'refused' ? 'refused' : 'not found',
        action: 'released',
      })
    } else {
      lines.push({ payoutId: hold.payoutId, amount: hold.amount, bank: 'not found', action: 'left on hold' })
    }
  }

  const records = new Map(store.payouts().map((record) => [record.payoutId, record]))
  const seen = new Map<string, number>()
  for (const payout of bank.payouts) {
    const times = (seen.get(payout.payoutId) ?? 0) + 1
    seen.set(payout.payoutId, times)
    const record = records.get(payout.payoutId)
    const note = !record
      ? 'paid by the bank, but not in our books'
      : times > 1
        ? 'the bank paid this payout more than once'
        : record.amount !== payout.amount || record.customerId !== payout.customerId
          ? 'the bank paid a different amount or customer than our record'
          : record.status !== 'paid'
            ? `the bank paid, but our record says "${record.status}"`
            : null
    if (note) {
      lines.push({
        payoutId: payout.payoutId,
        amount: payout.amount,
        bank: times > 1 ? 'paid more than once' : 'paid',
        action: 'flagged',
        note,
      })
    }
  }
  return lines
}
// #endregion reconcile
