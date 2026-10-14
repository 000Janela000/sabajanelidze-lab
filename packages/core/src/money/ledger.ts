import { type Cents, cents } from './cents.ts'

/**
 * A double-entry ledger. Every transaction moves money between accounts, and its entries sum to zero.
 * Example: a reserve of 80 is `customer:42:available -80` and `customer:42:held +80`.
 */
export interface Entry {
  readonly account: string
  readonly amount: Cents
}

export interface Transaction {
  readonly id: string
  /** A code naming what kind of movement this is, for example RESERVE. */
  readonly kind: string
  readonly entries: readonly Entry[]
}

export class Ledger {
  readonly #transactions: Transaction[] = []
  readonly #ids = new Set<string>()
  readonly #balances = new Map<string, Cents>()

  post(transaction: Transaction): void {
    if (this.#ids.has(transaction.id)) throw new Error(`Transaction ${transaction.id} is already posted`)
    if (transaction.entries.length < 2)
      throw new Error(`Transaction ${transaction.id} needs at least two entries`)
    const sum = transaction.entries.reduce((total, entry) => total + cents(entry.amount), 0)
    if (sum !== 0) throw new Error(`Transaction ${transaction.id} does not sum to zero (sum: ${sum})`)

    this.#ids.add(transaction.id)
    this.#transactions.push(transaction)
    for (const entry of transaction.entries) {
      this.#balances.set(entry.account, this.balance(entry.account) + entry.amount)
    }
  }

  balance(account: string): Cents {
    return this.#balances.get(account) ?? 0
  }

  transactions(): readonly Transaction[] {
    return this.#transactions
  }

  /** Returns every broken rule; an empty list means the books balance. */
  problems(): string[] {
    const problems: string[] = []
    for (const transaction of this.#transactions) {
      const sum = transaction.entries.reduce((total, entry) => total + entry.amount, 0)
      if (sum !== 0) problems.push(`${transaction.id} sums to ${sum}`)
    }
    let total = 0
    for (const balance of this.#balances.values()) total += balance
    if (total !== 0) problems.push(`all accounts together sum to ${total}`)
    return problems
  }
}
