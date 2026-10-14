import type { Cents } from '../money.ts'

/**
 * The only ways the withdrawal code touches the world. Each method is one `await`,
 * and each `await` is one line the visitor can step through in the game.
 */
export interface PaymentsStore {
  loadCustomer(customerId: string): Promise<void>
  readAvailable(customerId: string): Promise<Cents>
  /** Overwrites the balance. Only the naive code uses this. */
  writeAvailable(customerId: string, value: Cents): Promise<void>
  /** One atomic step: moves `amount` from available to on hold, only if enough is available. */
  reserve(customerId: string, amount: Cents, payoutId: string): Promise<boolean>
  /** The hold becomes a finished payout. */
  settle(payoutId: string): Promise<void>
  /** The hold goes back to available. */
  release(payoutId: string): Promise<void>
  lock(customerId: string): Promise<void>
  unlock(customerId: string): Promise<void>
}

export type BankAnswer = { readonly status: 'paid' } | { readonly status: 'refused' }
export type BankStatus = 'paid' | 'refused' | 'not_found'

/** The bank did not answer in time. The payout may or may not have happened. */
export class BankTimeout extends Error {
  constructor(payoutId: string) {
    super(`The bank did not answer for payout ${payoutId}`)
    this.name = 'BankTimeout'
  }
}

export interface Bank {
  /** `payoutId` doubles as the idempotency key the bank sees. */
  pay(payoutId: string, customerId: string, amount: Cents): Promise<BankAnswer>
  status(payoutId: string): Promise<BankStatus>
}

export interface PaymentPorts {
  readonly store: PaymentsStore
  readonly bank: Bank
}
