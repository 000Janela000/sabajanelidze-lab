import { describe, expect, test } from 'vitest'
import { COUNT_PATH, LIVE_ORIGIN } from '../src/lib/count-codes.ts'
import { type CountsDataset, handle } from './index.ts'

/** A dataset that keeps what is written to it, in place of Analytics Engine. */
function dataset() {
  const points: Parameters<CountsDataset['writeDataPoint']>[0][] = []
  return { points, COUNTS: { writeDataPoint: (point) => points.push(point) } satisfies CountsDataset }
}

function post(body: string, headers: Record<string, string> = { Origin: LIVE_ORIGIN }) {
  return new Request(`${LIVE_ORIGIN}${COUNT_PATH}`, { method: 'POST', body, headers })
}

const finished = JSON.stringify({ event: 'FINISHED', station: 'kyc', from: 'portfolio-home' })

describe('the counter', () => {
  test('counts one finished incident from a lab page, with its from tag, and nothing else', async () => {
    const { points, COUNTS } = dataset()
    const response = await handle(post(finished), { COUNTS })
    expect(response.status).toBe(204)
    expect(points).toEqual([{ indexes: ['kyc'], blobs: ['FINISHED', 'portfolio-home'], doubles: [1] }])
  })

  test('refuses a message from anywhere but the live lab, and counts nothing', async () => {
    const { points, COUNTS } = dataset()
    const elsewhere = await handle(post(finished, { Origin: 'https://example.com' }), { COUNTS })
    const noOrigin = await handle(post(finished, {}), { COUNTS })
    const testCopy = await handle(
      post(finished, { Origin: 'https://sabajanelidze-lab.ssjanelidze.workers.dev' }),
      {
        COUNTS,
      },
    )
    expect([elsewhere.status, noOrigin.status, testCopy.status]).toEqual([403, 403, 403])
    expect(points).toEqual([])
  })

  test('refuses an unknown event, an incident that is not built, and anything that is not a message', async () => {
    const { points, COUNTS } = dataset()
    const bodies = [
      JSON.stringify({ event: 'VISITED', station: 'kyc' }),
      JSON.stringify({ event: 'FINISHED', station: 'deposits' }),
      JSON.stringify({ event: 'FINISHED' }),
      'FINISHED kyc',
      '[]',
    ]
    for (const body of bodies) {
      const response = await handle(post(body), { COUNTS })
      expect(response.status, body).toBe(400)
    }
    expect(points).toEqual([])
  })

  test('keeps a from tag only if it is plain words, so nothing else can be stored', async () => {
    const { points, COUNTS } = dataset()
    const odd = JSON.stringify({ event: 'STARTED', station: 'payments', from: 'Mail me at x@y.z' })
    await handle(post(odd), { COUNTS })
    expect(points).toEqual([{ indexes: ['payments'], blobs: ['STARTED', ''], doubles: [1] }])
  })

  test('refuses a long message before reading it, and every method but POST', async () => {
    const { points, COUNTS } = dataset()
    const long = await handle(post('x'.repeat(5000)), { COUNTS })
    const get = await handle(new Request(`${LIVE_ORIGIN}${COUNT_PATH}`), { COUNTS })
    const otherAddress = new Request(`${LIVE_ORIGIN}/api/other`, {
      method: 'POST',
      headers: { Origin: LIVE_ORIGIN },
    })
    const other = await handle(otherAddress, { COUNTS })
    expect([long.status, get.status, other.status]).toEqual([413, 405, 404])
    expect(get.headers.get('Allow')).toBe('POST')
    expect(points).toEqual([])
  })
})
