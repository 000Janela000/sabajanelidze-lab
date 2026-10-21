import {
  type AllDeliveriesSummary,
  ANNA,
  allDeliveryOrders,
  annaMessages,
  BORIS,
  borisMessages,
  deliver,
  forgedApprovalForBoris,
  type HandleEvent,
  handleEvent,
  handleEventAllowedMoves,
  handleEventTimestamp,
  KYC_STATUS,
} from '@lab/core'
import type { RefObject } from 'preact'
import { useRef, useState } from 'preact/hooks'
import { IndentedCode } from '../../game/CodeText.tsx'
import { Layer } from '../../game/Layer.tsx'
import { type Said, TONE } from '../../game/Message.tsx'
import { READOUT_TONE, type ReadoutCell } from '../../game/Readout.tsx'
import { RunGrid, untilFilled } from '../../game/RunGrid.tsx'
import { ScrollBox } from '../../game/ScrollBox.tsx'
import type { CodeLine } from '../../lib/code-line.ts'
import { lockedOut, ORDER_LABELS } from './Count.tsx'
import { PATCH, type PatchId, type PatchOption } from './setup.ts'
import { CONSOLE, COUNT, FIX, READOUT } from './texts.ts'

const PATCH_CODE: Record<PatchId, HandleEvent> = {
  TIMESTAMP: handleEventTimestamp,
  VERSION_ORDER: handleEvent,
  ALLOWED_MOVES: handleEventAllowedMoves,
}

/** What the screen shows in step 3: the chosen patch's code, or the result of the last attack. */
export const FIX_VIEW = { PATCH: 'PATCH', RESULT: 'RESULT' } as const
export type FixView = (typeof FIX_VIEW)[keyof typeof FIX_VIEW]

/** The longest things step 3 can say (88 stands in for any count). */
export const FIX_SIZERS: readonly Said[] = [
  { tone: TONE.LOST, lead: FIX.stillLocks(88, 88), text: FIX.why.ALLOWED_MOVES },
  { tone: TONE.LOST, lead: FIX.stillLocks(88, 88), text: FIX.why.TIMESTAMP },
  { tone: TONE.NONE, text: FIX.attacking(FIX.patches.ALLOWED_MOVES.name) },
  { tone: TONE.NONE, text: FIX.ready(FIX.patches.ALLOWED_MOVES.name) },
  { tone: TONE.NONE, text: FIX.prompt },
]

interface Attack {
  readonly id: PatchId
  readonly summary: AllDeliveriesSummary
  /** The forged "approved" for Boris got in. */
  readonly forgeryIn: boolean
}

export interface FixGame {
  readonly choice: PatchId | null
  readonly view: FixView
  readonly last: Attack | null
  /** A losing attack's orders while its grid fills (the result is told after). */
  readonly filling: AllDeliveriesSummary | null
  readonly running: boolean
  readonly tries: number
  readonly canAttack: boolean
  readonly said: Said
  readonly tabs: RefObject<HTMLFieldSetElement>
  choose(id: PatchId): void
  show(view: FixView): void
  attack(): Promise<void>
  tryAnother(): void
}

/** Whether a forged "approved" for Boris, after his two real messages, gets in with this handler. */
async function forgeryGetsIn(handle: HandleEvent): Promise<boolean> {
  const order = [...(await borisMessages()), await forgedApprovalForBoris()]
  const outcome = await deliver(handle, order)
  return outcome.applicants[BORIS]?.status === KYC_STATUS.APPROVED
}

/** Step 3: the visitor picks a patch; the machine attacks it with every order, and with the forgery. */
export function useFix(props: { onFixed: (summary: AllDeliveriesSummary) => void }): FixGame {
  const [choice, setChoice] = useState<PatchId | null>(null)
  const [view, setView] = useState<FixView>(FIX_VIEW.PATCH)
  const [last, setLast] = useState<Attack | null>(null)
  const [filling, setFilling] = useState<AllDeliveriesSummary | null>(null)
  const [running, setRunning] = useState(false)
  const [tries, setTries] = useState(0)
  const tabs = useRef<HTMLFieldSetElement>(null)
  const attackedThis = last !== null && last.id === choice
  const canAttack = choice !== null && !running && !attackedThis

  async function attack() {
    if (!choice || !canAttack) return
    setRunning(true)
    setTries((count) => count + 1)
    const handle = PATCH_CODE[choice]
    const messages = await annaMessages()
    const summary = await allDeliveryOrders(handle, messages, ANNA, KYC_STATUS.APPROVED)
    const forgeryIn = await forgeryGetsIn(handle)
    // The fix goes straight on to its own screen, which fills its grid there.
    const holds = summary.wrong === 0 && !forgeryIn
    if (!holds) {
      setFilling(summary)
      setView(FIX_VIEW.RESULT)
      await untilFilled()
      setFilling(null)
    }
    setLast({ id: choice, summary, forgeryIn })
    setView(FIX_VIEW.RESULT)
    setRunning(false)
    if (holds) props.onFixed(summary)
  }

  function choose(id: PatchId) {
    setChoice(id)
    setView(FIX_VIEW.PATCH)
  }

  /** Back to the patches, with focus on the chosen one (arrow keys then move between them). */
  function tryAnother() {
    setView(FIX_VIEW.PATCH)
    requestAnimationFrame(() => {
      const checked = tabs.current?.querySelector<HTMLInputElement>('input:checked')
      const first = tabs.current?.querySelector<HTMLInputElement>('input')
      ;(checked ?? first)?.focus()
    })
  }

  const failed = last && last.summary.wrong > 0 ? last : null
  const failedHere = failed !== null && failed.id === choice && view === FIX_VIEW.RESULT
  const said: Said =
    failed && failedHere && failed.id !== PATCH.VERSION_ORDER
      ? {
          tone: TONE.LOST,
          lead: FIX.stillLocks(failed.summary.wrong, failed.summary.orders),
          text: FIX.why[failed.id],
        }
      : choice && running
        ? { tone: TONE.NONE, text: FIX.attacking(FIX.patches[choice].name) }
        : choice && !attackedThis
          ? { tone: TONE.NONE, text: FIX.ready(FIX.patches[choice].name) }
          : { tone: TONE.NONE, text: FIX.prompt }

  return {
    choice,
    view,
    last,
    filling,
    running,
    tries,
    canAttack,
    said,
    tabs,
    choose,
    show: setView,
    attack,
    tryAnother,
  }
}

/** A patch's real code. */
function PatchCode(props: { lines: readonly CodeLine[] }) {
  return (
    <ol class="pcode">
      {props.lines.map((line, index) => (
        <li key={index} class="pl">
          <IndentedCode tokens={line.tokens} />
        </li>
      ))}
    </ol>
  )
}

/** The three patches as tabs, then the chosen patch's code or the attack's result, in one fixed space. */
export function FixScreen(props: { game: FixGame; patches: readonly PatchOption[]; orders: number }) {
  const { game, patches } = props
  const last = game.last
  // What the grid shows: a losing attack while it fills, else the last attack. The forgery's result is in the
  // readout.
  const shown = game.filling ?? last?.summary ?? null
  return (
    <div class="v-fix">
      <fieldset class="m-tabs" ref={game.tabs}>
        <legend class="visually-hidden">{FIX.patchesLegend}</legend>
        {patches.map((patch) => (
          <label key={patch.id} class={`m-tab${game.choice === patch.id ? ' chosen' : ''}`}>
            <input
              type="radio"
              name="kyc-patch"
              class="m-tab-input"
              value={patch.id}
              checked={game.choice === patch.id}
              onChange={() => game.choose(patch.id)}
            />
            <span class="m-tab-label">
              <span class="long">{FIX.patches[patch.id].name}</span>
              <span class="short">{FIX.patches[patch.id].short}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div class="stack m-fixinner">
        <Layer on={game.choice === null && game.view === FIX_VIEW.PATCH} class="m-none">
          <p class="m-hint">{FIX.none}</p>
        </Layer>
        {patches.map((patch) => (
          <Layer key={patch.id} on={game.choice === patch.id && game.view === FIX_VIEW.PATCH} fill>
            <p class="m-summary">{FIX.patches[patch.id].summary}</p>
            <ScrollBox label={FIX.codeLabel(FIX.patches[patch.id].name)} moreText={CONSOLE.more}>
              <PatchCode lines={patch.lines} />
            </ScrollBox>
          </Layer>
        ))}
        <Layer on={game.view === FIX_VIEW.RESULT}>
          <RunGrid
            key={`attack-${game.tries}`}
            outcomes={shown?.outcomes ?? null}
            isLost={lockedOut}
            labels={ORDER_LABELS}
            runs={props.orders}
            texts={{
              of: COUNT.of(props.orders),
              loseMoney: COUNT.lockOut,
              legendSafe: COUNT.legendSafe,
              legendLost: COUNT.legendLost,
              unknown: READOUT.unknown,
              summary: game.filling
                ? COUNT.figureTitle
                : last
                  ? FIX.stillLocks(last.summary.wrong, last.summary.orders)
                  : COUNT.notRun(props.orders),
            }}
          />
        </Layer>
      </div>
    </div>
  )
}

/** Attack, and (after a failed attack) the way back to the patches. */
export function FixControls(props: { game: FixGame }) {
  const { game } = props
  const failed =
    game.last !== null &&
    game.last.summary.wrong > 0 &&
    game.last.id === game.choice &&
    game.view === FIX_VIEW.RESULT
  return (
    <div class="m-deck-row">
      <button
        type="button"
        class="btn"
        aria-disabled={game.canAttack ? undefined : 'true'}
        onClick={() => void game.attack()}
      >
        {FIX.attack}
      </button>
      <button
        type="button"
        class={`link m-link-btn${failed ? '' : ' is-off'}`}
        aria-hidden={failed ? undefined : 'true'}
        tabIndex={failed ? undefined : -1}
        onClick={game.tryAnother}
      >
        {FIX.tryAnother}
      </button>
    </div>
  )
}

/** What steps 2 and 3 found. */
export function fixCells(counted: AllDeliveriesSummary | null, game: FixGame, orders: number): ReadoutCell[] {
  const result = game.last && game.last.id === game.choice && !game.filling ? game.last : null
  return [
    {
      label: READOUT.fix.v01,
      value: counted
        ? READOUT.fix.of(counted.wrong, counted.orders)
        : READOUT.fix.of(READOUT.unknown, orders),
      tone: counted ? READOUT_TONE.LOST : READOUT_TONE.PENDING,
    },
    {
      label: READOUT.fix.patch,
      value: game.choice ? FIX.patches[game.choice].name : READOUT.empty,
      short: game.choice ? FIX.patches[game.choice].short : READOUT.empty,
      tone: game.choice ? READOUT_TONE.PLAIN : READOUT_TONE.PENDING,
      wide: true,
    },
    {
      label: READOUT.fix.patchLocks,
      value: READOUT.fix.of(result ? result.summary.wrong : READOUT.unknown, orders),
      tone: result
        ? result.summary.wrong > 0
          ? READOUT_TONE.LOST
          : READOUT_TONE.SAFE
        : READOUT_TONE.PENDING,
    },
    {
      label: READOUT.fix.forgery,
      value: result ? (result.forgeryIn ? READOUT.fix.letIn : READOUT.fix.refused) : READOUT.unknown,
      tone: result ? (result.forgeryIn ? READOUT_TONE.LOST : READOUT_TONE.SAFE) : READOUT_TONE.PENDING,
    },
  ]
}
