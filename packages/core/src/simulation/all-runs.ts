import type { Cents } from '../money/cents.ts'
import type { Withdraw } from '../payments/withdraw.ts'
import { interleavings, Race, type RaceOutcome, type RaceSetup, runOrder, stepsAlone } from './race.ts'

export interface AllRunsSummary {
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
export async function allRuns(withdraw: Withdraw, opening: Cents, amount: Cents): Promise<AllRunsSummary> {
  const lines = await stepsAlone(withdraw, opening, amount)
  const runs = new Map<string, RaceOutcome>()
  for (const order of interleavings(lines, lines)) {
    const outcome = await runOrder({ withdraw, opening, amounts: [amount, amount] }, order)
    if (!outcome.possible) continue
    const key = outcome.trace.map((line) => `${line.requestId}:${line.step}`).join('|')
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
