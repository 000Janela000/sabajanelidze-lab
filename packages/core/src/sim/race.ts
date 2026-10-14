import type { Cents } from '../money.ts'
import { FakeBank, MemoryPaymentsStore } from '../payments/memory.ts'
import { type MoneyPicture, moneyPicture } from '../payments/reconcile.ts'
import type { Withdraw, WithdrawResult } from '../payments/withdraw.ts'
import { gatedPaymentPorts } from './gated.ts'
import { StepScheduler, type TraceLine } from './scheduler.ts'

export const CUSTOMER_ID = '42'

/** Two (or more) withdrawals of the same customer, racing. */
export interface RaceSetup {
  readonly withdraw: Withdraw
  readonly opening: Cents
  readonly amounts: readonly Cents[]
}

export interface RaceOutcome {
  /** False when the order is impossible: it asks a request to pass a lock another request holds. */
  readonly possible: boolean
  readonly picture: MoneyPicture
  readonly results: ReadonlyArray<WithdrawResult | 'error'>
  readonly trace: readonly TraceLine[]
}

export const requestName = (index: number): string => String.fromCharCode(65 + index) // 0 → "A"

/** A running race the game can step through one tap at a time. */
export class Race {
  readonly scheduler = new StepScheduler()
  readonly store: MemoryPaymentsStore
  readonly bank = new FakeBank()
  readonly names: readonly string[]
  readonly setup: RaceSetup

  private constructor(setup: RaceSetup) {
    this.setup = setup
    this.store = new MemoryPaymentsStore({ [CUSTOMER_ID]: setup.opening })
    this.names = setup.amounts.map((_, index) => requestName(index))
  }

  static async start(setup: RaceSetup): Promise<Race> {
    const race = new Race(setup)
    await Promise.all(
      setup.amounts.map((amount, index) => {
        const name = requestName(index)
        const ports = gatedPaymentPorts(race.scheduler, name, race.store, race.bank)
        return race.scheduler.start(name, () =>
          setup.withdraw(ports, { customerId: CUSTOMER_ID, amount, payoutId: `payout-${name}` }),
        )
      }),
    )
    return race
  }

  /** Lets one request take its next step. Returns false if it is finished or blocked. */
  async step(name: string): Promise<boolean> {
    if (!this.scheduler.canAdvance(name)) return false
    await this.scheduler.advance(name)
    return true
  }

  /** Lets every request finish, in order A, B, …, skipping blocked ones. */
  async finish(): Promise<void> {
    for (;;) {
      const next = this.names.find((name) => this.scheduler.canAdvance(name))
      if (!next) break
      await this.scheduler.advance(next)
    }
    const stuck = this.names.filter((name) => !this.scheduler.isFinished(name))
    if (stuck.length > 0) throw new Error(`Requests stuck: ${stuck.join(', ')}`)
  }

  get done(): boolean {
    return this.names.every((name) => this.scheduler.isFinished(name))
  }

  outcome(possible = true): RaceOutcome {
    return {
      possible,
      picture: moneyPicture(this.store, this.bank, CUSTOMER_ID, this.setup.opening),
      results: this.names.map((name) => {
        const result = this.scheduler.result(name)
        return result?.ok ? (result.value as WithdrawResult) : 'error'
      }),
      trace: [...this.scheduler.trace],
    }
  }
}

/** How many steps one request takes when it runs alone: the number of code lines in the game. */
export async function stepsAlone(withdraw: Withdraw, opening: Cents, amount: Cents): Promise<number> {
  const race = await Race.start({ withdraw, opening, amounts: [amount] })
  await race.finish()
  return race.scheduler.trace.length
}

/** Every way to interleave `a` steps of request A with `b` steps of request B. */
export function* interleavings(a: number, b: number, prefix: string[] = []): Generator<string[]> {
  if (a === 0 && b === 0) {
    yield prefix
    return
  }
  if (a > 0) yield* interleavings(a - 1, b, [...prefix, 'A'])
  if (b > 0) yield* interleavings(a, b - 1, [...prefix, 'B'])
}

/**
 * Plays one order of picks. A pick for a request that has already finished (for example
 * because it was refused early) does nothing. A pick for a blocked request makes the order impossible.
 */
export async function runOrder(setup: RaceSetup, order: readonly string[]): Promise<RaceOutcome> {
  const race = await Race.start(setup)
  for (const name of order) {
    if (race.scheduler.isFinished(name)) continue
    if (!race.scheduler.canAdvance(name)) return race.outcome(false)
    await race.scheduler.advance(name)
  }
  await race.finish()
  return race.outcome()
}

export interface AllOrdersSummary {
  readonly linesPerRequest: number
  /** Distinct ways the two requests can really run (each one a different sequence of steps). */
  readonly runs: number
  readonly losing: number
  /** One outcome per distinct run. */
  readonly outcomes: readonly RaceOutcome[]
}

/**
 * Runs every possible order of two equal requests and counts the ones that lose money.
 * Schedules that end up running the same steps (for example once a request was refused early)
 * count once, and schedules a lock makes impossible don't count at all.
 */
export async function allOrders(
  withdraw: Withdraw,
  opening: Cents,
  amount: Cents,
): Promise<AllOrdersSummary> {
  const lines = await stepsAlone(withdraw, opening, amount)
  const runs = new Map<string, RaceOutcome>()
  for (const order of interleavings(lines, lines)) {
    const outcome = await runOrder({ withdraw, opening, amounts: [amount, amount] }, order)
    if (!outcome.possible) continue
    const key = outcome.trace.map((line) => `${line.requestId}:${line.label}`).join('|')
    if (!runs.has(key)) runs.set(key, outcome)
  }
  const outcomes = [...runs.values()]
  return {
    linesPerRequest: lines,
    runs: outcomes.length,
    losing: outcomes.filter((outcome) => outcome.picture.lost !== 0).length,
    outcomes,
  }
}

/**
 * Request A runs `afterLine` lines and then gets slow. B runs as far as it can (it may have to
 * wait for a lock A holds). Then everything finishes.
 */
export async function pauseAfter(
  withdraw: Withdraw,
  opening: Cents,
  amount: Cents,
  afterLine: number,
): Promise<RaceOutcome> {
  const race = await Race.start({ withdraw, opening, amounts: [amount, amount] })
  for (let line = 0; line < afterLine; line++) {
    if (!(await race.step('A'))) break
  }
  for (;;) {
    if (!(await race.step('B'))) break
  }
  await race.finish()
  return race.outcome()
}

/**
 * Runs any number of requests with a schedule chosen by `pick` (for example random numbers from a
 * property-based test): at each moment, `pick(n)` chooses among the n requests that can move.
 */
export async function runSchedule(setup: RaceSetup, pick: (choices: number) => number): Promise<RaceOutcome> {
  const race = await Race.start(setup)
  for (;;) {
    const movable = race.names.filter((name) => race.scheduler.canAdvance(name))
    if (movable.length === 0) break
    const chosen = movable[Math.abs(pick(movable.length)) % movable.length]
    if (chosen === undefined) break
    await race.scheduler.advance(chosen)
  }
  return race.outcome(race.done)
}
