import { type AllRunsSummary, allRuns, formatCents, withdrawV01 } from '@lab/core'
import { useState } from 'preact/hooks'
import { type Said, TONE } from '../../game/Message.tsx'
import { READOUT_TONE, type ReadoutCell } from '../../game/Readout.tsx'
import { RunGrid } from '../../game/RunGrid.tsx'
import { AMOUNT, OPENING, type Reproduction } from './setup.ts'
import { COUNT, READOUT } from './texts.ts'

/** The longest things step 2 can say (a guess has at most two digits). */
export function countSizers(runs: number): Said[] {
  return [
    { tone: TONE.LOST, text: COUNT.result(runs, runs, '88') },
    { tone: TONE.NONE, text: COUNT.prompt(runs) },
  ]
}

/** Only digits, at most as many as the number of runs has, and never more than the number of runs. */
function cleanGuess(text: string, runs: number): string {
  const digits = text.replace(/\D/g, '').slice(0, String(runs).length)
  if (digits === '') return ''
  const value = Math.min(Number(digits), runs)
  return String(value)
}

export interface CountGame {
  readonly guess: string
  readonly summary: AllRunsSummary | null
  readonly running: boolean
  readonly said: Said
  /** Keeps only a valid guess and returns it. */
  setGuess(text: string): string
  run(): Promise<void>
}

/** Step 2: guess, then the machine runs build v0.1 every way it can run. */
export function useCount(props: { runs: number }): CountGame {
  const [guess, setGuess] = useState('')
  const [summary, setSummary] = useState<AllRunsSummary | null>(null)
  const [running, setRunning] = useState(false)

  async function run() {
    if (running || summary) return
    setRunning(true)
    const result = await allRuns(withdrawV01, OPENING, AMOUNT)
    setSummary(result)
    setRunning(false)
  }

  const said: Said = summary
    ? { tone: TONE.LOST, text: COUNT.result(summary.losing, summary.runs, guess) }
    : { tone: TONE.NONE, text: COUNT.prompt(props.runs) }

  function setCleanGuess(text: string): string {
    const cleaned = cleanGuess(text, props.runs)
    setGuess(cleaned)
    return cleaned
  }

  return { guess, summary, running, said, setGuess: setCleanGuess, run }
}

/** Every way to run as a square: empty outlines until the run, then safe or lost. */
export function CountView(props: { game: CountGame; runs: number }) {
  const { summary, guess } = props.game
  return (
    <RunGrid
      outcomes={summary?.outcomes ?? null}
      runs={props.runs}
      texts={{
        of: COUNT.of(props.runs),
        loseMoney: COUNT.loseMoney,
        legendSafe: COUNT.legendSafe,
        legendLost: COUNT.legendLost,
        unknown: READOUT.unknown,
        caption: (
          <>
            <strong>{COUNT.figureTitle}</strong> {COUNT.figureText(props.runs)}
          </>
        ),
        summary: summary ? COUNT.result(summary.losing, summary.runs, guess) : COUNT.notRun(props.runs),
      }}
    />
  )
}

/** The guess, the run, and the way on. */
export function CountControls(props: { game: CountGame; runs: number; onNext: () => void }) {
  const { game } = props
  const counted = game.summary !== null
  return (
    <div class="m-deck-row">
      <label class="m-guess">
        <span>{COUNT.guessLabel}</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          class="tnum"
          value={game.guess}
          readOnly={counted}
          onInput={(event) => {
            // Shown as cleaned at once, also when cleaning changed nothing the state can see.
            const input = event.target as HTMLInputElement
            const cleaned = game.setGuess(input.value)
            input.value = cleaned
          }}
        />
      </label>
      <button
        type="button"
        class="btn"
        aria-disabled={game.running || counted ? 'true' : undefined}
        onClick={() => void game.run()}
      >
        {COUNT.run(props.runs)}
      </button>
      <NextButton
        open={counted}
        label={COUNT.next}
        locked={COUNT.nextLocked(props.runs)}
        onClick={props.onNext}
      />
    </div>
  )
}

/** The way on: laid out from the start, locked (with the reason, in full contrast) until it is earned. */
export function NextButton(props: { open: boolean; label: string; locked: string; onClick: () => void }) {
  return (
    <button
      type="button"
      class={`btn m-next${props.open ? '' : ' is-locked'}`}
      aria-disabled={props.open ? undefined : 'true'}
      onClick={() => {
        if (props.open) props.onClick()
      }}
    >
      <span class="label-stack">
        <span class={props.open ? 'is-off' : ''}>
          <LockIcon /> {props.locked}
        </span>
        <span class={props.open ? '' : 'is-off'}>{props.label}</span>
      </span>
    </button>
  )
}

function LockIcon() {
  return (
    <svg class="lock" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h.5A1.5 1.5 0 0 1 13.5 8.5v5A1.5 1.5 0 0 1 12 15H4a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 4 7h.5Zm1.5 0h4V5a2 2 0 1 0-4 0v2Z"
      />
    </svg>
  )
}

/** What steps 1 and 2 found, as five numbers. */
export function countCells(reproduction: Reproduction | null, game: CountGame, runs: number): ReadoutCell[] {
  const { summary, guess } = game
  return [
    {
      label: READOUT.count.reproduced,
      value: reproduction ? READOUT.count.tries(reproduction.tries) : READOUT.empty,
    },
    {
      label: READOUT.count.lost,
      value: reproduction ? formatCents(reproduction.short) : READOUT.empty,
      ...(reproduction ? { short: String(Math.round(reproduction.short / 100)) } : {}),
      tone: reproduction ? READOUT_TONE.LOST : READOUT_TONE.PENDING,
    },
    {
      label: READOUT.count.guess,
      value: guess || READOUT.empty,
      tone: guess ? READOUT_TONE.PLAIN : READOUT_TONE.PENDING,
    },
    {
      label: READOUT.count.lose,
      value: summary ? String(summary.losing) : READOUT.unknown,
      tone: summary ? READOUT_TONE.LOST : READOUT_TONE.PENDING,
    },
    { label: READOUT.count.runs, value: String(runs) },
  ]
}
