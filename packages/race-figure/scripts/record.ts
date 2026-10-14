/*
 * Records every distinct way two withdrawals of 80 from a balance of 100 can run, by running the lab's real
 * naive withdrawal (build v0.1) one step at a time. The element only replays these records; it ships no
 * money logic of its own. A test checks on every build that the shipped records equal a fresh recording.
 */
import {
  CUSTOMER_ID,
  interleavings,
  moneyPicture,
  Race,
  STEP,
  stepsAlone,
  type WithdrawResult,
  withdrawV01,
} from '@lab/core'

export const OPENING = 10000
export const AMOUNT = 8000

/** One letter per step of the real code: load the customer, read the balance, save it, pay out. */
const STEP_LETTER: Record<string, string> = {
  [STEP.LOAD_CUSTOMER]: 'L',
  [STEP.READ_BALANCE]: 'R',
  [STEP.SAVE_BALANCE]: 'S',
  [STEP.PAY_OUT]: 'P',
}

const whole = (cents: number) => String(cents / 100)

/**
 * One run as text: the steps in order, then each request's result, then the final balance and paid-out total.
 * Example: "AL AR100 BL BR100 BS20 BP80 AS20 AP80|PP|20|160" (a step is request + step letter + the value it
 * read, saved or paid; the results are P = paid, R = refused, for A then B).
 */
export async function recordRuns(): Promise<string[]> {
  const setup = { withdraw: withdrawV01, opening: OPENING, amounts: [AMOUNT, AMOUNT] }
  const lines = await stepsAlone(withdrawV01, OPENING, AMOUNT)
  const runs = new Map<string, string>()
  for (const order of interleavings(lines, lines)) {
    const race = await Race.start(setup)
    const steps: string[] = []
    for (const name of order) {
      if (race.scheduler.isFinished(name)) continue
      if (!race.scheduler.canAdvance(name))
        throw new Error('build v0.1 takes no locks: every order is possible')
      const step = race.scheduler.waitingAt(name)
      await race.scheduler.advance(name)
      const picture = moneyPicture(race.store, race.bank, CUSTOMER_ID, OPENING)
      const letter = step ? STEP_LETTER[step] : undefined
      if (!letter) throw new Error(`No letter for step ${step}`)
      const value =
        step === STEP.READ_BALANCE || step === STEP.SAVE_BALANCE
          ? whole(picture.available)
          : step === STEP.PAY_OUT
            ? whole(AMOUNT)
            : ''
      steps.push(`${name}${letter}${value}`)
    }
    if (!race.done) throw new Error(`Order ${order.join('')} left a request unfinished`)
    const key = steps.join(' ')
    if (runs.has(key)) continue
    const outcome = race.outcome()
    const results = outcome.results
      .map((result) => (result !== 'error' && (result as WithdrawResult).status === 'PAID' ? 'P' : 'R'))
      .join('')
    runs.set(key, [key, results, whole(outcome.picture.available), whole(outcome.picture.paidOut)].join('|'))
  }
  return [...runs.values()]
}
