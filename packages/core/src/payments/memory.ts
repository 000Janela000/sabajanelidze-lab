import { Ledger } from '../ledger.ts'
import { type Cents, cents } from '../money.ts'
import { type Bank, type BankAnswer, type BankStatus, BankTimeout, type PaymentsStore } from './ports.ts'

/** An in-memory stand-in for the balances table. The game and the unit tests use it. */
export class MemoryPaymentsStore implements PaymentsStore {
  readonly ledger = new Ledger()
  readonly #available = new Map<string, Cents>()
  readonly #holds = new Map<string, { readonly customerId: string; readonly amount: Cents }>()
  readonly #lockOwner = new Map<string, string>()
  readonly #lockQueue = new Map<string, Array<() => void>>()

  constructor(openingBalances: Readonly<Record<string, Cents>>) {
    for (const [customerId, amount] of Object.entries(openingBalances)) {
      this.#available.set(customerId, cents(amount))
      this.ledger.post({
        id: `open:${customerId}`,
        memo: 'opening deposit',
        entries: [
          { account: `outside:${customerId}`, amount: -amount },
          { account: `customer:${customerId}:available`, amount },
        ],
      })
    }
  }

  async loadCustomer(customerId: string): Promise<void> {
    if (!this.#available.has(customerId)) throw new Error(`Unknown customer ${customerId}`)
  }

  async readAvailable(customerId: string): Promise<Cents> {
    return this.available(customerId)
  }

  async writeAvailable(customerId: string, value: Cents): Promise<void> {
    this.#available.set(customerId, cents(value))
  }

  async reserve(customerId: string, amount: Cents, payoutId: string): Promise<boolean> {
    const available = this.available(customerId)
    if (available < amount) return false
    this.#available.set(customerId, available - amount)
    this.#holds.set(payoutId, { customerId, amount })
    this.ledger.post({
      id: `reserve:${payoutId}`,
      memo: 'reserve for payout',
      entries: [
        { account: `customer:${customerId}:available`, amount: -amount },
        { account: `customer:${customerId}:held`, amount },
      ],
    })
    return true
  }

  async settle(payoutId: string): Promise<void> {
    const hold = this.#takeHold(payoutId)
    this.ledger.post({
      id: `settle:${payoutId}`,
      memo: 'payout settled',
      entries: [
        { account: `customer:${hold.customerId}:held`, amount: -hold.amount },
        { account: `outside:${hold.customerId}`, amount: hold.amount },
      ],
    })
  }

  async release(payoutId: string): Promise<void> {
    const hold = this.#takeHold(payoutId)
    this.#available.set(hold.customerId, this.available(hold.customerId) + hold.amount)
    this.ledger.post({
      id: `release:${payoutId}`,
      memo: 'hold released',
      entries: [
        { account: `customer:${hold.customerId}:held`, amount: -hold.amount },
        { account: `customer:${hold.customerId}:available`, amount: hold.amount },
      ],
    })
  }

  async lock(customerId: string): Promise<void> {
    while (this.#lockOwner.has(customerId)) {
      await new Promise<void>((wake) => this.#queue(customerId).push(wake))
    }
    this.#lockOwner.set(customerId, 'store')
  }

  async unlock(customerId: string): Promise<void> {
    this.#lockOwner.delete(customerId)
    this.#queue(customerId).shift()?.()
  }

  /** For the step scheduler: take the lock now, or say it is busy. */
  tryLock(customerId: string, owner: string): boolean {
    if (!this.lockFreeFor(customerId, owner)) return false
    this.#lockOwner.set(customerId, owner)
    return true
  }

  lockFreeFor(customerId: string, owner: string): boolean {
    const current = this.#lockOwner.get(customerId)
    return current === undefined || current === owner
  }

  unlockFor(customerId: string, owner: string): void {
    if (this.#lockOwner.get(customerId) === owner) this.#lockOwner.delete(customerId)
  }

  available(customerId: string): Cents {
    const value = this.#available.get(customerId)
    if (value === undefined) throw new Error(`Unknown customer ${customerId}`)
    return value
  }

  /** Payouts still on hold, oldest first. */
  openHolds(): Array<{ readonly payoutId: string; readonly customerId: string; readonly amount: Cents }> {
    return [...this.#holds].map(([payoutId, hold]) => ({ payoutId, ...hold }))
  }

  held(customerId: string): Cents {
    let total = 0
    for (const hold of this.#holds.values()) if (hold.customerId === customerId) total += hold.amount
    return total
  }

  #takeHold(payoutId: string) {
    const hold = this.#holds.get(payoutId)
    if (!hold) throw new Error(`No hold for payout ${payoutId}`)
    this.#holds.delete(payoutId)
    return hold
  }

  #queue(customerId: string): Array<() => void> {
    let queue = this.#lockQueue.get(customerId)
    if (!queue) {
      queue = []
      this.#lockQueue.set(customerId, queue)
    }
    return queue
  }
}

export type BankFault = 'refuse' | 'timeout-before-paying' | 'timeout-after-paying'

/** A fake bank. It keeps its own record of payouts: the "statement" that reconciliation checks against. */
export class FakeBank implements Bank {
  readonly payouts: Array<{
    readonly payoutId: string
    readonly customerId: string
    readonly amount: Cents
  }> = []
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
    if (this.#idempotent && this.payouts.some((payout) => payout.payoutId === payoutId)) {
      return { status: 'paid' }
    }
    const fault = this.#faults.shift()
    if (fault === 'refuse') {
      this.#refused.add(payoutId)
      return { status: 'refused' }
    }
    if (fault === 'timeout-before-paying') throw new BankTimeout(payoutId)
    this.payouts.push({ payoutId, customerId, amount })
    if (fault === 'timeout-after-paying') throw new BankTimeout(payoutId)
    return { status: 'paid' }
  }

  async status(payoutId: string): Promise<BankStatus> {
    if (this.payouts.some((payout) => payout.payoutId === payoutId)) return 'paid'
    if (this.#refused.has(payoutId)) return 'refused'
    return 'not_found'
  }

  paidOut(customerId: string): Cents {
    return this.payouts
      .filter((payout) => payout.customerId === customerId)
      .reduce((sum, p) => sum + p.amount, 0)
  }
}
