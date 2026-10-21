/*
 * The lab's cookie-free counter (decisions/0002-cookie-free-counter.md): what a page may send, and the check the Worker
 * makes before it counts. Shared by the pages (lib/count.ts) and the Worker (worker/index.ts), so both agree.
 */
import { STATIONS } from './stations.ts'

/** What happened, once per page visit: the first move, the fix that holds, a click on the code. */
export const COUNT_EVENT = { STARTED: 'STARTED', FINISHED: 'FINISHED', CODE_CLICK: 'CODE_CLICK' } as const
export type CountEvent = (typeof COUNT_EVENT)[keyof typeof COUNT_EVENT]

/** The one address the Worker answers; every other address is a file. */
export const COUNT_PATH = '/api/count'

/** Only the live site counts: its pages send from here, and the Worker accepts nothing else. */
export const LIVE_ORIGIN = 'https://lab.sabajanelidze.com'

/** A message is a few dozen characters; anything longer is not one of ours. */
export const MAX_MESSAGE = 512

export interface CountMessage {
  readonly event: CountEvent
  /** The incident: a built station's slug ("payments", "kyc"). */
  readonly station: string
  /** Where the visit came from, the page address's `from` tag ("portfolio-home"), or "" without one. */
  readonly from: string
}

const EVENTS = new Set<string>(Object.values(COUNT_EVENT))
const COUNTED_STATIONS = new Set<string>(
  STATIONS.filter((station) => station.ready).map((station) => station.slug),
)
const FROM_TAG = /^[a-z0-9-]{1,40}$/

/** The page address's `from` tag, if it is a plain one (letters, digits and dashes); otherwise "". */
export function fromTag(search: string): string {
  const tag = new URLSearchParams(search).get('from') ?? ''
  const plain = FROM_TAG.test(tag)
  return plain ? tag : ''
}

/** A message from a page, if it is one we count: a known event in a built incident, with a plain `from` tag or none. */
export function readCountMessage(text: string): CountMessage | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const { event, station, from } = data as Record<string, unknown>
  const knownEvent = typeof event === 'string' && EVENTS.has(event)
  const knownStation = typeof station === 'string' && COUNTED_STATIONS.has(station)
  if (!knownEvent || !knownStation) return null
  const plainFrom = typeof from === 'string' && FROM_TAG.test(from)
  return { event: event as CountEvent, station: station as string, from: plainFrom ? (from as string) : '' }
}
