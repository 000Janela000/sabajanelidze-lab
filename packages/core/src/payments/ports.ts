import type { Cents } from '../money/cents.ts'
import type { BankAnswer, BankStatus, PayoutStatus, ReserveResult } from './codes.ts'

/** Our own lasting record of a payout, keyed by its ID. It is what makes a repeated request safe. */
export interface PayoutRecord {
  readonly payoutId: string
  readonly customerId: string
  readonly amount: Cents
  readonly status: PayoutStatus
}

/**
 * The only ways the withdrawal code touches the world. Each method is one `await`,
 * and each `await` is one line the visitor can step through in the game.
 */
export interface PaymentsStore {
  loadCustomer(customerId: string): Promise<void>
  readAvailable(customerId: string): Promise<Cents>
  /** Overwrites the balance. Only the naive code uses this. */
  writeAvailable(customerId: string, value: Cents): Promise<void>
  /**
   * One atomic step: if this payout ID is new and enough money is available, moves `amount`
   * from available to on hold and records the payout. Otherwise changes nothing.
   */
  reserve(customerId: string, amount: Cents, payoutId: string): Promise<ReserveResult>
  /** The stored record for a payout ID, if there is one. */
  payout(payoutId: string): Promise<PayoutRecord | null>
  /** The hold becomes a finished payout. */
  settle(payoutId: string): Promise<void>
  /** The hold goes back to available. */
  release(payoutId: string): Promise<void>
  lock(customerId: string): Promise<void>
  unlock(customerId: string): Promise<void>
}

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

/** A withdrawal amount must be a positive whole number of cents. */
export function isValidAmount(amount: Cents): boolean {
  return Number.isSafeInteger(amount) && amount > 0
}
