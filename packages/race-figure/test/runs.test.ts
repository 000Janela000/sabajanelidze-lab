import { allRuns, STEP, withdrawV01 } from '@lab/core'
import { describe, expect, test } from 'vitest'
import { AMOUNT, OPENING, recordRuns } from '../scripts/record.ts'
import { endStateHtml, FIRST_RUN, runs } from '../src/end-state.ts'
import { caption, frameAt, parseRun } from '../src/frames.ts'
import { RUNS } from '../src/runs.generated.ts'

const LETTER: Record<string, string> = {
  [STEP.LOAD_CUSTOMER]: 'L',
  [STEP.READ_BALANCE]: 'R',
  [STEP.SAVE_BALANCE]: 'S',
  [STEP.PAY_OUT]: 'P',
}

describe('the recorded runs the element ships', () => {
  test('equal a fresh recording of the real code (this runs on every build)', async () => {
    expect(RUNS).toEqual(await recordRuns())
  })

  test('are the 54 ways to run: 36 lose money, 18 do not', () => {
    const lost = runs.filter((run) => frameAt(run, run.steps.length).short !== null)
    expect(runs).toHaveLength(54)
    expect(lost).toHaveLength(36)
    expect(runs.length - lost.length).toBe(18)
  })

  test("match the core's own count, run for run, with the same money at the end", async () => {
    const summary = await allRuns(withdrawV01, OPENING, AMOUNT)
    expect(summary).toMatchObject({ runs: 54, losing: 36 })
    summary.outcomes.forEach((outcome, index) => {
      const run = runs[index]
      if (!run) throw new Error(`no run ${index}`)
      expect(run.steps.map((step) => `${step.name}${'LRSP'[step.index]}`)).toEqual(
        outcome.trace.map((line) => `${line.requestId}${LETTER[line.step]}`),
      )
      expect(Number(run.balance) * 100).toBe(outcome.picture.available)
      expect(Number(run.paidOut) * 100).toBe(outcome.picture.paidOut)
    })
  })
})

describe('what the figure shows', () => {
  const first = parseRun(FIRST_RUN)

  test('the first run ends with balance 20, 160 paid out, 80 short, never a negative balance', () => {
    expect(RUNS).toContain(FIRST_RUN)
    expect(frameAt(first, first.steps.length)).toMatchObject({ balance: '20', paidOut: '160', short: '80' })
    for (let count = 0; count <= first.steps.length; count++) {
      expect(Number(frameAt(first, count).balance)).toBeGreaterThanOrEqual(0)
    }
    expect(caption(first, 6, 54)).toBe('Order 6 of 54. Both passed the check. Balance 20, paid out 160.')
  })

  test('mid-run: after both requests read 100, nothing is saved or paid yet', () => {
    expect(frameAt(first, 4)).toMatchObject({
      lanes: { A: { done: 2, values: ['✓', '100'], result: null }, B: { done: 2, values: ['✓', '100'] } },
      balance: '100',
      paidOut: '0',
      short: null,
    })
  })

  test('a safe run says who was refused and what it read', () => {
    const safe = parseRun('AL AR100 AS20 AP80 BL BR20|PR|20|80')
    expect(caption(safe, 1, 54)).toBe('Order 1 of 54. B read 20 and was refused. Balance 20, paid out 80.')
    expect(frameAt(safe, safe.steps.length).short).toBeNull()
  })

  test('the no-JavaScript fallback is the end of the first run, with its caption, labels and note', () => {
    const html = endStateHtml()
    expect(html).toContain('Both passed the check. Balance 20, paid out 160.')
    expect(html).toContain('read the balance, check 80 ≤ balance')
    expect(html).toContain(
      "Each run is a recorded trace of the game's real code, checked by a test on every build.",
    )
    expect(html).toContain('href="https://lab.sabajanelidze.com/day/payments"')
    // The two buttons need JavaScript, so the fallback hides them.
    expect(html.match(/<button[^>]* hidden>/g)).toHaveLength(2)
  })
})
