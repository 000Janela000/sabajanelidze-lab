import {
  ANNA,
  type Applicant,
  annaMessages,
  type EventResult,
  handleEventV01,
  KYC_STATUS,
  type KycStatus,
  lostAnswerNight,
  MemoryKycStore,
  MemoryRefusalLog,
  PROVIDER_TEST_KEY,
  type ProviderEvent,
  signatureCheck,
} from '@lab/core'
import type { RefObject } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { IndentedCode } from '../../game/CodeText.tsx'
import { FIND_THE_BUG, FIND_THE_BUG_PENDING } from '../../game/find-the-bug.ts'
import { type Said, TONE } from '../../game/Message.tsx'
import type { PauseGate } from '../../game/pause-gate.ts'
import { READOUT_TONE, type ReadoutCell } from '../../game/Readout.tsx'
import { ScrollBox } from '../../game/ScrollBox.tsx'
import type { CodeLine } from '../../lib/code-line.ts'
import { CUT, type CutId, type Reproduction } from './setup.ts'
import { CONSOLE, READOUT, REPRODUCE, RESULT_TEXT, STATUS_TEXT } from './texts.ts'

/** How long one arrival takes to draw while a night plays (four arrivals: well under the 5-second rule). */
const ROW_MS = 420

export const PHASE = {
  DEMO: 'DEMO',
  CHOOSE: 'CHOOSE',
  RUN: 'RUN',
  DIAGNOSE: 'DIAGNOSE',
  DONE: 'DONE',
} as const
type Phase = (typeof PHASE)[keyof typeof PHASE]

/** The most arrivals a night can have: two messages, and a copy of each. */
const SLOTS = 4

/** One message arriving at our server, what build v0.1 did with it, and whether our answer got back. */
export interface Arrival {
  readonly version: number
  readonly status: KycStatus
  /** A copy the provider sent again, because our answer to the first was lost. */
  readonly again: boolean
  /** Our answer reached the provider (false: lost on the way). */
  readonly answered: boolean
  readonly result: EventResult
  readonly after: Applicant
}

/** The arrival that locked Anna out, in a night that did: the copy of #1. */
const isCulprit = (arrival: Arrival) => arrival.again && arrival.version === 1

export interface ReproduceGame {
  readonly phase: Phase
  readonly arrivals: readonly Arrival[]
  readonly applicant: Applicant | null
  readonly tries: number
  readonly picked: number | null
  readonly lastCut: CutId | null
  readonly running: boolean
  /** Until the first cut: the spotlight is on the cuts. */
  readonly hinting: boolean
  readonly reproduced: boolean
  readonly said: Said | null
  readonly box: RefObject<HTMLDivElement>
  cut(id: CutId): Promise<void>
  pick(index: number): void
  again(): void
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Step 1: the visitor makes the network lose one or both of our answers; the provider sends those messages again,
 * and every arrival runs the real build v0.1. On arrival a normal night plays once, so the diagram shows what it
 * does before anyone reads a word.
 */
export function useReproduce(props: {
  gate: PauseGate
  onPlaying: (playing: boolean) => void
  onReproduced: (reproduction: Reproduction) => void
}): ReproduceGame {
  const [phase, setPhase] = useState<Phase>(PHASE.DEMO)
  const [arrivals, setArrivals] = useState<readonly Arrival[]>([])
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [tries, setTries] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [lastCut, setLastCut] = useState<CutId | null>(null)
  const [running, setRunning] = useState(false)
  const runningNow = useRef(false)
  const started = useRef(false)
  const box = useRef<HTMLDivElement>(null)
  const focusWhenReady = useRef(false)
  const messages = useRef<Promise<ProviderEvent[]> | null>(null)

  /** Plays one night on the real build v0.1, an arrival at a time. */
  async function night(lost: readonly number[]): Promise<Arrival[]> {
    messages.current ??= annaMessages()
    const sent = await messages.current
    const store = new MemoryKycStore([ANNA])
    const ports = { store, signatures: signatureCheck(PROVIDER_TEST_KEY), refusals: new MemoryRefusalLog() }
    const order = lostAnswerNight(sent, lost)
    const played: Arrival[] = []
    setArrivals([])
    setApplicant(null)
    for (const [index, event] of order.entries()) {
      const delay = reducedMotion() ? 0 : ROW_MS
      await sleep(delay)
      await props.gate.wait()
      const result = await handleEventV01(ports, event)
      const again = index >= sent.length
      const after = store.applicant(ANNA)
      const answered = again || !lost.includes(event.version)
      played.push({ version: event.version, status: event.status, again, answered, result, after })
      setArrivals([...played])
      setApplicant(after)
    }
    return played
  }

  async function play(lost: readonly number[], isDemo: boolean, id: CutId | null) {
    if (runningNow.current) return
    runningNow.current = true
    started.current = true
    setRunning(true)
    props.onPlaying(true)
    setPicked(null)
    setLastCut(id)
    setPhase(isDemo ? PHASE.DEMO : PHASE.RUN)
    const played = await night(lost)
    runningNow.current = false
    setRunning(false)
    props.onPlaying(false)
    const end = played.at(-1)?.after.status
    const lockedOut = end !== KYC_STATUS.APPROVED
    setPhase(lockedOut ? PHASE.DIAGNOSE : PHASE.CHOOSE)
    requestAnimationFrame(() => {
      const target = lockedOut
        ? box.current?.querySelector<HTMLButtonElement>('.n-pick')
        : focusWhenReady.current
          ? firstCut(box.current)
          : null
      focusWhenReady.current = false
      target?.focus()
    })
  }

  async function cut(id: CutId) {
    if (runningNow.current || (phase !== PHASE.CHOOSE && phase !== PHASE.DONE)) return
    const attempt = tries + 1
    setTries(attempt)
    await play(CUT[id], false, id)
  }

  function pick(index: number) {
    if (phase !== PHASE.DIAGNOSE) return
    const arrival = arrivals[index]
    if (!arrival) return
    setPicked(index)
    const right = isCulprit(arrival)
    if (right) {
      setPhase(PHASE.DONE)
      props.onReproduced({ tries })
    }
  }

  function again() {
    if (runningNow.current) return
    setArrivals([])
    setApplicant(null)
    setPicked(null)
    setLastCut(null)
    setPhase(PHASE.CHOOSE)
    requestAnimationFrame(() => firstCut(box.current)?.focus())
  }

  // On arrival: one normal night plays by itself, once the console is on screen (on phones it starts below the
  // ticket). With reduced motion it shows its last frame at once.
  useEffect(() => {
    const start = () => {
      if (started.current) return
      void play([], true, null)
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

  // "Find the bug": once the console has been seen and no night plays, focus the first cut (now, or when it ends).
  useEffect(() => {
    const root = document.documentElement
    const onFind = (event: Event) => {
      root.removeAttribute(FIND_THE_BUG_PENDING)
      if (!started.current || runningNow.current) {
        if (started.current) event.preventDefault()
        focusWhenReady.current = true
        return
      }
      event.preventDefault()
      firstCut(box.current)?.focus()
    }
    window.addEventListener(FIND_THE_BUG, onFind)
    const missed = root.hasAttribute(FIND_THE_BUG_PENDING)
    if (missed) {
      root.removeAttribute(FIND_THE_BUG_PENDING)
      focusWhenReady.current = true
    }
    return () => window.removeEventListener(FIND_THE_BUG, onFind)
  }, [])

  const pickedArrival = picked === null ? null : arrivals[picked]
  const said: Said | null =
    phase === PHASE.DONE
      ? { tone: TONE.LOST, lead: REPRODUCE.lostLead(tries), text: REPRODUCE.lost }
      : phase === PHASE.DIAGNOSE
        ? pickedArrival
          ? {
              tone: TONE.NONE,
              text:
                pickedArrival.status === KYC_STATUS.APPROVED ? REPRODUCE.wrongApproved : REPRODUCE.wrongFirst,
            }
          : { tone: TONE.LOST, ...REPRODUCE.diagnose }
        : phase === PHASE.RUN
          ? { tone: TONE.NONE, text: REPRODUCE.running }
          : phase === PHASE.DEMO
            ? { tone: TONE.NONE, text: REPRODUCE.demoLead }
            : lastCut === 'TWO'
              ? { tone: TONE.OK, ...REPRODUCE.safeTwo }
              : lastCut === 'BOTH'
                ? { tone: TONE.OK, ...REPRODUCE.safeBoth }
                : { tone: TONE.NONE, text: REPRODUCE.demoDone }

  return {
    phase,
    arrivals,
    applicant,
    tries,
    picked,
    lastCut,
    running,
    hinting: phase === PHASE.CHOOSE && tries === 0,
    reproduced: phase === PHASE.DONE,
    said,
    box,
    cut,
    pick,
    again,
  }
}

function firstCut(scene: HTMLElement | null): HTMLButtonElement | null {
  return scene?.querySelector<HTMLButtonElement>('.n-cut') ?? null
}

/** Everything step 1 can say, so the message keeps one height whatever comes. */
export const REPRODUCE_SIZERS: readonly Said[] = [
  { tone: TONE.LOST, lead: REPRODUCE.lostLead(8), text: REPRODUCE.lost },
  { tone: TONE.OK, ...REPRODUCE.safeTwo },
  { tone: TONE.OK, ...REPRODUCE.safeBoth },
  { tone: TONE.NONE, text: REPRODUCE.wrongFirst },
  { tone: TONE.NONE, text: REPRODUCE.wrongApproved },
  { tone: TONE.NONE, text: REPRODUCE.demoDone },
]

/** The night as a sequence diagram: the provider left, our server right, time running down. */
export function NightView(props: { game: ReproduceGame }) {
  const { game } = props
  const diagnosing = game.phase === PHASE.DIAGNOSE
  const done = game.phase === PHASE.DONE
  const choosing = game.phase === PHASE.CHOOSE || done
  const slots = Array.from({ length: SLOTS }, (_, index) => game.arrivals[index] ?? null)
  return (
    <div ref={game.box} class={`n-scene${diagnosing ? ' is-diagnosing' : ''}`}>
      <div class="n-heads" aria-hidden="true">
        <span>{REPRODUCE.provider}</span>
        <span>{REPRODUCE.server}</span>
      </div>
      <ol class="n-rows" aria-label={REPRODUCE.nightLabel}>
        {slots.map((arrival, index) => {
          if (!arrival) {
            // The first row the night left free holds the stamp, beside the arrival that locked Anna out.
            const stamp = (diagnosing || done) && index === game.arrivals.length
            return (
              <li key={index} class="n-row is-empty" aria-hidden="true">
                {stamp ? <span class="m-stamp n-stamp on">{CONSOLE.stamp}</span> : null}
              </li>
            )
          }
          const pickedHere = game.picked === index
          const culprit = done && isCulprit(arrival)
          const wrong = pickedHere && !isCulprit(arrival)
          const label = REPRODUCE.arrival(arrival.version, STATUS_TEXT[arrival.status], arrival.again)
          const body = (
            <>
              <span class="n-line n-in" aria-hidden="true" />
              <span class="n-label">{label}</span>
              <span class="n-result">
                {culprit
                  ? REPRODUCE.reveal
                  : REPRODUCE.result(RESULT_TEXT[arrival.result], STATUS_TEXT[arrival.after.status])}
              </span>
              <span class={`n-line n-back${arrival.answered ? '' : ' is-lost'}`} aria-hidden="true" />
              <span class="n-answer">
                {arrival.answered ? REPRODUCE.answer(arrival.version, arrival.again) : REPRODUCE.answerLost}
              </span>
            </>
          )
          const classes = ['n-row', culprit ? 'is-culprit' : '', wrong ? 'is-wrong' : '']
          return (
            <li key={index} class={classes.filter(Boolean).join(' ')}>
              {diagnosing || done ? (
                <button
                  type="button"
                  class="n-pick"
                  aria-label={REPRODUCE.pickLabel(arrival.version, arrival.again)}
                  aria-disabled={done ? 'true' : undefined}
                  onClick={() => game.pick(index)}
                >
                  {body}
                </button>
              ) : (
                <div class="n-pick">{body}</div>
              )}
            </li>
          )
        })}
      </ol>
      <fieldset
        class={`n-moves${choosing || game.running ? '' : ' is-off'}`}
        inert={!(choosing || game.running)}
      >
        <legend class="visually-hidden">{REPRODUCE.cutsLabel}</legend>
        <span class="n-your-move" aria-hidden="true">
          {REPRODUCE.yourMove}
        </span>
        {(['ONE', 'TWO', 'BOTH'] as const).map((id) => (
          <button
            key={id}
            type="button"
            class="btn n-cut"
            aria-pressed={game.lastCut === id}
            aria-disabled={game.running ? 'true' : undefined}
            onClick={() => void game.cut(id)}
          >
            <span aria-hidden="true">✂ </span>
            <span aria-hidden="true">{REPRODUCE.cutShort[id]}</span>
            <span class="visually-hidden">
              {id === 'ONE' ? REPRODUCE.cut(1) : id === 'TWO' ? REPRODUCE.cut(2) : REPRODUCE.cutBoth}
            </span>
          </button>
        ))}
      </fieldset>
    </div>
  )
}

/** The real code build v0.1 runs for each message. */
export function CodeView(props: { lines: readonly CodeLine[]; label: string }) {
  return (
    <ScrollBox label={props.label} moreText={CONSOLE.more}>
      <ol class="pcode">
        {props.lines.map((line, index) => (
          <li key={index} class="pl">
            <IndentedCode tokens={line.tokens} />
          </li>
        ))}
      </ol>
    </ScrollBox>
  )
}

/**
 * Anna's record: what the provider decided, what our server holds, and whether she can trade. Red only once a night
 * has ended with her not approved: halfway through a night, "pending" is just the first message.
 */
export function reproduceCells(applicant: Applicant | null, final: boolean): ReadoutCell[] {
  const status = applicant?.status ?? null
  const approved = status === KYC_STATUS.APPROVED
  const lockedOut = final && status !== null && !approved
  return [
    {
      label: READOUT.reproduce.provider,
      value: `${STATUS_TEXT.APPROVED} · v2`,
      short: STATUS_TEXT.APPROVED,
      wide: true,
    },
    {
      label: READOUT.reproduce.ours,
      value: applicant && status ? `${STATUS_TEXT[status]} · v${applicant.version}` : READOUT.empty,
      short: status ? STATUS_TEXT[status] : READOUT.empty,
      tone: lockedOut ? READOUT_TONE.LOST : approved ? READOUT_TONE.SAFE : READOUT_TONE.PENDING,
      wide: true,
    },
    {
      label: READOUT.reproduce.canTrade,
      value: status ? (approved ? READOUT.reproduce.yes : READOUT.reproduce.no) : READOUT.empty,
      tone: lockedOut ? READOUT_TONE.LOST : READOUT_TONE.PLAIN,
    },
  ]
}
