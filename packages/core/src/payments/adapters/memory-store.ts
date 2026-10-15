import { type Cents, cents } from '../../money/cents.ts'
import { Ledger } from '../../money/ledger.ts'
import { LEDGER_KIND, PAYOUT_STATUS, RESERVE_RESULT, type ReserveResult } from '../codes.ts'
import { isValidAmount, type PaymentsStore, type PayoutRecord } from '../ports.ts'

/** An in-memory stand-in for the balances and payouts tables. The game and the unit tests use it. */
export class MemoryPaymentsStore implements PaymentsStore {
  readonly ledger = new Ledger()
  readonly #available = new Map<string, Cents>()
  readonly #payouts = new Map<string, PayoutRecord>()
  readonly #lockOwner = new Map<string, string>()
  readonly #lockQueue = new Map<string, Array<() => void>>()

  constructor(openingBalances: Readonly<Record<string, Cents>>) {
    for (const [customerId, amount] of Object.entries(openingBalances)) {
      this.#available.set(customerId, cents(amount))
      this.ledger.post({
        id: `open:${customerId}`,
        kind: LEDGER_KIND.OPENING_DEPOSIT,
        entries: [
          { account: `outside:${customerId}`, amount: -amount },
          { account: `customer:${customerId}:available`, amount },
        ],
      })
    }
  }

  async loadCustomer(customerId: string): Promise<void> {
    const known = this.#available.has(customerId)
    if (!known) throw new Error(`Unknown customer ${customerId}`)
  }

  async readAvailable(customerId: string): Promise<Cents> {
    return this.available(customerId)
  }

  async writeAvailable(customerId: string, value: Cents): Promise<void> {
    this.#available.set(customerId, cents(value))
  }

  async reserve(customerId: string, amount: Cents, payoutId: string): Promise<ReserveResult> {
    const amountIsValid = isValidAmount(amount)
    if (!amountIsValid) throw new RangeError(`Not a valid amount: ${amount}`)
    // Every check comes before the first change, so a refused reserve changes nothing.
    const duplicate = this.#payouts.has(payoutId)
    if (duplicate) return RESERVE_RESULT.DUPLICATE
    const available = this.available(customerId)
    if (available < amount) return RESERVE_RESULT.INSUFFICIENT_FUNDS
    this.ledger.post({
      id: `reserve:${payoutId}`,
      kind: LEDGER_KIND.RESERVE,
      entries: [
        { account: `customer:${customerId}:available`, amount: -amount },
        { account: `customer:${customerId}:held`, amount },
      ],
    })
    this.#available.set(customerId, available - amount)
    this.#payouts.set(payoutId, { payoutId, customerId, amount, status: PAYOUT_STATUS.HELD })
    return RESERVE_RESULT.RESERVED
  }

  async payout(payoutId: string): Promise<PayoutRecord | null> {
    return this.#payouts.get(payoutId) ?? null
  }

  async settle(payoutId: string): Promise<void> {
    const hold = this.#openHold(payoutId)
    this.ledger.post({
      id: `settle:${payoutId}`,
      kind: LEDGER_KIND.SETTLE,
      entries: [
        { account: `customer:${hold.customerId}:held`, amount: -hold.amount },
        { account: `outside:${hold.customerId}`, amount: hold.amount },
      ],
    })
    this.#payouts.set(payoutId, { ...hold, status: PAYOUT_STATUS.PAID })
  }

  async release(payoutId: string): Promise<void> {
    const hold = this.#openHold(payoutId)
    this.ledger.post({
      id: `release:${payoutId}`,
      kind: LEDGER_KIND.RELEASE,
      entries: [
        { account: `customer:${hold.customerId}:held`, amount: -hold.amount },
        { account: `customer:${hold.customerId}:available`, amount: hold.amount },
      ],
    })
    this.#available.set(hold.customerId, this.available(hold.customerId) + hold.amount)
    this.#payouts.set(payoutId, { ...hold, status: PAYOUT_STATUS.RELEASED })
  }

  async lock(customerId: string): Promise<void> {
    let taken = this.#lockOwner.has(customerId)
    while (taken) {
      await new Promise<void>((wake) => this.#queue(customerId).push(wake))
      taken = this.#lockOwner.has(customerId)
    }
    this.#lockOwner.set(customerId, 'store')
  }

  async unlock(customerId: string): Promise<void> {
    this.#lockOwner.delete(customerId)
    this.#queue(customerId).shift()?.()
  }

  /** For the step scheduler: take the lock now, or say it is busy. */
  tryLock(customerId: string, owner: string): boolean {
    const free = this.lockFreeFor(customerId, owner)
    if (!free) return false
    this.#lockOwner.set(customerId, owner)
    return true
  }

  lockFreeFor(customerId: string, owner: string): boolean {
    const current = this.#lockOwner.get(customerId)
    return current === undefined || current === owner
  }

  unlockFor(customerId: string, owner: string): void {
    const holder = this.#lockOwner.get(customerId)
    if (holder === owner) this.#lockOwner.delete(customerId)
  }

  available(customerId: string): Cents {
    const value = this.#available.get(customerId)
    if (value === undefined) throw new Error(`Unknown customer ${customerId}`)
    return value
  }

  /** Payouts still on hold, oldest first. */
  openHolds(): PayoutRecord[] {
    return [...this.#payouts.values()].filter((payout) => payout.status === PAYOUT_STATUS.HELD)
  }

  /** Every payout we have a record of. */
  payouts(): PayoutRecord[] {
    return [...this.#payouts.values()]
  }

  held(customerId: string): Cents {
    let total = 0
    for (const hold of this.openHolds()) if (hold.customerId === customerId) total += hold.amount
    return total
  }

  #openHold(payoutId: string): PayoutRecord {
    const hold = this.#payouts.get(payoutId)
    if (hold?.status !== PAYOUT_STATUS.HELD) throw new Error(`No open hold for payout ${payoutId}`)
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
