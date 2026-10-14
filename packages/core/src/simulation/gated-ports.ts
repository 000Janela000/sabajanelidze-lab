import type { Cents } from '../money/cents.ts'
import type { FakeBank } from '../payments/adapters/fake-bank.ts'
import type { MemoryPaymentsStore } from '../payments/adapters/memory-store.ts'
import type { PaymentPorts } from '../payments/ports.ts'
import type { StepScheduler } from './scheduler.ts'
import { STEP, type Step } from './steps.ts'

/** Ports for one request, where every call waits for the scheduler before it touches the store or the bank. */
export function gatedPaymentPorts(
  scheduler: StepScheduler,
  requestId: string,
  store: MemoryPaymentsStore,
  bank: FakeBank,
): PaymentPorts {
  const step = <T>(code: Step, run: () => T | Promise<T>, ready?: () => boolean) =>
    scheduler.step(requestId, code, run, ready)

  return {
    store: {
      loadCustomer: (customerId: string) => step(STEP.LOAD_CUSTOMER, () => store.loadCustomer(customerId)),
      readAvailable: (customerId: string) => step(STEP.READ_BALANCE, () => store.readAvailable(customerId)),
      writeAvailable: (customerId: string, value: Cents) =>
        step(STEP.SAVE_BALANCE, () => store.writeAvailable(customerId, value)),
      reserve: (customerId: string, amount: Cents, payoutId: string) =>
        step(STEP.RESERVE, () => store.reserve(customerId, amount, payoutId)),
      payout: (payoutId: string) => step(STEP.LOOK_UP_PAYOUT, () => store.payout(payoutId)),
      settle: (payoutId: string) => step(STEP.SETTLE, () => store.settle(payoutId)),
      release: (payoutId: string) => step(STEP.RELEASE, () => store.release(payoutId)),
      lock: (customerId: string) =>
        step(
          STEP.LOCK,
          () => {
            store.tryLock(customerId, requestId)
          },
          () => store.lockFreeFor(customerId, requestId),
        ),
      unlock: (customerId: string) => step(STEP.UNLOCK, () => store.unlockFor(customerId, requestId)),
    },
    bank: {
      pay: (payoutId: string, customerId: string, amount: Cents) =>
        step(STEP.PAY_OUT, () => bank.pay(payoutId, customerId, amount)),
      status: (payoutId: string) => step(STEP.ASK_BANK, () => bank.status(payoutId)),
    },
  }
}
