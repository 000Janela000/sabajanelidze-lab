/*
 * Turns one recorded run (see scripts/record.ts) into what the figure shows after each step.
 * Display only: every value comes from the record; nothing here decides what the money does.
 */
import { TEXTS } from './texts.ts'

export type Name = 'A' | 'B'
export const NAMES: readonly Name[] = ['A', 'B']

const STEP_INDEX: Record<string, number> = { L: 0, R: 1, S: 2, P: 3 }
const OPENING = 100

export interface Step {
  readonly name: Name
  readonly index: number
  readonly value: string
}

export interface Run {
  readonly steps: readonly Step[]
  readonly paid: Readonly<Record<Name, boolean>>
  readonly balance: string
  readonly paidOut: string
}

export interface Lane {
  readonly done: number
  readonly values: readonly string[]
  /** "paid 80" or "refused", once this request has no steps left. */
  readonly result: string | null
}

export interface Frame {
  readonly lanes: Readonly<Record<Name, Lane>>
  readonly balance: string
  readonly paidOut: string
  /** How much more was paid out than the customer had, once the run is over and money was lost. */
  readonly short: string | null
}

export function parseRun(text: string): Run {
  const [steps = '', results = '', balance = '', paidOut = ''] = text.split('|')
  return {
    steps: steps.split(' ').map((token) => ({
      name: token[0] as Name,
      index: STEP_INDEX[token[1] ?? ''] ?? 0,
      value: token.slice(2) || '✓',
    })),
    paid: { A: results[0] === 'P', B: results[1] === 'P' },
    balance,
    paidOut,
  }
}

/** The figure after the first `count` steps of the run. */
export function frameAt(run: Run, count: number): Frame {
  const taken = run.steps.slice(0, count)
  const lanes = {} as Record<Name, Lane>
  for (const name of NAMES) {
    const mine = taken.filter((step) => step.name === name)
    const values: string[] = []
    for (const step of mine) values[step.index] = step.value
    const finished = !run.steps.slice(count).some((step) => step.name === name)
    lanes[name] = {
      done: mine.length,
      values,
      result: finished ? (run.paid[name] ? TEXTS.paid : TEXTS.refused) : null,
    }
  }
  const final = count >= run.steps.length
  const saved = taken.filter((step) => step.index === 2).at(-1)
  const balance = final ? run.balance : (saved?.value ?? String(OPENING))
  const paidSoFar = taken
    .filter((step) => step.index === 3)
    .reduce((sum, step) => sum + Number(step.value), 0)
  const paidOut = final ? run.paidOut : String(paidSoFar)
  const over = Number(run.paidOut) + Number(run.balance) - OPENING
  return { lanes, balance, paidOut, short: final && over > 0 ? String(over) : null }
}

/** The sentence under the figure once a run is over. */
export function caption(run: Run, number: number, of: number): string {
  const refused = NAMES.find((name) => !run.paid[name])
  const read = refused
    ? run.steps.find((step) => step.name === refused && step.index === 1)?.value
    : undefined
  const verdict = refused
    ? TEXTS.safe(refused, read ?? '', run.balance, run.paidOut)
    : TEXTS.lost(run.balance, run.paidOut)
  return `${TEXTS.order(number, of)} ${verdict}`
}
