import {
  formatCents,
  type MoneyPicture,
  moneyPicture,
  Race,
  STEP,
  type WithdrawResult,
  type WithdrawStatus,
  withdrawV01,
} from '@lab/core'
import type { RefObject } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { CodePanel, type CodePanelTexts } from '../../game/CodePanel.tsx'
import { FIND_THE_BUG } from '../../game/find-the-bug.ts'
import { type Said, TONE } from '../../game/Message.tsx'
import type { PauseGate } from '../../game/pause-gate.ts'
import { LANE_STATE, type Lane, RaceFigure } from '../../game/RaceFigure.tsx'
import { READOUT_TONE, type ReadoutCell } from '../../game/Readout.tsx'
import { REQUEST_STATE, type RequestState } from '../../game/request-state.ts'
import { ScrollBox } from '../../game/ScrollBox.tsx'
import type { CodeLine } from '../../lib/code-line.ts'
import { AMOUNT, CUSTOMER, OPENING, type Reproduction } from './setup.ts'
import {
  CONSOLE,
  MONEY_TEXT,
  READOUT,
  REPRODUCE,
  REQUEST_STATE_TEXT,
  STEP_SHORT,
  STEP_TEXT,
} from './texts.ts'

const NAMES = ['A', 'B'] as const
type Name = (typeof NAMES)[number]

/** The step after which A gets slow in the run that plays on arrival: a safe one, so it gives nothing away. */
const DEMO_STEP = 1

const DEMO = { PLAYING: 'PLAYING', DONE: 'DONE' } as const
type Demo = (typeof DEMO)[keyof typeof DEMO]

interface Playback {
  readonly lanes: Record<Name, Lane>
  /** The code line each request waits at, for the code view. */
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
  if (step === STEP.SAVE_BALANCE) return short(picture.available)
  if (step === STEP.PAY_OUT) return short(AMOUNT)
  return '✓'
}

/** The longest things step 1 can say (the numbers of this incident are fixed; 88 stands in for any try count). */
export const REPRODUCE_SIZERS: readonly Said[] = [
  {
    tone: TONE.LOST,
    lead: REPRODUCE.lostLead(88),
    text: REPRODUCE.lost(4, AMOUNT * 2, OPENING - AMOUNT, AMOUNT),
  },
  { tone: TONE.OK, text: REPRODUCE.hintAfterSafe(4) },
  { tone: TONE.NONE, text: REPRODUCE.demoDone },
]

/** Lane A's first step button. */
function firstStep(figure: HTMLElement | null): HTMLButtonElement | null {
  return figure?.querySelector<HTMLButtonElement>('.lane-a button') ?? null
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

export interface ReproduceGame {
  readonly playback: Playback
  readonly picked: number | null
  readonly running: boolean
  readonly hinting: boolean
  /** The step after which the bug was reproduced, once it was. */
  readonly losingLine: number | null
  readonly said: Said | null
  readonly box: RefObject<HTMLDivElement>
  readonly lines: readonly CodeLine[]
  play(afterLine: number, isDemo: boolean): Promise<void>
}

/**
 * Step 1: the visitor picks where request A gets slow, and two copies of the real build v0.1 run.
 * On arrival one safe run plays by itself, so the figure shows what it does before anyone reads a word.
 */
export function useReproduce(props: {
  lines: readonly CodeLine[]
  gate: PauseGate
  onPlaying: (playing: boolean) => void
  onReproduced: (reproduction: Reproduction) => void
}): ReproduceGame {
  const [playback, setPlayback] = useState<Playback>(START)
  const [picked, setPicked] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [demo, setDemo] = useState<Demo | null>(null)
  const [tries, setTries] = useState(0)
  const [result, setResult] = useState<{
    lost: boolean
    line: number
    picture: MoneyPicture
    tries: number
  } | null>(null)
  const [losingLine, setLosingLine] = useState<number | null>(null)
  const started = useRef(false)
  const runningNow = useRef(false)
  const box = useRef<HTMLDivElement>(null)
  // "Find the bug" was pressed before or during the first run: focus the first step once that run is over.
  const focusWhenReady = useRef(false)

  async function play(afterLine: number, isDemo: boolean) {
    if (runningNow.current) return
    runningNow.current = true
    // A visitor's own run means the demo is no longer needed.
    if (!isDemo) started.current = true
    const attempt = isDemo ? tries : tries + 1
    if (!isDemo) setTries(attempt)
    setDemo(isDemo ? DEMO.PLAYING : null)
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
      const stepped = await race.step('B')
      if (!stepped) break
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
    runningNow.current = false
    setRunning(false)
    props.onPlaying(false)

    const picture = moneyPicture(race.store, race.bank, CUSTOMER, OPENING)
    const lost = picture.lost !== 0
    if (isDemo) {
      setDemo(DEMO.DONE)
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

  // "Find the bug": once the console has been seen and no run plays, focus lane A's first step (now, or when the
  // run ends). Before that the page scrolls to the console as usual, and the first run starts there.
  useEffect(() => {
    const onFind = (event: Event) => {
      if (!started.current || runningNow.current) {
        if (started.current) event.preventDefault()
        focusWhenReady.current = true
        return
      }
      event.preventDefault()
      firstStep(box.current)?.focus()
    }
    window.addEventListener(FIND_THE_BUG, onFind)
    return () => window.removeEventListener(FIND_THE_BUG, onFind)
  }, [])

  useEffect(() => {
    if (running || !focusWhenReady.current) return
    focusWhenReady.current = false
    firstStep(box.current)?.focus()
  }, [running])

  const lastSafe = result && !result.lost ? result.line : null
  const said: Said | null = result?.lost
    ? {
        tone: TONE.LOST,
        lead: REPRODUCE.lostLead(result.tries),
        text: REPRODUCE.lost(
          result.line,
          result.picture.paidOut,
          result.picture.available,
          Math.abs(result.picture.lost),
        ),
      }
    : lastSafe
      ? { tone: TONE.OK, text: REPRODUCE.hintAfterSafe(lastSafe) }
      : running && demo === null && picked !== null
        ? { tone: TONE.NONE, text: REPRODUCE.running(picked) }
        : demo === DEMO.PLAYING
          ? { tone: TONE.NONE, text: REPRODUCE.demoLead }
          : demo === DEMO.DONE
            ? { tone: TONE.NONE, text: REPRODUCE.demoDone }
            : null

  return {
    playback,
    picked,
    running,
    hinting: demo === DEMO.DONE && tries === 0,
    losingLine,
    said,
    box,
    lines: props.lines,
    play,
  }
}

const STEPS_OF = (lines: readonly CodeLine[]) =>
  lines.flatMap((line) =>
    line.step ? [{ long: STEP_TEXT[line.step], short: STEP_SHORT[line.step] ?? STEP_TEXT[line.step] }] : [],
  )

/** The race: two copies of build v0.1, with a button on each of lane A's steps. */
export function RaceView(props: { game: ReproduceGame }) {
  const { game } = props
  return (
    <div ref={game.box} class="v-race">
      <RaceFigure
        steps={STEPS_OF(game.lines)}
        lanes={game.playback.lanes}
        slowAfter={game.picked}
        lost={game.playback.final && game.playback.picture.lost !== 0}
        texts={{
          figure: REPRODUCE.laneFigure,
          lane: REPRODUCE.lane,
          pickLabel: REPRODUCE.pickLabel,
          slowHere: REPRODUCE.slowHere,
        }}
        onPick={(step) => game.play(step, false)}
        busy={game.running}
        hinting={game.hinting}
      />
    </div>
  )
}

/** The code request A runs, with the line it waits at lit up; each step line is a button too. */
export function CodeView(props: { game: ReproduceGame }) {
  const { game } = props
  return (
    <ScrollBox
      label={CODE_TEXTS.title}
      moreText={CONSOLE.more}
      reveal=".line.current, .line.lost"
      revealKey={`${game.playback.current}-${game.playback.final}`}
    >
      <CodePanel
        id="A"
        lines={game.lines}
        current={game.playback.current}
        state={game.playback.codeState}
        texts={CODE_TEXTS}
        onPick={(step) => game.play(step, false)}
        busy={game.running}
        paused={game.picked}
        pausedLost={game.playback.final && game.playback.picture.lost !== 0}
      />
    </ScrollBox>
  )
}

/** The books as five numbers: our ledger next to the bank's own record. "…" until a run is over. */
export function booksCells(picture: MoneyPicture | null, final: boolean): ReadoutCell[] {
  const tone = picture ? READOUT_TONE.PLAIN : READOUT_TONE.PENDING
  // On a narrow console the amounts lose their cents (as on the race), so five numbers fit one strip.
  const amount = (cents: number) =>
    picture ? { value: formatCents(cents), short: short(cents) } : { value: READOUT.empty }
  const lost = picture ? picture.lost !== 0 : false
  const verdict =
    picture && final
      ? lost
        ? { value: `✗ ${formatCents(Math.abs(picture.lost))}`, short: `✗ ${short(Math.abs(picture.lost))}` }
        : { value: `✓ ${MONEY_TEXT.none}` }
      : { value: MONEY_TEXT.pending }
  return [
    { label: MONEY_TEXT.had, ...amount(picture?.deposited ?? 0), tone },
    { label: MONEY_TEXT.balance, ...amount(picture?.available ?? 0), tone },
    { label: MONEY_TEXT.held, ...amount(picture?.held ?? 0), tone },
    { label: MONEY_TEXT.paidOut, ...amount(picture?.paidOut ?? 0), tone },
    {
      label: MONEY_TEXT.lost,
      ...verdict,
      tone: picture && final ? (lost ? READOUT_TONE.LOST : READOUT_TONE.SAFE) : READOUT_TONE.PENDING,
    },
  ]
}
