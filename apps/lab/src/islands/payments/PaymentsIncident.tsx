import {
  type AllOrdersSummary,
  allOrders,
  formatCents,
  type MoneyPicture,
  moneyPicture,
  pauseAfter,
  Race,
  type Withdraw,
  withdraw,
  withdrawCheckTwice,
  withdrawLockRead,
  withdrawV01,
} from '@lab/core'
import { useRef, useState } from 'preact/hooks'
import type { CodeLine } from '../../lib/code-line.ts'
import { CleanUp } from './CleanUp.tsx'
import { MoneyPanel, OrderGrid, RequestPanel, type RequestState } from './parts.tsx'
import './incident.css'

const OPENING = 10000
const AMOUNT = 8000
const NAMES = ['A', 'B'] as const
type Name = (typeof NAMES)[number]

export type PatchId = 'check-twice' | 'lock-read' | 'reserve'

const PATCH_CODE: Record<PatchId, Withdraw> = {
  'check-twice': withdrawCheckTwice,
  'lock-read': withdrawLockRead,
  reserve: withdraw,
}

export interface PatchOption {
  readonly id: PatchId
  readonly name: string
  readonly summary: string
  readonly lines: readonly CodeLine[]
}

interface Props {
  readonly v01: readonly CodeLine[]
  /** How many distinct ways build v0.1 can run, computed from the code at build time. */
  readonly runs: number
  readonly patches: readonly PatchOption[]
  readonly shareUrl: string
  readonly bookUrl: string
  readonly proofId: string
}

type Stage = 'reproduce' | 'guess' | 'fix' | 'solved'

interface Playback {
  readonly requests: Record<Name, RequestState>
  readonly picture: MoneyPicture
  readonly final: boolean
}

const startPicture: MoneyPicture = { deposited: OPENING, available: OPENING, held: 0, paidOut: 0, lost: 0 }
const idle: Playback = {
  requests: { A: { line: null, status: 'waiting' }, B: { line: null, status: 'waiting' } },
  picture: startPicture,
  final: false,
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function stepDelay(): number {
  if (typeof window === 'undefined') return 0
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0
  const value = getComputedStyle(document.documentElement).getPropertyValue('--step-delay')
  return Number.parseInt(value, 10) || 350
}

/** Finds the code line a request waits at: the next line after `from` with the same step label. */
function lineFor(lines: readonly CodeLine[], label: string | null, from: number | null): number | null {
  if (label === null) return from
  const start = from === null ? 0 : from + 1
  const index = lines.findIndex((line, i) => i >= start && line.step === label)
  return index === -1 ? from : index
}

export function PaymentsIncident(props: Props) {
  const [stage, setStage] = useState<Stage>('reproduce')
  const [picked, setPicked] = useState<number | null>(null)
  const [playback, setPlayback] = useState<Playback>(idle)
  const [running, setRunning] = useState(false)
  const [tries, setTries] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [guess, setGuess] = useState('')
  const [summary, setSummary] = useState<AllOrdersSummary | null>(null)
  const [patchChoice, setPatchChoice] = useState<PatchId | null>(null)
  const [patchResult, setPatchResult] = useState<{
    id: PatchId
    summary: AllOrdersSummary
    losingLine: number | null
  } | null>(null)
  const [patchTries, setPatchTries] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)
  const stageHeading = useRef<HTMLHeadingElement>(null)

  async function replay(afterLine: number) {
    setPicked(afterLine)
    setRunning(true)
    setTries((count) => count + 1)
    const delay = stepDelay()
    const race = await Race.start({ withdraw: withdrawV01, opening: OPENING, amounts: [AMOUNT, AMOUNT] })
    const lines: Record<Name, number | null> = { A: null, B: null }
    const taken: Record<Name, number> = { A: -1, B: -1 }
    const slow: Record<Name, boolean> = { A: false, B: false }

    const show = (final = false) => {
      const requests = {} as Record<Name, RequestState>
      for (const name of NAMES) {
        const result = race.scheduler.result(name)
        const steps = race.scheduler.trace.filter((line) => line.requestId === name).length
        if (steps !== taken[name]) {
          taken[name] = steps
          lines[name] = lineFor(props.v01, race.scheduler.waitingAt(name), lines[name])
        }
        const status: RequestState['status'] = result?.ok
          ? (result.value as { status: 'paid' | 'refused' | 'unknown' }).status
          : slow[name]
            ? 'slow'
            : 'waiting'
        requests[name] = { line: lines[name], status }
      }
      setPlayback({ requests, picture: moneyPicture(race.store, race.bank, '42', OPENING), final })
    }

    show()
    for (let line = 0; line < afterLine; line++) {
      await sleep(delay)
      await race.step('A')
      show()
    }
    slow.A = true
    show()
    for (;;) {
      await sleep(delay)
      if (!(await race.step('B'))) break
      show()
    }
    slow.A = false
    while (!race.done) {
      await sleep(delay)
      const next = race.names.find((name) => race.scheduler.canAdvance(name))
      if (!next) break
      await race.step(next)
      show()
    }
    show(true)
    setRunning(false)

    const picture = moneyPicture(race.store, race.bank, '42', OPENING)
    if (picture.lost !== 0) {
      setAnnouncement(
        `Reproduced. With request A slow after line ${afterLine}, the bank paid out ${formatCents(picture.paidOut)} and the balance still shows ${formatCents(picture.available)}. The exchange is ${formatCents(Math.abs(picture.lost))} short.`,
      )
    } else {
      setAnnouncement(`No money lost with request A slow after line ${afterLine}. Try another line.`)
    }
  }

  async function runAllOrders() {
    setRunning(true)
    setSummary(await allOrders(withdrawV01, OPENING, AMOUNT))
    setRunning(false)
  }

  async function attackPatch() {
    if (!patchChoice) return
    setRunning(true)
    setPatchTries((count) => count + 1)
    const code = PATCH_CODE[patchChoice]
    const result = await allOrders(code, OPENING, AMOUNT)
    let losingLine: number | null = null
    if (result.losing > 0) {
      for (let line = 1; line <= result.linesPerRequest; line++) {
        if ((await pauseAfter(code, OPENING, AMOUNT, line)).picture.lost !== 0) {
          losingLine = line
          break
        }
      }
    }
    setPatchResult({ id: patchChoice, summary: result, losingLine })
    setRunning(false)
    if (result.losing === 0) goTo('solved')
  }

  function goTo(next: Stage) {
    setStage(next)
    requestAnimationFrame(() => stageHeading.current?.focus())
  }

  function openProof() {
    const proof = document.getElementById(props.proofId)
    if (proof instanceof HTMLDetailsElement) {
      proof.open = true
      proof.scrollIntoView({ block: 'start' })
      proof.querySelector('summary')?.focus()
    }
  }

  const found = playback.final && playback.picture.lost !== 0
  const shareText = summary
    ? [
        'On call · Incident 1: the bank paid out twice',
        `Reproduced the race on try ${tries}`,
        `Guessed ${guess || '?'} · ${summary.losing} of ${summary.runs} ways to run lose money`,
        `Fixed with "reserve, then settle" after ${patchTries} ${patchTries === 1 ? 'try' : 'tries'}`,
        grid(summary),
        props.shareUrl,
      ].join('\n')
    : ''

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
    } catch {
      setCopied('failed')
    }
  }

  return (
    <div class="incident">
      <ol class="beats" aria-label="Steps of this incident">
        <li class={stage === 'reproduce' ? 'beat-current' : 'beat-done'}>1 · Reproduce</li>
        <li class={stage === 'guess' ? 'beat-current' : stage === 'reproduce' ? '' : 'beat-done'}>
          2 · Count
        </li>
        <li class={stage === 'fix' ? 'beat-current' : stage === 'solved' ? 'beat-done' : ''}>3 · Fix</li>
      </ol>

      {stage === 'reproduce' || stage === 'guess' ? (
        <>
          <h2 ref={stageHeading} tabIndex={-1}>
            {stage === 'reproduce' ? 'Reproduce it' : 'How often does it happen?'}
          </h2>
          {stage === 'reproduce' ? (
            <p class="goal">
              Two copies of this withdrawal of 80 run at the same moment.{' '}
              <strong>Tap the line after which request A gets slow</strong> (a network lag). Then B runs, then
              A finishes. Find where the slowness makes the bank pay out 160.
            </p>
          ) : null}
          <div class="board">
            <div class="requests">
              <RequestPanel
                name="A"
                lines={props.v01}
                state={playback.requests.A}
                onPick={stage === 'reproduce' && !running ? replay : undefined}
                picked={picked}
              />
              <RequestPanel name="B" lines={props.v01} state={playback.requests.B} compact />
            </div>
            <div class="outcome">
              <MoneyPanel picture={playback.picture} final={playback.final} />
              <p class="announce" aria-live="polite">
                {announcement}
              </p>
            </div>
          </div>
          {stage === 'reproduce' && found ? (
            <button type="button" class="button primary" onClick={() => goTo('guess')}>
              Next: how often does this happen?
            </button>
          ) : null}
        </>
      ) : null}

      {stage === 'guess' ? (
        <section class="guess">
          <p>
            The two requests can run in <strong>{props.runs}</strong> different ways (different orders of
            their steps). How many of them lose money?
          </p>
          <div class="guess-row">
            <label>
              Your guess
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={props.runs}
                value={guess}
                onInput={(event) => setGuess((event.target as HTMLInputElement).value)}
              />
            </label>
            <button type="button" class="button primary" disabled={running} onClick={runAllOrders}>
              Run all {props.runs}
            </button>
          </div>
          {summary ? (
            <>
              <OrderGrid
                outcomes={summary.outcomes}
                label={`${summary.losing} of ${summary.runs} ways to run lose money${guess ? ` (your guess: ${guess})` : ''}. Build v0.1 loses money whenever both requests read the balance before either one saves.`}
              />
              <button type="button" class="button primary" onClick={() => goTo('fix')}>
                Next: fix it
              </button>
            </>
          ) : null}
        </section>
      ) : null}

      {stage === 'fix' ? (
        <section class="fix">
          <h2 ref={stageHeading} tabIndex={-1}>
            Fix it
          </h2>
          <p class="goal">
            Pick a patch. The machine will attack it with <strong>every</strong> order of events.
          </p>
          <fieldset class="patches">
            <legend class="visually-hidden">Patches</legend>
            {props.patches.map((patch) => (
              <label key={patch.id} class={`patch${patchChoice === patch.id ? ' patch-chosen' : ''}`}>
                <input
                  type="radio"
                  name="patch"
                  value={patch.id}
                  checked={patchChoice === patch.id}
                  onChange={() => setPatchChoice(patch.id)}
                />
                <span class="patch-name">{patch.name}</span>
                <span class="patch-summary">{patch.summary}</span>
                <details>
                  <summary>Show the code</summary>
                  <pre>
                    <code>{patch.lines.map((line) => line.text).join('\n')}</code>
                  </pre>
                </details>
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            class="button primary"
            disabled={!patchChoice || running}
            onClick={attackPatch}
          >
            Attack this patch
          </button>
          {patchResult && patchResult.summary.losing > 0 ? (
            <div class="patch-result" aria-live="polite">
              <OrderGrid
                outcomes={patchResult.summary.outcomes}
                label={`Still loses money in ${patchResult.summary.losing} of ${patchResult.summary.runs} ways to run${patchResult.losingLine ? `, for example when A gets slow after line ${patchResult.losingLine}` : ''}.`}
              />
              <p>The gap between reading and saving is still open. Try another patch.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {stage === 'solved' && patchResult && summary ? (
        <section class="solved">
          <h2 ref={stageHeading} tabIndex={-1}>
            Fixed: it holds in all {patchResult.summary.runs} ways to run
          </h2>
          <OrderGrid
            outcomes={patchResult.summary.outcomes}
            label={`"Reserve, then settle" loses money in 0 of ${patchResult.summary.runs} ways to run.`}
          />
          <p>
            The check and the move are now <strong>one atomic step</strong>: "move 80 from available to on
            hold, only if 80 is there". A second request can never reserve money the first one already holds.
          </p>
          <div class="actions">
            <button type="button" class="button primary" onClick={openProof}>
              Read the code and the tests
            </button>
            <a class="button" href={props.bookUrl}>
              Book a call
            </a>
            <button type="button" class="button" onClick={() => copy(shareText, 'result')}>
              {copied === 'result' ? 'Copied ✓' : 'Copy result'}
            </button>
            <button type="button" class="button" onClick={() => copy(props.shareUrl, 'link')}>
              {copied === 'link' ? 'Link copied ✓' : 'Send this to your CTO'}
            </button>
          </div>
          {copied === 'failed' ? (
            <p class="note">Copying didn't work here. The link: {props.shareUrl}</p>
          ) : null}
          <CleanUp />
        </section>
      ) : null}
    </div>
  )
}

/** Every run as one emoji square, 10 per row, for the shared result. */
function grid(summary: AllOrdersSummary): string {
  const cells = summary.outcomes.map((outcome) => (outcome.picture.lost !== 0 ? '🟥' : '🟩'))
  const rows: string[] = []
  for (let index = 0; index < cells.length; index += 10) rows.push(cells.slice(index, index + 10).join(''))
  return rows.join('\n')
}
