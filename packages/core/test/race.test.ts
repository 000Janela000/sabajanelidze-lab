import { describe, expect, test } from 'vitest'
import {
  allOrders,
  pauseAfter,
  type Withdraw,
  withdraw,
  withdrawCheckTwice,
  withdrawLockRead,
  withdrawLockReadAndSave,
  withdrawV01,
} from '../src/index.ts'

const opening = 10000
const amount = 8000

async function losingPausePoints(code: Withdraw): Promise<number[]> {
  const losing: number[] = []
  const { linesPerRequest } = await allOrders(code, opening, amount)
  for (let line = 1; line <= linesPerRequest; line++) {
    const outcome = await pauseAfter(code, opening, amount, line)
    if (outcome.picture.lost !== 0) losing.push(line)
  }
  return losing
}

// These numbers are the ones the game and the design document show. If the code changes, they must change too.
describe('incident 1: every distinct run of two withdrawals of 80 from 100', () => {
  test.each([
    { name: 'build v0.1', code: withdrawV01, lines: 4, runs: 54, losing: 36 },
    { name: 'patch: check twice', code: withdrawCheckTwice, lines: 5, runs: 182, losing: 120 },
    { name: 'patch: lock only the read', code: withdrawLockRead, lines: 6, runs: 180, losing: 100 },
    { name: 'patch: lock read and save', code: withdrawLockReadAndSave, lines: 6, runs: 50, losing: 0 },
    { name: 'build v1: reserve, then settle', code: withdraw, lines: 4, runs: 24, losing: 0 },
  ])('$name: $losing of $runs runs lose money', async ({ code, lines, runs, losing }) => {
    const summary = await allOrders(code, opening, amount)
    expect(summary).toMatchObject({ linesPerRequest: lines, runs, losing })
  })

  test('no two counted runs are the same sequence of steps', async () => {
    const summary = await allOrders(withdrawV01, opening, amount)
    const keys = summary.outcomes.map((outcome) =>
      outcome.trace.map((line) => `${line.requestId}:${line.label}`).join('|'),
    )
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('a losing order of build v0.1 pays out 160 and still shows 20', async () => {
    const summary = await allOrders(withdrawV01, opening, amount)
    const loss = summary.outcomes.find((outcome) => outcome.picture.lost !== 0)
    expect(loss?.picture).toEqual({ deposited: 10000, available: 2000, held: 0, paidOut: 16000, lost: 8000 })
  })
})

describe('incident 1: where request A gets slow', () => {
  test.each([
    { name: 'build v0.1', code: withdrawV01, losing: [2] },
    { name: 'patch: check twice', code: withdrawCheckTwice, losing: [3] },
    { name: 'patch: lock only the read', code: withdrawLockRead, losing: [4] },
    { name: 'patch: lock read and save', code: withdrawLockReadAndSave, losing: [] },
    { name: 'build v1', code: withdraw, losing: [] },
  ])('$name loses only when A pauses after line(s) $losing', async ({ code, losing }) => {
    await expect(losingPausePoints(code)).resolves.toEqual(losing)
  })
})
