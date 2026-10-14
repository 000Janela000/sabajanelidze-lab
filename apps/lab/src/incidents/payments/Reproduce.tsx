import {
  type MoneyPicture,
  moneyPicture,
  Race,
  STEP,
  type WithdrawResult,
  type WithdrawStatus,
  withdrawV01,
} from '@lab/core'
import { useEffect, useRef, useState } from 'preact/hooks'
import { CodePanel, type CodePanelTexts } from '../../game/CodePanel.tsx'
import { MoneyPanel } from '../../game/MoneyPanel.tsx'
import type { PauseGate } from '../../game/pause-gate.ts'
import { LANE_STATE, type Lane, RaceFigure } from '../../game/RaceFigure.tsx'
import { REQUEST_STATE, type RequestState } from '../../game/request-state.ts'
import type { CodeLine } from '../../lib/code-line.ts'
import { AMOUNT, CUSTOMER, OPENING, type Reproduction } from './setup.ts'
import { MONEY_TEXT, REPRODUCE, REQUEST_STATE_TEXT, STEP_SHORT, STEP_TEXT } from './texts.ts'

const NAMES = ['A', 'B'] as const
type Name = (typeof NAMES)[number]

/** The step after which A gets slow in the run that plays on arrival: a safe one, so it gives nothing away. */
const DEMO_STEP = 1

interface Playback {
  readonly lanes: Record<Name, Lane>
  /** The code line each request waits at, for the "show the code" panel. */
  readonly current: number | null
  readonly codeState: RequestState
  readonly picture: MoneyPicture
  readonly final: boolean
}

const EMPTY_LANE: Lane = { done: 0, values: [], state: LANE_STATE.WAITING, result: null, paid: false }

const START: Playback = {
  lanes: { A: EMPTY_LANE, B: EMPTY_LANE },
  current: null,
  codeState: REQUEST_STATE.READY,
  picture: { deposited: OPENING, available: OPENING, held: 0, paidOut: 0, lost: 0 },
  final: false,
}

/** How a finished request shows on the code panel. */
const FINISHED_STATE: Record<WithdrawStatus, RequestState> = {
  PAID: REQUEST_STATE.PAID,
  REFUSED: REQUEST_STATE.REFUSED,
  UNKNOWN: REQUEST_STATE.UNKNOWN,
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function stepDelay(): number {
  if (reducedMotion()) return 0
  const value = getComputedStyle(document.documentElement).getPropertyValue('--step-hold-race')
  return Number.parseInt(value, 10) || 350
}

/** Whole amounts without the cents, so the figure stays narrow on phones. */
function short(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
}

/** What a step shows on the figure once it ran, read from the books right after it. */
function valueAfter(step: string, picture: MoneyPicture): string {
  if (step === STEP.READ_BALANCE) return short(picture.available)
  if (step === STEP.SAVE_BALANCE) return `→ ${short(picture.available)}`
  if (step === STEP.PAY_OUT) return `−${short(AMOUNT)}`
  return '✓'
}

/** The next code line after `from` that waits at this step. */
function lineFor(lines: readonly CodeLine[], step: string | null, from: number | null): number | null {
  if (step === null) return from
  const start = from === null ? 0 : from + 1
  const index = lines.findIndex((line, i) => i >= start && line.step === step)
  return index === -1 ? from : index
}

const CODE_TEXTS: CodePanelTexts = {
  title: REPRODUCE.requestTitle('A'),
  tag: REPRODUCE.tagA,
  state: REQUEST_STATE_TEXT,
  step: STEP_TEXT,
  pickLabel: (line, step) => REPRODUCE.codePickLabel('A', line, step),
  pause: REPRODUCE.pause,
  compactNote: REPRODUCE.compactNote,
  lineState: REPRODUCE.stepState,
}

/**
 * Step 1: the visitor picks where request A gets slow, and two copies of the real build v0.1 run.
 * On arrival one safe run plays by itself, so the figure shows what it does before anyone reads a word.
 */
export function Reproduce(props: {
  lines: readonly CodeLine[]
  gate: PauseGate
  onPlaying: (playing: boolean) => void
  onReproduced: (reproduction: Reproduction) => void
  onNext: () => void
}) {
  const [playback, setPlayback] = useState<Playback>(START)
  const [picked, setPicked] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [demo, setDemo] = useState<'PLAYING' | 'DONE' | null>(null)
  const [tries, setTries] = useState(0)
  const [result, setResult] = useState<{
    lost: boolean
    line: number
    picture: MoneyPicture
    tries: number
  } | null>(null)
  const [losingLine, setLosingLine] = useState<number | null>(null)
  const started = useRef(false)
  const box = useRef<HTMLDivElement>(null)

  const steps = props.lines.flatMap((line) =>
    line.step ? [{ long: STEP_TEXT[line.step], short: STEP_SHORT[line.step] ?? STEP_TEXT[line.step] }] : [],
  )

  async function play(afterLine: number, isDemo: boolean) {
    // A visitor's own run means the demo is no longer needed.
    if (!isDemo) started.current = true
    const attempt = isDemo ? tries : tries + 1
    if (!isDemo) setTries(attempt)
    setDemo(isDemo ? 'PLAYING' : null)
    setPicked(afterLine)
    setRunning(true)
    props.onPlaying(true)
    setResult(null)
    const delay = stepDelay()
    const race = await Race.start({ withdraw: withdrawV01, opening: OPENING, amounts: [AMOUNT, AMOUNT] })
    const values: Record<Name, (string | null)[]> = { A: [], B: [] }
    let codeLine: number | null = null
    let codeSteps = 0
    let slow: Name | null = null

    const show = (final = false) => {
      const picture = moneyPicture(race.store, race.bank, CUSTOMER, OPENING)
      const lanes = {} as Record<Name, Lane>
      for (const name of NAMES) {
        const taken = race.scheduler.trace.filter((line) => line.requestId === name)
        const last = taken.at(-1)
        if (last && values[name].length < taken.length)
          values[name][taken.length - 1] = valueAfter(last.step, picture)
        const finished = race.scheduler.result(name)
        const status = finished?.ok ? (finished.value as WithdrawResult).status : null
        lanes[name] = {
          done: taken.length,
          values: [...values[name]],
          state: status
            ? LANE_STATE.FINISHED
            : slow === name
              ? LANE_STATE.SLOW
              : taken.length > 0
                ? LANE_STATE.RUNNING
                : LANE_STATE.WAITING,
          result: status ? (REPRODUCE.result[status] ?? null) : null,
          paid: status === 'PAID',
        }
      }
      const stepsA = race.scheduler.trace.filter((line) => line.requestId === 'A').length
      if (stepsA !== codeSteps || codeLine === null) {
        codeSteps = stepsA
        codeLine = lineFor(props.lines, race.scheduler.waitingAt('A'), codeLine)
      }
      const finishedA = race.scheduler.result('A')
      setPlayback({
        lanes,
        current: codeLine,
        codeState: finishedA?.ok
          ? FINISHED_STATE[(finishedA.value as WithdrawResult).status]
          : slow === 'A'
            ? REQUEST_STATE.SLOW
            : stepsA > 0
              ? REQUEST_STATE.RUNNING
              : REQUEST_STATE.READY,
        picture,
        final,
      })
    }

    const tick = async () => {
      await sleep(delay)
      await props.gate.wait()
    }

    show()
    for (let line = 0; line < afterLine; line++) {
      await tick()
      await race.step('A')
      show()
    }
    slow = 'A'
    show()
    for (;;) {
      await tick()
      if (!(await race.step('B'))) break
      show()
    }
    slow = null
    while (!race.done) {
      await tick()
      const next = race.names.find((name) => race.scheduler.canAdvance(name))
      if (!next) break
      await race.step(next)
      show()
    }
    show(true)
    setRunning(false)
    props.onPlaying(false)

    const picture = moneyPicture(race.store, race.bank, CUSTOMER, OPENING)
    const lost = picture.lost !== 0
    if (isDemo) {
      setDemo('DONE')
      return
    }
    setResult({ lost, line: afterLine, picture, tries: attempt })
    if (lost) {
      setLosingLine(afterLine)
      props.onReproduced({
        tries: attempt,
        line: afterLine,
        paidOut: picture.paidOut,
        available: picture.available,
        short: Math.abs(picture.lost),
      })
    }
  }

  // On arrival: one safe run plays by itself, once the figure is on screen (on phones it starts below the
  // ticket). With reduced motion it shows its final frame at once.
  useEffect(() => {
    const start = () => {
      if (started.current) return
      started.current = true
      void play(DEMO_STEP, true)
    }
    const element = box.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      start()
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          start()
        }
      },
      { threshold: 0.6 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const lastSafe = result && !result.lost ? result.line : null
  const message = result?.lost ? (
    <>
      <span class="x">✗</span> <b>{REPRODUCE.lostLead(result.tries)}</b>{' '}
      {REPRODUCE.lost(
        result.line,
        result.picture.paidOut,
        result.picture.available,
        Math.abs(result.picture.lost),
      )}
    </>
  ) : result ? (
    <>
      <span class="ok">✓</span> <b>{REPRODUCE.safeLead}</b>{' '}
      {lastSafe ? REPRODUCE.hintAfterSafe(lastSafe) : null}
    </>
  ) : demo === 'PLAYING' ? (
    REPRODUCE.demoLead
  ) : demo === 'DONE' ? (
    REPRODUCE.demoDone
  ) : null

  return (
    <>
      <p class="goal">{REPRODUCE.goal}</p>
      <div ref={box}>
        <RaceFigure
          steps={steps}
          lanes={playback.lanes}
          slowAfter={picked}
          lost={playback.final && playback.picture.lost !== 0}
          texts={{
            figure: REPRODUCE.laneFigure,
            lane: REPRODUCE.lane,
            pickLabel: REPRODUCE.pickLabel,
            slowHere: REPRODUCE.slowHere,
          }}
          onPick={running ? undefined : (step) => play(step, false)}
          hinting={demo === 'DONE' && tries === 0}
        />
      </div>
      <p class="announce" aria-live="polite">
        {message}
      </p>
      <MoneyPanel picture={playback.picture} final={playback.final} texts={MONEY_TEXT} />
      {losingLine !== null ? (
        <div class="next">
          <button type="button" class="btn" onClick={props.onNext} disabled={running}>
            {REPRODUCE.next}
          </button>
          <button type="button" class="link" onClick={() => play(losingLine, false)} disabled={running}>
            {REPRODUCE.replay}
          </button>
        </div>
      ) : null}
      <details class="code-view">
        <summary>{REPRODUCE.showCode}</summary>
        <CodePanel
          id="A"
          lines={props.lines}
          current={playback.current}
          state={playback.codeState}
          texts={CODE_TEXTS}
          onPick={running ? undefined : (step) => play(step, false)}
          paused={picked}
          pausedLost={playback.final && playback.picture.lost !== 0}
        />
      </details>
    </>
  )
}
