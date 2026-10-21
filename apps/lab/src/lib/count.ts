/*
 * The page side of the cookie-free counter (decisions/0002-cookie-free-counter.md). Each event is sent at most once
 * per page visit, as a few words: what happened, in which incident, and the visit's `from` tag. Nothing is stored on
 * the device and nothing is sent about the visitor.
 */
import {
  COUNT_EVENT,
  COUNT_PATH,
  type CountEvent,
  type CountMessage,
  fromTag,
  LIVE_ORIGIN,
} from './count-codes.ts'
import { REPO_URL } from './links.ts'

/** The browser tests turn counting on with this flag (they run on a local address, in an automated browser). */
interface TestWindow {
  labCountForTests?: boolean
}

const sent = new Set<string>()

/** Counting runs only on the live site, and never in an automated browser (our own tests, most bots). */
function counting(): boolean {
  const forTests = (window as TestWindow).labCountForTests === true
  if (forTests) return true
  const live = location.origin === LIVE_ORIGIN
  return live && !navigator.webdriver
}

/** Counts this event for this incident, once per page visit. */
export function countEvent(event: CountEvent, station: string): void {
  const key = `${station}:${event}`
  if (sent.has(key) || !counting()) return
  sent.add(key)
  const message: CountMessage = { event, station, from: fromTag(location.search) }
  navigator.sendBeacon(COUNT_PATH, JSON.stringify(message))
}

/** Counts the first click (or middle click) on a link to the code on GitHub, anywhere on the page. */
export function countCodeClicks(station: string): void {
  const onClick = (event: MouseEvent) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (link?.getAttribute('href')?.startsWith(REPO_URL)) countEvent(COUNT_EVENT.CODE_CLICK, station)
  }
  document.addEventListener('click', onClick)
  document.addEventListener('auxclick', onClick)
}
