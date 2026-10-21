import {
  ANNA,
  type Applicant,
  BORIS,
  COMPARISON,
  type Comparison,
  canTrade,
  lastNightOnV01,
  MemoryProviderApi,
  type Position,
  providerRecords,
  reconcileWithProvider,
} from '@lab/core'
import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { type Said, TONE } from '../../game/Message.tsx'
import { READOUT_TONE, type ReadoutCell } from '../../game/Readout.tsx'
import { CLEAN_UP, READOUT, STATUS_TEXT } from './texts.ts'

const CHOICE = { ANSWER: 'ANSWER', LOGS: 'LOGS', ASK: 'ASK' } as const
type Choice = (typeof CHOICE)[keyof typeof CHOICE]

/** The two applicants on the screen, Boris first: he is the one the regulator asks about. */
const APPLICANTS = [BORIS, ANNA] as const

/** Everything the clean-up can say, so the message keeps one height whichever answer comes back. */
export const CLEAN_UP_SIZERS: readonly Said[] = [
  { tone: TONE.LOST, text: CLEAN_UP.answer },
  { tone: TONE.NONE, text: CLEAN_UP.logs(8) },
  { tone: TONE.OK, text: CLEAN_UP.ask },
  { tone: TONE.NONE, text: CLEAN_UP.prompt },
]

/** One side of an applicant's row: our record, and (once asked) the provider's and what we did about it. */
interface Side {
  readonly ours: Applicant
  readonly provider: Position | null
  readonly comparison: Comparison | null
}

/** One applicant: last night's records as build v0.1 left them, and after asking the provider. */
interface Row {
  readonly id: string
  readonly before: Side
  /** Worked out on arrival as well, only so the screen keeps its room; asking runs the clean-up again. */
  readonly after: Side
}

export interface CleanUpGame {
  readonly choice: Choice | null
  /** The provider has been asked: the screen shows each row's `after`. */
  readonly asked: boolean
  readonly rows: readonly Row[] | null
  readonly said: Said
  play(choice: Choice): Promise<void>
}

/** Last night's records, before anyone asks: what build v0.1 left. */
async function lastNight() {
  const night = await lastNightOnV01()
  return night.store
}

/** Last night's records, then the real clean-up: ask the provider about each applicant, compare, act. */
async function askTheProvider(): Promise<Map<string, Side>> {
  const store = await lastNight()
  const provider = new MemoryProviderApi(providerRecords())
  const sides = new Map<string, Side>()
  for (const id of APPLICANTS) {
    const comparison = await reconcileWithProvider(store, provider, id)
    sides.set(id, { ours: store.applicant(id), provider: comparison.provider, comparison: comparison.result })
  }
  return sides
}

/**
 * Go deeper: build v1 is live, but last night ran build v0.1, and the regulator asks for Boris's file. Every choice
 * starts from last night's real records; asking the provider runs the real clean-up on them.
 */
export function useCleanUp(): CleanUpGame {
  const [choice, setChoice] = useState<Choice | null>(null)
  const [rows, setRows] = useState<readonly Row[] | null>(null)
  const [kept, setKept] = useState(0)

  useEffect(() => {
    void (async () => {
      const store = await lastNight()
      const after = await askTheProvider()
      setRows(
        APPLICANTS.map((id) => {
          const before = { ours: store.applicant(id), provider: null, comparison: null }
          return { id, before, after: after.get(id) ?? before }
        }),
      )
    })()
  }, [])

  async function play(next: Choice) {
    if (next === CHOICE.ASK) {
      const after = await askTheProvider()
      setRows((before) => before?.map((row) => ({ ...row, after: after.get(row.id) ?? row.after })) ?? null)
    } else {
      // What a search of our records could find: the messages build v0.1 kept for Boris.
      const store = await lastNight()
      const borisKept = store.events(BORIS).length
      setKept(borisKept)
    }
    setChoice(next)
  }

  const said: Said =
    choice === CHOICE.ANSWER
      ? { tone: TONE.LOST, text: CLEAN_UP.answer }
      : choice === CHOICE.LOGS
        ? { tone: TONE.NONE, text: CLEAN_UP.logs(kept) }
        : choice === CHOICE.ASK
          ? { tone: TONE.OK, text: CLEAN_UP.ask }
          : { tone: TONE.NONE, text: CLEAN_UP.prompt }

  return { choice, asked: choice === CHOICE.ASK, rows, said, play }
}

const NAMES: Record<string, string> = { [ANNA]: CLEAN_UP.anna, [BORIS]: CLEAN_UP.boris }

/** "03:12" from "2026-10-15T03:12:40Z": the time the message itself claimed. */
const clock = (sentAt: string) => sentAt.slice(11, 16)

/** Both states of a cell in one place: the cell is as tall as the taller one, so asking moves nothing. */
function Both(props: { asked: boolean; before: ComponentChildren; after: ComponentChildren }) {
  return (
    <span class="k-stack">
      <span class={props.asked ? 'is-off' : ''} aria-hidden={props.asked ? 'true' : undefined}>
        {props.before}
      </span>
      <span class={props.asked ? '' : 'is-off'} aria-hidden={props.asked ? undefined : 'true'}>
        {props.after}
      </span>
    </span>
  )
}

/** Our record of one applicant, as one line of words. */
function oursText(side: Side) {
  return CLEAN_UP.oursLine(STATUS_TEXT[side.ours.status], side.ours.version, clock(side.ours.lastSentAt))
}

/** The provider's record and what we did about it (nothing yet, before asking). */
function ProviderCell(props: { side: Side }) {
  const { provider, comparison } = props.side
  if (!provider || !comparison) return <span class="k-unasked">{CLEAN_UP.notAsked}</span>
  const held = comparison === COMPARISON.NOT_FROM_PROVIDER
  return (
    <>
      {CLEAN_UP.providerLine(STATUS_TEXT[provider.status], provider.version)}
      <span class={`k-outcome${held ? ' is-held' : ''}`}>{CLEAN_UP.outcome[comparison]}</span>
    </>
  )
}

/** Last night's records side by side with the provider's, and the three things you could do. */
export function RegulatorScreen(props: { game: CleanUpGame }) {
  const { game } = props
  const { asked } = game
  return (
    <div class="v-regulator">
      <table class="k-records">
        <caption class="visually-hidden">{CLEAN_UP.tableLabel}</caption>
        <thead>
          <tr>
            <th scope="col">{CLEAN_UP.who}</th>
            <th scope="col">{CLEAN_UP.ours}</th>
            <th scope="col">{CLEAN_UP.provider}</th>
          </tr>
        </thead>
        <tbody>
          {(game.rows ?? []).map((row) => {
            const held = asked && row.after.comparison === COMPARISON.NOT_FROM_PROVIDER
            return (
              <tr key={row.id} class={held ? 'is-held' : ''}>
                <th scope="row">{NAMES[row.id]}</th>
                <td>
                  <Both asked={asked} before={oursText(row.before)} after={oursText(row.after)} />
                </td>
                <td>
                  <Both
                    asked={asked}
                    before={<ProviderCell side={row.before} />}
                    after={<ProviderCell side={row.after} />}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {/* The next step for Boris, once the provider has answered; laid out before, so nothing moves. */}
      <p class={`k-after${asked ? '' : ' is-off'}`} aria-hidden={asked ? undefined : 'true'}>
        {CLEAN_UP.afterAsk}
      </p>
      <fieldset class="m-choices">
        <legend class="visually-hidden">{CLEAN_UP.choicesLabel}</legend>
        {Object.values(CHOICE).map((id) => (
          <button
            key={id}
            type="button"
            class="btn-2 m-choice"
            aria-pressed={game.choice === id}
            onClick={() => void game.play(id)}
          >
            {CLEAN_UP.choices[id]}
          </button>
        ))}
      </fieldset>
    </div>
  )
}

/** Last night in three numbers: Boris on our side and the provider's, and whether he can still trade. */
export function deeperCells(game: CleanUpGame): ReadoutCell[] {
  const row = game.rows?.find((each) => each.id === BORIS) ?? null
  const boris = row ? (game.asked ? row.after : row.before) : null
  const position = (status: Applicant['status'], version: number) => `${STATUS_TEXT[status]} · v${version}`
  const borisTrades = boris ? canTrade(boris.ours) : null
  return [
    {
      label: READOUT.deeper.boris,
      value: boris ? position(boris.ours.status, boris.ours.version) : READOUT.empty,
      tone: boris?.comparison === COMPARISON.NOT_FROM_PROVIDER ? READOUT_TONE.LOST : READOUT_TONE.PLAIN,
      wide: true,
    },
    {
      label: READOUT.deeper.borisProvider,
      value: boris?.provider ? position(boris.provider.status, boris.provider.version) : READOUT.unknown,
      tone: boris?.provider ? READOUT_TONE.PLAIN : READOUT_TONE.PENDING,
      wide: true,
    },
    {
      label: READOUT.deeper.trading,
      value: borisTrades === null ? READOUT.empty : borisTrades ? READOUT.deeper.open : READOUT.deeper.held,
      tone: borisTrades === null ? READOUT_TONE.PENDING : borisTrades ? READOUT_TONE.LOST : READOUT_TONE.SAFE,
    },
  ]
}
