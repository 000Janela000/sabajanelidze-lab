import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import { ALL_DEFENCES, type PaymentDefences, runSchedule, withdrawWith } from '../../src/index.ts'

/**
 * Property: whatever the order of events, and however many withdrawals race,
 * the exchange never pays out money the customer does not have.
 */
function neverLosesMoney(defences: PaymentDefences) {
  return fc.asyncProperty(
    fc.integer({ min: 0, max: 20000 }),
    fc.array(fc.integer({ min: 1, max: 15000 }), { minLength: 2, maxLength: 5 }),
    fc.array(fc.nat(), { minLength: 1, maxLength: 60 }),
    async (opening, amounts, picks) => {
      let index = 0
      const outcome = await runSchedule({ withdraw: withdrawWith(defences), opening, amounts }, (choices) => {
        const pick = picks[index % picks.length] ?? 0
        index += 1
        return pick % choices
      })
      return outcome.possible && outcome.picture.lost === 0 && outcome.picture.available >= 0
    },
  )
}

describe('withdrawals under random schedules', () => {
  test('with every defence on, no schedule loses money', async () => {
    await fc.assert(neverLosesMoney(ALL_DEFENCES), { numRuns: 300 })
  })

  // The defence check: switch the defence off and the same test must fail.
  // If it passed, the test would prove nothing about the defence.
  test('with the atomic reserve switched off, the same property fails', async () => {
    const result = await fc.check(neverLosesMoney({ ...ALL_DEFENCES, atomicReserve: false }), {
      numRuns: 300,
    })
    expect(result.failed).toBe(true)
  })
})
