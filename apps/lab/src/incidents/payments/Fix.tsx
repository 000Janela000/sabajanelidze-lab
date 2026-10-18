import {
  type AllRunsSummary,
  allRuns,
  pauseAfter,
  type Withdraw,
  withdraw,
  withdrawCheckTwice,
  withdrawLockRead,
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
import { AMOUNT, OPENING, PATCH, type PatchId, type PatchOption } from './setup.ts'
import { CONSOLE, COUNT, FIX, READOUT } from './texts.ts'

const PATCH_CODE: Record<PatchId, Withdraw> = {
  CHECK_TWICE: withdrawCheckTwice,
  RESERVE: withdraw,
  LOCK_READ: withdrawLockRead,
}

/** What the screen shows in step 3: the chosen patch's code, or the result of the last attack. */
export const FIX_VIEW = { PATCH: 'PATCH', RESULT: 'RESULT' } as const
export type FixView = (typeof FIX_VIEW)[keyof typeof FIX_VIEW]

/** The longest things step 3 can say (888 stands in for any count). */
export const FIX_SIZERS: readonly Said[] = [
  { tone: TONE.LOST, lead: FIX.stillLoses(888, 888, 8), text: FIX.stillLosesWhy },
  { tone: TONE.NONE, text: FIX.prompt },
  { tone: TONE.NONE, text: FIX.ready(FIX.patches.CHECK_TWICE.name) },
]

interface Attack {
  readonly id: PatchId
  readonly summary: AllRunsSummary
  readonly losingLine: number | null
}

export interface FixGame {
  readonly choice: PatchId | null
  readonly view: FixView
  readonly last: Attack | null
  /** A losing attack's runs while its grid fills (the result is told after). */
  readonly filling: AllRunsSummary | null
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

/** Step 3: the visitor picks a patch; the machine attacks it with every way the two requests can run. */
export function useFix(props: { onFixed: (summary: AllRunsSummary) => void }): FixGame {
  const [choice, setChoice] = useState<PatchId | null>(null)
  const [view, setView] = useState<FixView>(FIX_VIEW.PATCH)
  const [last, setLast] = useState<Attack | null>(null)
  // A patch that still loses: its runs, while the grid fills; the result is told once the last square is in.
  const [filling, setFilling] = useState<AllRunsSummary | null>(null)
  const [running, setRunning] = useState(false)
  const [tries, setTries] = useState(0)
  const tabs = useRef<HTMLFieldSetElement>(null)
  const attackedThis = last !== null && last.id === choice
  const canAttack = choice !== null && !running && !attackedThis

  async function attack() {
    if (!choice || !canAttack) return
    setRunning(true)
    setTries((count) => count + 1)
    const code = PATCH_CODE[choice]
    const summary = await allRuns(code, OPENING, AMOUNT)
    let losingLine: number | null = null
    if (summary.losing > 0) {
      for (let line = 1; line <= summary.linesPerRequest; line++) {
        const outcome = await pauseAfter(code, OPENING, AMOUNT, line)
        if (outcome.picture.lost !== 0) {
          losingLine = line
          break
        }
      }
    }
    // The fix goes straight on to its own screen, which fills its grid there.
    const holds = summary.losing === 0
    if (!holds) {
      setFilling(summary)
      setView(FIX_VIEW.RESULT)
      await untilFilled()
      setFilling(null)
    }
    setLast({ id: choice, summary, losingLine })
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

  const failed = last && last.summary.losing > 0 ? last : null
  const failedHere = failed !== null && failed.id === choice && view === FIX_VIEW.RESULT
  const said: Said =
    failed && failedHere
      ? {
          tone: TONE.LOST,
          lead: FIX.stillLoses(failed.summary.losing, failed.summary.runs, failed.losingLine),
          text: FIX.stillLosesWhy,
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

/** The patch's code, with the lines that differ from build v0.1 marked (the first line only names it). */
function PatchCode(props: { lines: readonly CodeLine[]; base: ReadonlySet<string> }) {
  return (
    <ol class="pcode">
      {props.lines.map((line, index) => {
        const text = line.tokens
          .map((token) => token.text)
          .join('')
          .trim()
        const changed = index > 0 && !props.base.has(text)
        return (
          <li key={index} class={changed ? 'pl changed' : 'pl'}>
            <IndentedCode tokens={line.tokens} />
            {changed ? <span class="visually-hidden"> ({FIX.changed})</span> : null}
          </li>
        )
      })}
    </ol>
  )
}

function lineTexts(lines: readonly CodeLine[]): Set<string> {
  return new Set(
    lines.map((line) =>
      line.tokens
        .map((token) => token.text)
        .join('')
        .trim(),
    ),
  )
}

/** The three patches as tabs, then the chosen patch's code or the attack result, in one fixed space. */
export function FixScreen(props: {
  game: FixGame
  patches: readonly PatchOption[]
  base: readonly CodeLine[]
  patchRuns: Record<PatchId, number>
}) {
  const { game, patches } = props
  const capacity = Math.max(...Object.values(props.patchRuns))
  const base = lineTexts(props.base)
  const last = game.last
  // What the grid shows: a losing attack while it fills, else the last attack.
  const shown = game.filling ?? last?.summary ?? null
  return (
    <div class="v-fix">
      <fieldset class="m-tabs" ref={game.tabs}>
        <legend class="visually-hidden">{FIX.patchesLegend}</legend>
        {patches.map((patch) => (
          <label key={patch.id} class={`m-tab${game.choice === patch.id ? ' chosen' : ''}`}>
            <input
              type="radio"
              name="patch"
              class="m-tab-input"
              value={patch.id}
              checked={game.choice === patch.id}
              onChange={() => game.choose(patch.id)}
            />
            <span class="m-tab-label">{FIX.patches[patch.id].name}</span>
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
            <ScrollBox
              label={FIX.codeLabel(FIX.patches[patch.id].name)}
              moreText={CONSOLE.more}
              reveal=".pl.changed"
              revealKey={game.choice}
            >
              <PatchCode lines={patch.lines} base={base} />
            </ScrollBox>
          </Layer>
        ))}
        <Layer on={game.view === FIX_VIEW.RESULT}>
          <RunGrid
            key={`attack-${game.tries}`}
            outcomes={shown?.outcomes ?? null}
            runs={shown?.runs ?? capacity}
            capacity={capacity}
            small
            texts={{
              of: COUNT.of(shown?.runs ?? capacity),
              loseMoney: COUNT.loseMoney,
              legendSafe: COUNT.legendSafe,
              legendLost: COUNT.legendLost,
              unknown: READOUT.unknown,
              summary: game.filling
                ? COUNT.figureTitle
                : last
                  ? FIX.stillLoses(last.summary.losing, last.summary.runs, last.losingLine)
                  : COUNT.notRun(capacity),
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
  // Shown with a failed attack's result, as the way back to the patches.
  const failed =
    game.last !== null &&
    game.last.summary.losing > 0 &&
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

/** What steps 2 and 3 found, as numbers. */
export function fixCells(
  counted: AllRunsSummary | null,
  game: FixGame,
  patchRuns: Record<PatchId, number>,
): ReadoutCell[] {
  const shown = game.choice
  const result = game.last && game.last.id === shown ? game.last.summary : null
  return [
    before(counted),
    {
      label: READOUT.fix.patch,
      value: shown ? FIX.patches[shown].name : READOUT.empty,
      ...(shown ? { short: FIX.patches[shown].short } : {}),
      tone: shown ? READOUT_TONE.PLAIN : READOUT_TONE.PENDING,
      wide: true,
    },
    {
      label: READOUT.fix.lose,
      ...(result
        ? {
            value: READOUT.fix.of(result.losing, result.runs),
            short: READOUT.fix.ofShort(result.losing, result.runs),
          }
        : shown
          ? {
              value: READOUT.fix.ofUnknown(patchRuns[shown]),
              short: READOUT.fix.ofShort(READOUT.unknown, patchRuns[shown]),
            }
          : { value: READOUT.unknown }),
      tone: result ? (result.losing > 0 ? READOUT_TONE.LOST : READOUT_TONE.SAFE) : READOUT_TONE.PENDING,
    },
    { label: READOUT.fix.tries, value: String(game.tries) },
  ]
}

/** What build v0.1 lost, from step 2. */
function before(counted: AllRunsSummary | null): ReadoutCell {
  return counted
    ? {
        label: READOUT.fix.before,
        value: READOUT.fix.of(counted.losing, counted.runs),
        short: READOUT.fix.ofShort(counted.losing, counted.runs),
        tone: READOUT_TONE.LOST,
      }
    : { label: READOUT.fix.before, value: READOUT.empty, tone: READOUT_TONE.PENDING }
}

/** The final numbers: build v0.1 against the fix. */
export function solvedCells(
  counted: AllRunsSummary | null,
  fixed: AllRunsSummary | null,
  tries: number,
  fixRuns: number,
): ReadoutCell[] {
  const losing = fixed?.losing ?? 0
  const runs = fixed?.runs ?? fixRuns
  return [
    before(counted),
    {
      label: READOUT.solved.fix,
      value: FIX.patches[PATCH.RESERVE].name,
      short: FIX.patches[PATCH.RESERVE].short,
      wide: true,
    },
    {
      label: READOUT.solved.lose,
      value: READOUT.fix.of(losing, runs),
      short: READOUT.fix.ofShort(losing, runs),
      tone: READOUT_TONE.SAFE,
    },
    { label: READOUT.fix.tries, value: String(Math.max(1, tries)) },
  ]
}
