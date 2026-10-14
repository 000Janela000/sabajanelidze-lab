import type { Cents } from '../money.ts'
import type { FakeBank, MemoryPaymentsStore } from '../payments/memory.ts'
import type { PaymentPorts } from '../payments/ports.ts'
import type { StepScheduler } from './scheduler.ts'

/** Plain labels for each step, shown next to the code in the game. */
export const STEP_LABELS = {
  loadCustomer: 'load the customer',
  readAvailable: 'read the balance',
  writeAvailable: 'save the new balance',
  reserve: 'reserve, if the money is there',
  payout: 'look up the earlier payout',
  settle: 'settle the payout',
  release: 'release the hold',
  lock: 'lock the account',
  unlock: 'unlock the account',
  pay: 'pay out',
  status: 'ask the bank what happened',
} as const

/** Ports for one request, where every call waits for the scheduler before it touches the store or the bank. */
export function gatedPaymentPorts(
  scheduler: StepScheduler,
  requestId: string,
  store: MemoryPaymentsStore,
  bank: FakeBank,
): PaymentPorts {
  const step = <T>(label: string, run: () => T | Promise<T>, ready?: () => boolean) =>
    scheduler.step(requestId, label, run, ready)

  return {
    store: {
      loadCustomer: (customerId: string) =>
        step(STEP_LABELS.loadCustomer, () => store.loadCustomer(customerId)),
      readAvailable: (customerId: string) =>
        step(STEP_LABELS.readAvailable, () => store.readAvailable(customerId)),
      writeAvailable: (customerId: string, value: Cents) =>
        step(STEP_LABELS.writeAvailable, () => store.writeAvailable(customerId, value)),
      reserve: (customerId: string, amount: Cents, payoutId: string) =>
        step(STEP_LABELS.reserve, () => store.reserve(customerId, amount, payoutId)),
      payout: (payoutId: string) => step(STEP_LABELS.payout, () => store.payout(payoutId)),
      settle: (payoutId: string) => step(STEP_LABELS.settle, () => store.settle(payoutId)),
      release: (payoutId: string) => step(STEP_LABELS.release, () => store.release(payoutId)),
      lock: (customerId: string) =>
        step(
          STEP_LABELS.lock,
          () => {
            store.tryLock(customerId, requestId)
          },
          () => store.lockFreeFor(customerId, requestId),
        ),
      unlock: (customerId: string) => step(STEP_LABELS.unlock, () => store.unlockFor(customerId, requestId)),
    },
    bank: {
      pay: (payoutId: string, customerId: string, amount: Cents) =>
        step(STEP_LABELS.pay, () => bank.pay(payoutId, customerId, amount)),
      status: (payoutId: string) => step(STEP_LABELS.status, () => bank.status(payoutId)),
    },
  }
}
