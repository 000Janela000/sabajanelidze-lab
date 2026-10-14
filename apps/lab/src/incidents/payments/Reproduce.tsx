import {
  type MoneyPicture,
  moneyPicture,
  Race,
  type WithdrawResult,
  type WithdrawStatus,
  withdrawV01,
} from '@lab/core'
import { useState } from 'preact/hooks'
import { CodePanel } from '../../game/CodePanel.tsx'
import { MoneyPanel } from '../../game/MoneyPanel.tsx'
import { REQUEST_STATE, type RequestState } from '../../game/request-state.ts'
import type { CodeLine } from '../../lib/code-line.ts'
import { AMOUNT, CUSTOMER, OPENING } from './setup.ts'
import { MONEY_TEXT, REPRODUCE, REQUEST_STATE_TEXT, STEP_TEXT } from './texts.ts'

const NAMES = ['A', 'B'] as const
type Name = (typeof NAMES)[number]

interface Playback {
  readonly current: Record<Name, number | null>
  readonly state: Record<Name, RequestState>
  readonly picture: MoneyPicture
  readonly final: boolean
}

const START: Playback = {
  current: { A: null, B: null },
  state: { A: REQUEST_STATE.READY, B: REQUEST_STATE.READY },
  picture: { deposited: OPENING, available: OPENING, held: 0, paidOut: 0, lost: 0 },
  final: false,
}

/** How a finished request shows on its panel. */
const FINISHED_STATE: Record<WithdrawStatus, RequestState> = {
  PAID: REQUEST_STATE.PAID,
  REFUSED: REQUEST_STATE.REFUSED,
  UNKNOWN: REQUEST_STATE.UNKNOWN,
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function stepDelay(): number {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0
  const value = getComputedStyle(document.documentElement).getPropertyValue('--step-delay')
  return Number.parseInt(value, 10) || 350
}

/** The next code line after `from` that waits at this step. */
function lineFor(lines: readonly CodeLine[], step: string | null, from: number | null): number | null {
  if (step === null) return from
  const start = from === null ? 0 : from + 1
  const index = lines.findIndex((line, i) => i >= start && line.step === step)
  return index === -1 ? from : index
}

/** Step 1: the visitor picks where request A gets slow, and two copies of the real build v0.1 run. */
export function Reproduce(props: {
  lines: readonly CodeLine[]
  onReproduced: (tries: number) => void
  onNext: () => void
}) {
  const [playback, setPlayback] = useState<Playback>(START)
  const [picked, setPicked] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [tries, setTries] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [found, setFound] = useState(false)

  async function replay(afterLine: number) {
    const attempt = tries + 1
    setTries(attempt)
    setPicked(afterLine)
    setRunning(true)
    const delay = stepDelay()
    const race = await Race.start({ withdraw: withdrawV01, opening: OPENING, amounts: [AMOUNT, AMOUNT] })
    const current: Record<Name, number | null> = { A: null, B: null }
    const taken: Record<Name, number> = { A: -1, B: -1 }
    let slow: Name | null = null

    const show = (final = false) => {
      const state = {} as Record<Name, RequestState>
      for (const name of NAMES) {
        const steps = race.scheduler.trace.filter((line) => line.requestId === name).length
        if (steps !== taken[name]) {
          taken[name] = steps
          current[name] = lineFor(props.lines, race.scheduler.waitingAt(name), current[name])
        }
        const result = race.scheduler.result(name)
        state[name] = result?.ok
          ? FINISHED_STATE[(result.value as WithdrawResult).status]
          : slow === name
            ? REQUEST_STATE.SLOW
            : steps > 0
              ? REQUEST_STATE.RUNNING
              : REQUEST_STATE.READY
      }
      setPlayback({
        current: { ...current },
        state,
        picture: moneyPicture(race.store, race.bank, CUSTOMER, OPENING),
        final,
      })
    }

    show()
    for (let line = 0; line < afterLine; line++) {
      await sleep(delay)
      await race.step('A')
      show()
    }
    slow = 'A'
    show()
    for (;;) {
      await sleep(delay)
      if (!(await race.step('B'))) break
      show()
    }
    slow = null
    while (!race.done) {
      await sleep(delay)
      const next = race.names.find((name) => race.scheduler.canAdvance(name))
      if (!next) break
      await race.step(next)
      show()
    }
    show(true)
    setRunning(false)

    const picture = moneyPicture(race.store, race.bank, CUSTOMER, OPENING)
    if (picture.lost !== 0) {
      setAnnouncement(REPRODUCE.lost(afterLine, picture.paidOut, picture.available, Math.abs(picture.lost)))
      setFound(true)
      props.onReproduced(attempt)
    } else {
      setAnnouncement(REPRODUCE.safe(afterLine))
    }
  }

  const panelTexts = (name: Name) => ({
    title: REPRODUCE.requestTitle(name),
    state: REQUEST_STATE_TEXT,
    step: STEP_TEXT,
    pickLabel: (line: number, step: string) => REPRODUCE.pickLabel(name, line, step),
    compactNote: REPRODUCE.compactNote,
  })

  return (
    <section class="stage">
      <p class="goal">{REPRODUCE.goal}</p>
      <div class="board">
        <div class="requests">
          <div class="request-with-hint">
            {tries === 0 ? (
              <p class="first-move-hint" role="note">
                {REPRODUCE.hint}
              </p>
            ) : null}
            <CodePanel
              id="A"
              lines={props.lines}
              current={playback.current.A}
              state={playback.state.A}
              texts={panelTexts('A')}
              onPick={running ? undefined : replay}
              picked={picked}
              hinting={tries === 0}
            />
          </div>
          <CodePanel
            id="B"
            lines={props.lines}
            current={playback.current.B}
            state={playback.state.B}
            texts={panelTexts('B')}
            compact
          />
        </div>
        <div class="outcome">
          <MoneyPanel picture={playback.picture} final={playback.final} texts={MONEY_TEXT} />
          <p class="announce" aria-live="polite">
            {announcement}
          </p>
        </div>
      </div>
      {found ? (
        <button type="button" class="button primary" onClick={props.onNext}>
          {REPRODUCE.next}
        </button>
      ) : null}
    </section>
  )
}
