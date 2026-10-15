import type { Cents } from '../../money/cents.ts'
import {
  BANK_ANSWER,
  BANK_FAULT,
  BANK_STATUS,
  type BankAnswer,
  type BankFault,
  type BankStatus,
} from '../codes.ts'
import { type Bank, type BankStatement, BankTimeout, type StatementLine } from '../ports.ts'

export type BankPayout = StatementLine

/** A fake bank. It keeps its own record of payouts: the "statement" that reconciliation checks against. */
export class FakeBank implements Bank, BankStatement {
  readonly payouts: BankPayout[] = []
  readonly #refused = new Set<string>()
  readonly #faults: BankFault[] = []
  readonly #idempotent: boolean

  /** `idempotent`: a payout ID the bank has already paid is never paid again. */
  constructor(options: { readonly idempotent: boolean } = { idempotent: true }) {
    this.#idempotent = options.idempotent
  }

  /** The next call to `pay` behaves badly in this way. */
  failNext(fault: BankFault): void {
    this.#faults.push(fault)
  }

  async pay(payoutId: string, customerId: string, amount: Cents): Promise<BankAnswer> {
    const paidBefore = this.payouts.some((payout) => payout.payoutId === payoutId)
    if (this.#idempotent && paidBefore) return BANK_ANSWER.PAID
    const fault = this.#faults.shift()
    if (fault === BANK_FAULT.REFUSE) {
      this.#refused.add(payoutId)
      return BANK_ANSWER.REFUSED
    }
    if (fault === BANK_FAULT.TIMEOUT_BEFORE_PAYING) throw new BankTimeout(payoutId)
    this.payouts.push({ payoutId, customerId, amount })
    if (fault === BANK_FAULT.TIMEOUT_AFTER_PAYING) throw new BankTimeout(payoutId)
    return BANK_ANSWER.PAID
  }

  async status(payoutId: string): Promise<BankStatus> {
    const paid = this.payouts.some((payout) => payout.payoutId === payoutId)
    if (paid) return BANK_STATUS.PAID
    const wasRefused = this.#refused.has(payoutId)
    if (wasRefused) return BANK_STATUS.REFUSED
    return BANK_STATUS.NOT_FOUND
  }

  /** The day's statement: every payout the bank made. */
  async statement(): Promise<readonly StatementLine[]> {
    return [...this.payouts]
  }

  paidOut(customerId: string): Cents {
    return this.payouts
      .filter((payout) => payout.customerId === customerId)
      .reduce((sum, payout) => sum + payout.amount, 0)
  }
}
