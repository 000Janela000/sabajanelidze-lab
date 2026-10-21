/*
 * The lab's only server code (decisions/0002-cookie-free-counter.md): one address, /api/count, that adds one to a
 * count. Every other address is a file, served without running this (wrangler.jsonc runs it first only for /api/*).
 * It keeps nothing about the visitor: no IP address, no browser details, no cookie; only what happened, in which
 * incident, and the visit's `from` tag.
 */
import { COUNT_PATH, LIVE_ORIGIN, MAX_MESSAGE, readCountMessage } from '../src/lib/count-codes.ts'

/** The Analytics Engine dataset (wrangler.jsonc: binding COUNTS, dataset lab_counts), as far as this code uses it. */
export interface CountsDataset {
  writeDataPoint(point: { indexes: string[]; blobs: string[]; doubles: number[] }): void
}

export interface Env {
  readonly COUNTS: CountsDataset
}

const answer = (status: number, headers: Record<string, string> = {}) =>
  new Response(null, { status, headers: { 'Cache-Control': 'no-store', ...headers } })

/** Counts one message from one of the lab's own pages, or says why not. */
export async function handle(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname
  if (path !== COUNT_PATH) return answer(404)
  if (request.method !== 'POST') return answer(405, { Allow: 'POST' })
  const fromTheLab = request.headers.get('Origin') === LIVE_ORIGIN
  if (!fromTheLab) return answer(403)
  const declared = Number(request.headers.get('Content-Length') ?? 0)
  if (declared > MAX_MESSAGE) return answer(413)
  const text = await request.text()
  if (text.length > MAX_MESSAGE) return answer(413)
  const message = readCountMessage(text)
  if (!message) return answer(400)
  // One data point per event: the incident is the index; the event and the `from` tag are its words; 1 is its count.
  env.COUNTS.writeDataPoint({
    indexes: [message.station],
    blobs: [message.event, message.from],
    doubles: [1],
  })
  return answer(204)
}

export default { fetch: handle }
