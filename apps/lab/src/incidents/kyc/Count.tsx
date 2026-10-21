import {
  type AllDeliveriesSummary,
  ANNA,
  allDeliveryOrders,
  annaMessages,
  type DeliveryOutcome,
  deliveryOrders,
  handleEventV01,
  KYC_STATUS,
} from '@lab/core'
import { useState } from 'preact/hooks'
import { type Said, TONE } from '../../game/Message.tsx'
import { NextButton } from '../../game/NextButton.tsx'
import { READOUT_TONE, type ReadoutCell } from '../../game/Readout.tsx'
import { RunGrid, untilFilled } from '../../game/RunGrid.tsx'
import type { Reproduction } from './setup.ts'
import { COUNT, READOUT } from './texts.ts'

/** Whether a delivery order left Anna unable to trade (not approved at the end of the night). */
export const lockedOut = (outcome: DeliveryOutcome): boolean =>
  outcome.applicants[ANNA]?.status !== KYC_STATUS.APPROVED

/** Each order's label, the versions in the order they arrived ("1 2 1"), known before anything runs. */
export const ORDER_LABELS: readonly string[] = deliveryOrders([1, 2]).map((order) => order.join(' '))

/** The longest things step 2 can say (a guess has at most two digits). */
export function countSizers(orders: number): Said[] {
  return [
    { tone: TONE.LOST, text: COUNT.result(orders, orders, '88') },
    { tone: TONE.NONE, text: COUNT.prompt(orders) },
    { tone: TONE.NONE, text: COUNT.running(orders) },
  ]
}

export interface CountGame {
  readonly guess: string
  /** What the grid shows: every order, as soon as they ran (it fills in over 1.5 s). */
  readonly outcomes: readonly DeliveryOutcome[] | null
  /** The count, told once the grid is full. */
  readonly summary: AllDeliveriesSummary | null
  readonly running: boolean
  readonly said: Said
  /** Keeps only a valid guess and returns it. */
  setGuess(text: string): string
  run(): Promise<void>
}

function cleanGuess(text: string, orders: number): string {
  const digits = text.replace(/\D/g, '').slice(0, 2)
  if (!digits) return ''
  return String(Math.min(Number(digits), orders))
}

/** Step 2: guess, then the machine delivers Anna's two messages in every order to build v0.1. */
export function useCount(props: { orders: number }): CountGame {
  const [guess, setGuess] = useState('')
  const [outcomes, setOutcomes] = useState<readonly DeliveryOutcome[] | null>(null)
  const [summary, setSummary] = useState<AllDeliveriesSummary | null>(null)
  const [running, setRunning] = useState(false)

  async function run() {
    if (running || summary) return
    setRunning(true)
    const messages = await annaMessages()
    const result = await allDeliveryOrders(handleEventV01, messages, ANNA, KYC_STATUS.APPROVED)
    // The grid fills first; the count is told once its last card is in.
    setOutcomes(result.outcomes)
    await untilFilled()
    setSummary(result)
    setRunning(false)
  }

  const said: Said = summary
    ? { tone: TONE.LOST, text: COUNT.result(summary.wrong, summary.orders, guess) }
    : running
      ? { tone: TONE.NONE, text: COUNT.running(props.orders) }
      : { tone: TONE.NONE, text: COUNT.prompt(props.orders) }

  function setCleanGuess(text: string): string {
    const cleaned = cleanGuess(text, props.orders)
    setGuess(cleaned)
    return cleaned
  }

  return { guess, outcomes, summary, running, said, setGuess: setCleanGuess, run }
}

/** Every order as a card with its order on it: empty until the run, then approved or locked out. */
export function CountView(props: { game: CountGame; orders: number }) {
  const { outcomes, summary, guess } = props.game
  return (
    <RunGrid
      outcomes={outcomes}
      isLost={lockedOut}
      labels={ORDER_LABELS}
      runs={props.orders}
      texts={{
        of: COUNT.of(props.orders),
        loseMoney: COUNT.lockOut,
        legendSafe: COUNT.legendSafe,
        legendLost: COUNT.legendLost,
        unknown: READOUT.unknown,
        caption: (
          <>
            <strong>{COUNT.figureTitle}</strong> {COUNT.figureText(props.orders)}
          </>
        ),
        summary: summary ? COUNT.result(summary.wrong, summary.orders, guess) : COUNT.notRun(props.orders),
      }}
    />
  )
}

/** The guess, the run, and the way on. */
export function CountControls(props: { game: CountGame; orders: number; onNext: () => void }) {
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
        {COUNT.run(props.orders)}
      </button>
      <NextButton
        open={counted}
        label={COUNT.next}
        locked={COUNT.nextLocked(props.orders)}
        onClick={props.onNext}
      />
    </div>
  )
}

/** What steps 1 and 2 found. */
export function countCells(
  reproduction: Reproduction | null,
  game: CountGame,
  orders: number,
): ReadoutCell[] {
  const { summary, guess } = game
  return [
    {
      label: READOUT.count.reproduced,
      value: reproduction ? READOUT.count.tries(reproduction.tries) : READOUT.empty,
    },
    {
      label: READOUT.count.guess,
      value: guess || READOUT.empty,
      tone: guess ? READOUT_TONE.PLAIN : READOUT_TONE.PENDING,
    },
    {
      label: READOUT.count.lockOut,
      value: summary ? String(summary.wrong) : READOUT.unknown,
      tone: summary ? READOUT_TONE.LOST : READOUT_TONE.PENDING,
    },
    { label: READOUT.count.orders, value: String(orders), wide: true },
  ]
}
