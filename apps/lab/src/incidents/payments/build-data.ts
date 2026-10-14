/*
 * Build time only: everything incident 1's page shows that comes from the code.
 * The numbers are computed by running the same code the game runs; the excerpts are cut from the real files.
 */
import {
  allRuns,
  pauseAfter,
  withdraw,
  withdrawCheckTwice,
  withdrawLockRead,
  withdrawLockReadAndSave,
  withdrawV01,
} from '@lab/core'
import { buildChain, codeLines, excerpt, lineUrl } from '../../lib/source.ts'
import { AMOUNT, OPENING, PATCH, type PatchOption } from './setup.ts'

const CORE = 'packages/core/src/payments'
const TESTS = 'packages/core/test'
export const FILES = {
  WITHDRAW: `${CORE}/withdraw.ts`,
  BUILD_V01: `${CORE}/teaching/build-v01.ts`,
  PATCHES: `${CORE}/teaching/patches.ts`,
  CLEAN_UP: `${CORE}/clean-up.ts`,
  POSTGRES: `${CORE}/adapters/postgres-store.ts`,
  RACE: 'packages/core/src/simulation/all-runs.ts',
  RACE_TEST: `${TESTS}/simulation/race.test.ts`,
  PROPERTY_TEST: `${TESTS}/simulation/properties.test.ts`,
  CLEAN_UP_TEST: `${TESTS}/payments/clean-up.test.ts`,
  POSTGRES_TEST: `${TESTS}/payments/postgres.test.ts`,
} as const

export async function paymentsBuildData() {
  const code = {
    v01: excerpt(FILES.BUILD_V01, 'build-v0.1'),
    v1: excerpt(FILES.WITHDRAW, 'build-v1'),
    checkTwice: excerpt(FILES.PATCHES, 'patch-check-twice'),
    lockRead: excerpt(FILES.PATCHES, 'patch-lock-read'),
    lockBoth: excerpt(FILES.PATCHES, 'patch-lock-read-and-save'),
    resolveUnknown: excerpt(FILES.CLEAN_UP, 'resolve-unknown'),
    reconcile: excerpt(FILES.CLEAN_UP, 'reconcile'),
    postgresReserve: excerpt(FILES.POSTGRES, 'postgres-reserve'),
    postgresLockOrder: excerpt(FILES.POSTGRES, 'postgres-lock-order'),
  }

  const runs = {
    naive: await allRuns(withdrawV01, OPENING, AMOUNT),
    checkTwice: await allRuns(withdrawCheckTwice, OPENING, AMOUNT),
    lockRead: await allRuns(withdrawLockRead, OPENING, AMOUNT),
    lockBoth: await allRuns(withdrawLockReadAndSave, OPENING, AMOUNT),
    reserve: await allRuns(withdraw, OPENING, AMOUNT),
  }

  const losingLines: number[] = []
  for (let line = 1; line <= runs.naive.linesPerRequest; line++) {
    if ((await pauseAfter(withdrawV01, OPENING, AMOUNT, line)).picture.lost !== 0) losingLines.push(line)
  }
  const lossExample = runs.naive.outcomes.find((outcome) => outcome.picture.lost !== 0)?.picture ?? null

  // The order of the choices is fixed on purpose: the right answer is not the last one.
  const patches: PatchOption[] = [
    { id: PATCH.CHECK_TWICE, lines: codeLines(code.checkTwice) },
    { id: PATCH.RESERVE, lines: codeLines(code.v1) },
    { id: PATCH.LOCK_READ, lines: codeLines(code.lockRead) },
  ]

  const tests = {
    everyRun: lineUrl(FILES.RACE_TEST, "describe('incident 1: every distinct run"),
    randomSchedules: lineUrl(FILES.PROPERTY_TEST, "test('with every defence on"),
    defenceCheck: lineUrl(FILES.PROPERTY_TEST, "test('with the atomic reserve switched off"),
    unknownOutcome: lineUrl(FILES.CLEAN_UP_TEST, 'settles the hold when the bank says it paid'),
    realDatabase: lineUrl(FILES.POSTGRES_TEST, 'describe.skipIf(!process.env.DATABASE_URL)'),
  }

  const chain = buildChain([
    FILES.WITHDRAW,
    FILES.BUILD_V01,
    FILES.PATCHES,
    FILES.CLEAN_UP,
    FILES.POSTGRES,
    FILES.RACE,
    FILES.RACE_TEST,
    FILES.PROPERTY_TEST,
    FILES.CLEAN_UP_TEST,
    FILES.POSTGRES_TEST,
  ])

  return {
    code,
    v01Lines: codeLines(code.v01),
    runs,
    losingLines,
    lossExample,
    patches,
    tests,
    chain,
  }
}

export type PaymentsBuildData = Awaited<ReturnType<typeof paymentsBuildData>>
