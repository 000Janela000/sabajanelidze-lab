import { MemoryKycStore } from '../kyc/adapters/memory-store.ts'
import type { EventResult, KycStatus } from '../kyc/codes.ts'
import type { Applicant, HandleEvent, ProviderEvent } from '../kyc/ports.ts'
import { PROVIDER_TEST_KEY, signatureCheck } from '../kyc/signature.ts'

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
  const ports = { store, signatures: signatureCheck(PROVIDER_TEST_KEY) }
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
