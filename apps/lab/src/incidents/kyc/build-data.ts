/*
 * Build time only: everything incident 2's page shows that comes from the code.
 * The numbers are computed by running the same code the game runs; the excerpts are cut from the real files.
 */
import {
  ANNA,
  allDeliveryOrders,
  annaMessages,
  BORIS,
  borisMessages,
  deliver,
  forgedApprovalForBoris,
  type HandleEvent,
  handleEvent,
  handleEventAllowedMoves,
  handleEventTimestamp,
  handleEventV01,
  KYC_STATUS,
  type KycStatus,
  lostAnswerNight,
} from '@lab/core'
import { buildChain, codeLines, excerpt, fileUrl, lineUrl } from '../../lib/source.ts'
import { lockedOut, ORDER_LABELS } from './Count.tsx'
import { CUT, type CutId, PATCH, type PatchOption } from './setup.ts'

const CORE = 'packages/core/src/kyc'
const TESTS = 'packages/core/test'
export const FILES = {
  HANDLE: `${CORE}/handle-event.ts`,
  BUILD_V01: `${CORE}/teaching/build-v01.ts`,
  PATCHES: `${CORE}/teaching/patches.ts`,
  PROVIDER_CHECK: `${CORE}/provider-check.ts`,
  POSTGRES: `${CORE}/adapters/postgres-store.ts`,
  DELIVERIES: 'packages/core/src/simulation/deliveries.ts',
  HANDLE_TEST: `${TESTS}/kyc/handle-event.test.ts`,
  DELIVERIES_TEST: `${TESTS}/simulation/deliveries.test.ts`,
  PROVIDER_TEST: `${TESTS}/kyc/provider-check.test.ts`,
  POSTGRES_TEST: `${TESTS}/kyc/postgres.test.ts`,
  GO_HANDLE: 'go/kyc/handle_event.go',
  GO_POSTGRES: 'go/kyc/postgres.go',
  GO_HANDLE_TEST: 'go/kyc/handle_event_test.go',
  GO_POSTGRES_TEST: 'go/kyc/postgres_test.go',
} as const

/** Where the identity-check code and its tests live (the simulator's file is shared with incident 1). */
const HISTORY = [CORE, FILES.DELIVERIES, `${TESTS}/kyc`, FILES.DELIVERIES_TEST, 'go/kyc']

/** Whether a forged "approved" for Boris, after his two real messages, gets in. */
async function forgeryGetsIn(handle: HandleEvent): Promise<boolean> {
  const order = [...(await borisMessages()), await forgedApprovalForBoris()]
  const outcome = await deliver(handle, order)
  return outcome.applicants[BORIS]?.status === KYC_STATUS.APPROVED
}

export async function kycBuildData() {
  const code = {
    v01: excerpt(FILES.BUILD_V01, 'kyc-build-v0.1'),
    v1: excerpt(FILES.HANDLE, 'kyc-build-v1'),
    timestamp: excerpt(FILES.PATCHES, 'kyc-patch-timestamp'),
    allowedMoves: excerpt(FILES.PATCHES, 'kyc-patch-allowed-moves'),
    compare: excerpt(FILES.PROVIDER_CHECK, 'kyc-compare'),
    reconcile: excerpt(FILES.PROVIDER_CHECK, 'kyc-reconcile'),
    postgresLock: excerpt(FILES.POSTGRES, 'kyc-postgres-lock'),
    postgresRecord: excerpt(FILES.POSTGRES, 'kyc-postgres-record'),
    goHandle: excerpt(FILES.GO_HANDLE, 'kyc-handle-go'),
    goPostgresLock: excerpt(FILES.GO_POSTGRES, 'kyc-postgres-lock-go'),
  }

  const messages = await annaMessages()
  const count = (handle: HandleEvent) => allDeliveryOrders(handle, messages, ANNA, KYC_STATUS.APPROVED)
  const runs = {
    naive: await count(handleEventV01),
    timestamp: await count(handleEventTimestamp),
    allowedMoves: await count(handleEventAllowedMoves),
    versionOrder: await count(handleEvent),
  }
  const forgery = {
    naive: await forgeryGetsIn(handleEventV01),
    timestamp: await forgeryGetsIn(handleEventTimestamp),
    allowedMoves: await forgeryGetsIn(handleEventAllowedMoves),
    versionOrder: await forgeryGetsIn(handleEvent),
  }

  // Step 1's three cuts on build v0.1: how each night ends for Anna.
  const nights = {} as Record<CutId, KycStatus>
  for (const id of Object.keys(CUT) as CutId[]) {
    const outcome = await deliver(handleEventV01, lostAnswerNight(messages, CUT[id]))
    nights[id] = outcome.applicants[ANNA]?.status ?? KYC_STATUS.NOT_STARTED
  }
  // Every delivery order on build v0.1, as the text version lists them.
  const orders = runs.naive.outcomes.map((outcome, index) => ({
    label: ORDER_LABELS[index] ?? '',
    lockedOut: lockedOut(outcome),
  }))

  // The order of the choices is fixed on purpose: the right answer is not the last one.
  const patches: PatchOption[] = [
    { id: PATCH.TIMESTAMP, lines: codeLines(code.timestamp) },
    { id: PATCH.VERSION_ORDER, lines: codeLines(code.v1) },
    { id: PATCH.ALLOWED_MOVES, lines: codeLines(code.allowedMoves) },
  ]

  const tests = {
    everyOrder: lineUrl(
      FILES.DELIVERIES_TEST,
      'describe("incident 2: every delivery order of Anna\'s two messages"',
    ),
    randomOrders: lineUrl(FILES.DELIVERIES_TEST, "test('build v1 always ends at the latest version'"),
    defenceCheck: lineUrl(
      FILES.DELIVERIES_TEST,
      "test('with version order switched off (build v0.1), the same property fails'",
    ),
    lock: lineUrl(
      FILES.HANDLE_TEST,
      "test('with the lock, #2 arriving while #1 is saving still ends approved at version 2'",
    ),
    lockOff: lineUrl(
      FILES.HANDLE_TEST,
      "test('without the lock, the same two messages leave Anna stuck at #1'",
    ),
    forgedId: lineUrl(FILES.HANDLE_TEST, "a forged message with a real message's ID cannot use that ID up"),
    cleanUp: lineUrl(FILES.PROVIDER_TEST, "describe('the clean-up after last night on build v0.1'"),
    realDatabase: lineUrl(FILES.POSTGRES_TEST, 'describe.skipIf(!process.env.DATABASE_URL)'),
    goLock: lineUrl(FILES.GO_HANDLE_TEST, 'func TestWithTheLockTwoArrivingWhileOneIsSavingStillEndsApproved'),
    goRealDatabase: lineUrl(
      FILES.GO_POSTGRES_TEST,
      'func TestPostgresWithoutTheRowLockTheSameRaceLeavesAnnaStuckAtOne',
    ),
  }

  return {
    code,
    v01Lines: codeLines(code.v01),
    runs,
    forgery,
    nights,
    orders,
    patches,
    tests,
    // Codex's review, word for word, with what was done about each finding.
    review: fileUrl('docs/reviews/codex-incident-2.md'),
    chain: buildChain(HISTORY),
  }
}

export type KycBuildData = Awaited<ReturnType<typeof kycBuildData>>
