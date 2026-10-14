import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import {
  ANNA,
  allDeliveryOrders,
  annaMessages,
  BORIS,
  borisMessages,
  deliver,
  deliveryOrders,
  EVENT_RESULT,
  forgedApprovalForBoris,
  type HandleEvent,
  handleEvent,
  handleEventAllowedMoves,
  handleEventTimestamp,
  handleEventV01,
  KYC_STATUS,
  type KycStatus,
  PROVIDER_TEST_KEY,
  type ProviderEvent,
  sign,
} from '../../src/index.ts'

test('two messages, each arriving once or twice, can arrive in 14 distinct orders', () => {
  expect(deliveryOrders(['#1', '#2'])).toHaveLength(14)
  expect(new Set(deliveryOrders(['#1', '#2']).map((order) => order.join(' '))).size).toBe(14)
})

// The numbers the game shows for incident 2 come from these runs.
describe("incident 2: every delivery order of Anna's two messages", () => {
  const count = async (handle: HandleEvent) =>
    allDeliveryOrders(handle, await annaMessages(), ANNA, KYC_STATUS.APPROVED)

  test('build v0.1 (last message wins) locks Anna out in 7 of 14 orders', async () => {
    expect(await count(handleEventV01)).toMatchObject({ orders: 14, wrong: 7 })
  })

  test('"ignore older messages" still locks her out in 7 of 14: both carry the same second', async () => {
    expect(await count(handleEventTimestamp)).toMatchObject({ orders: 14, wrong: 7 })
  })

  test('"refuse moves that aren\'t allowed" locks her out in 4 of 14: an early "approved" is thrown away', async () => {
    const summary = await count(handleEventAllowedMoves)
    expect(summary).toMatchObject({ orders: 14, wrong: 4 })
    for (const outcome of summary.outcomes.filter(
      (o) => o.applicants[ANNA]?.status !== KYC_STATUS.APPROVED,
    )) {
      expect(outcome.results[0]).toBe(EVENT_RESULT.MOVE_NOT_ALLOWED)
    }
  })

  test('build v1 ends approved in all 14 orders', async () => {
    expect(await count(handleEvent)).toMatchObject({ orders: 14, wrong: 0 })
  })

  test('a forged "approved" lets Boris in with every build except v1', async () => {
    const order = [...(await borisMessages()), await forgedApprovalForBoris()]
    const end = async (handle: HandleEvent) => (await deliver(handle, order)).applicants[BORIS]?.status
    expect(await end(handleEventV01)).toBe(KYC_STATUS.APPROVED)
    expect(await end(handleEventTimestamp)).toBe(KYC_STATUS.APPROVED)
    expect(await end(handleEventAllowedMoves)).toBe(KYC_STATUS.APPROVED)
    expect(await end(handleEvent)).toBe(KYC_STATUS.IN_REVIEW)
  })
})

/**
 * Property: whatever the statuses, however many copies arrive and in whatever order,
 * the applicant ends at the provider's latest version.
 */
function endsAtTheLatestVersion(handle: HandleEvent) {
  const statuses = Object.values(KYC_STATUS).filter((status) => status !== KYC_STATUS.NOT_STARTED)
  return fc.asyncProperty(
    fc.array(fc.constantFrom(...statuses), { minLength: 2, maxLength: 5 }),
    fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 5, maxLength: 5 }),
    fc.array(fc.nat(), { minLength: 1, maxLength: 20 }),
    async (history, copies, picks) => {
      const messages: ProviderEvent[] = []
      for (const [index, status] of history.entries()) {
        const version = index + 1
        const sentAt = `2026-10-14T17:02:${String(10 + Math.floor(index / 2)).padStart(2, '0')}Z`
        const message = await sign(
          { eventId: `evt_${version}`, applicantId: ANNA, version, status, sentAt },
          PROVIDER_TEST_KEY,
        )
        for (let copy = 0; copy < (copies[index] ?? 1); copy++) messages.push(message)
      }
      // Shuffle by the random picks.
      const queue = [...messages]
      const order: ProviderEvent[] = []
      for (let i = 0; queue.length > 0; i++) {
        order.push(...queue.splice((picks[i % picks.length] ?? 0) % queue.length, 1))
      }
      const end = (await deliver(handle, order)).applicants[ANNA]
      const latest: KycStatus | undefined = history.at(-1)
      return end?.status === latest && end?.version === history.length
    },
  )
}

describe('provider messages under random orders and copies', () => {
  test('build v1 always ends at the latest version', async () => {
    await fc.assert(endsAtTheLatestVersion(handleEvent), { numRuns: 300 })
  })

  // The defence check: without version order, the same test must fail.
  test('with version order switched off (build v0.1), the same property fails', async () => {
    const result = await fc.check(endsAtTheLatestVersion(handleEventV01), { numRuns: 300 })
    expect(result.failed).toBe(true)
  })
})
