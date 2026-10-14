import type { Cents } from '../money/cents.ts'
import type { FakeBank } from './adapters/fake-bank.ts'
import type { MemoryPaymentsStore } from './adapters/memory-store.ts'
import {
  BANK_STATUS,
  type BankStatus,
  PAYOUT_STATUS,
  RECONCILE_ACTION,
  RECONCILE_FLAG,
  RESOLUTION,
  type ReconcileAction,
  type ReconcileFlag,
  type Resolution,
} from './codes.ts'
import type { PaymentPorts } from './ports.ts'

// #region resolve-unknown
/**
 * Clean-up for an unknown outcome: ask the bank what happened, never pay again to find out.
 * NOT_FOUND is not final (the bank may still be processing it), so the money stays on hold.
 */
export async function resolveUnknownPayout(
  { store, bank }: PaymentPorts,
  payoutId: string,
): Promise<Resolution> {
  const status = await bank.status(payoutId)
  if (status === BANK_STATUS.PAID) {
    await store.settle(payoutId)
    return RESOLUTION.PAID
  }
  if (status === BANK_STATUS.REFUSED) {
    await store.release(payoutId)
    return RESOLUTION.RELEASED
  }
  return RESOLUTION.STILL_UNKNOWN
}
// #endregion resolve-unknown

export interface ReconcileLine {
  readonly payoutId: string
  readonly amount: Cents
  /** What the bank's own record says. */
  readonly bank: BankStatus
  readonly action: ReconcileAction
  /** Set when a person must look at it. */
  readonly flag?: ReconcileFlag
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
    const line = { payoutId: hold.payoutId, amount: hold.amount, bank: found }
    if (found === BANK_STATUS.PAID) {
      await store.settle(hold.payoutId)
      lines.push({ ...line, action: RECONCILE_ACTION.SETTLED })
    } else if (found === BANK_STATUS.REFUSED || options.statementIsFinal) {
      await store.release(hold.payoutId)
      lines.push({ ...line, action: RECONCILE_ACTION.RELEASED })
    } else {
      lines.push({ ...line, action: RECONCILE_ACTION.LEFT_ON_HOLD })
    }
  }

  const records = new Map(store.payouts().map((record) => [record.payoutId, record]))
  const seen = new Map<string, number>()
  for (const payout of bank.payouts) {
    const times = (seen.get(payout.payoutId) ?? 0) + 1
    seen.set(payout.payoutId, times)
    const record = records.get(payout.payoutId)
    const flag = !record
      ? RECONCILE_FLAG.NOT_IN_OUR_BOOKS
      : times > 1
        ? RECONCILE_FLAG.PAID_MORE_THAN_ONCE
        : record.amount !== payout.amount || record.customerId !== payout.customerId
          ? RECONCILE_FLAG.AMOUNT_OR_CUSTOMER_DIFFERS
          : record.status !== PAYOUT_STATUS.PAID
            ? RECONCILE_FLAG.STATUS_DIFFERS
            : null
    if (flag) {
      lines.push({
        payoutId: payout.payoutId,
        amount: payout.amount,
        bank: BANK_STATUS.PAID,
        action: RECONCILE_ACTION.FLAGGED,
        flag,
      })
    }
  }
  return lines
}
// #endregion reconcile
