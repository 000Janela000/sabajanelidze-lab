import { MemoryKycStore, MemoryRefusalLog } from '../kyc/adapters/memory-store.ts'
import type { EventResult, KycStatus } from '../kyc/codes.ts'
import type { Applicant, HandleEvent, ProviderEvent } from '../kyc/ports.ts'
import { ANNA, annaMessages, BORIS, borisMessages, forgedApprovalForBoris } from '../kyc/scenarios.ts'
import { PROVIDER_TEST_KEY, signatureCheck } from '../kyc/signature.ts'
import { handleEventV01 } from '../kyc/teaching/build-v01.ts'

/**
 * Every order in which the network can deliver these messages when each one arrives once or twice
 * (the provider sends a copy when our server answers slowly). Each distinct order counts once.
 */
export function deliveryOrders<T>(messages: readonly T[], maxCopies = 2): T[][] {
  const orders = new Map<string, T[]>()
  const copies = messages.map(() => 1)
  for (;;) {
    for (const order of arrangements(copies)) {
      orders.set(
        order.join(','),
        order.map((index) => messages[index] as T),
      )
    }
    // Next combination of copy counts, like an odometer: 1,1 → 2,1 → 1,2 → 2,2.
    let digit = 0
    while (digit < copies.length && copies[digit] === maxCopies) copies[digit++] = 1
    if (digit === copies.length) break
    copies[digit] = (copies[digit] ?? 1) + 1
  }
  return [...orders.values()]
}

/** Every distinct sequence that uses message i exactly copies[i] times. */
function arrangements(copies: readonly number[]): number[][] {
  const left = [...copies]
  const total = left.reduce((sum, n) => sum + n, 0)
  const result: number[][] = []
  const walk = (prefix: number[]) => {
    if (prefix.length === total) {
      result.push([...prefix])
      return
    }
    for (let index = 0; index < left.length; index++) {
      if ((left[index] ?? 0) === 0) continue
      left[index] = (left[index] ?? 0) - 1
      walk([...prefix, index])
      left[index] = (left[index] ?? 0) + 1
    }
  }
  walk([])
  return result
}

export interface DeliveryOutcome {
  readonly order: readonly ProviderEvent[]
  /** What the handler did with each message, in delivery order. */
  readonly results: readonly EventResult[]
  /** Each applicant's record after the last message. */
  readonly applicants: Readonly<Record<string, Applicant>>
}

/** Delivers the messages one after another to a fresh store, with the real signature check. */
export async function deliver(
  handle: HandleEvent,
  order: readonly ProviderEvent[],
): Promise<DeliveryOutcome> {
  const ids = [...new Set(order.map((event) => event.applicantId))]
  const store = new MemoryKycStore(ids)
  const ports = { store, signatures: signatureCheck(PROVIDER_TEST_KEY), refusals: new MemoryRefusalLog() }
  const results: EventResult[] = []
  for (const event of order) {
    const result = await handle(ports, event)
    results.push(result)
  }
  return { order, results, applicants: Object.fromEntries(ids.map((id) => [id, store.applicant(id)])) }
}

export interface AllDeliveriesSummary {
  readonly orders: number
  /** Orders that leave the applicant in the wrong status. */
  readonly wrong: number
  readonly outcomes: readonly DeliveryOutcome[]
}

/** Delivers the messages in every order (each once or twice) and counts the orders that end in the wrong status. */
export async function allDeliveryOrders(
  handle: HandleEvent,
  messages: readonly ProviderEvent[],
  applicantId: string,
  expected: KycStatus,
): Promise<AllDeliveriesSummary> {
  const outcomes: DeliveryOutcome[] = []
  for (const order of deliveryOrders(messages)) {
    const outcome = await deliver(handle, order)
    outcomes.push(outcome)
  }
  return {
    orders: outcomes.length,
    wrong: outcomes.filter((outcome) => outcome.applicants[applicantId]?.status !== expected).length,
    outcomes,
  }
}

/**
 * One night with lost answers (the network, simulated): the provider sends each message once, in order; every
 * message whose answer from our server was lost is sent again, in the order they went unanswered. So losing the
 * answer to #1 gives 1 2 1; to #2, 1 2 2; to both, 1 2 1 2. Each is one of the orders `deliveryOrders` counts.
 */
export function lostAnswerNight<T extends { readonly version: number }>(
  messages: readonly T[],
  lost: readonly number[],
): T[] {
  const resent = messages.filter((message) => lost.includes(message.version))
  return [...messages, ...resent]
}

/**
 * Last night on build v0.1, as the clean-up finds it: Anna's answer to #1 was lost (1 2 1), and a forged "approved"
 * came for Boris after his two real messages. Real handler, real signatures, one store.
 */
export async function lastNightOnV01() {
  const anna = await annaMessages()
  const boris = await borisMessages()
  const forged = await forgedApprovalForBoris()
  const store = new MemoryKycStore([ANNA, BORIS])
  const refusals = new MemoryRefusalLog()
  const ports = { store, signatures: signatureCheck(PROVIDER_TEST_KEY), refusals }
  const night = [...lostAnswerNight(anna, [1]), ...boris, forged]
  for (const event of night) await handleEventV01(ports, event)
  return { store, refusals }
}
