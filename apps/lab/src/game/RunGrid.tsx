import type { RaceOutcome } from '@lab/core'
import type { ComponentChildren } from 'preact'

export interface RunGridTexts {
  /** "of 54 ways to run" */
  readonly of: string
  /** "lose money" */
  readonly loseMoney: string
  readonly legendSafe: (count: number | string) => string
  readonly legendLost: (count: number | string) => string
  readonly caption?: ComponentChildren
  /** The whole result as one sentence, for screen readers (or what is waiting, before the run). */
  readonly summary: string
  /** Shown instead of a number before the run. */
  readonly unknown: string
}

/** The whole grid fills in this long, however many runs there are (well under the 5-second rule). */
const FILL_MS = 1500

/**
 * Every run as one square: solid blue safe, hatched red lost. Before the run (`outcomes` null) the squares are
 * empty outlines, so the grid already has its final size. `capacity` keeps room for a larger run than this one (the
 * extra squares are laid out but not shown), so grids of different sizes take the same space. Cells fade in one by
 * one (not with reduced motion); key the grid by the run to replay that.
 */
export function RunGrid(props: {
  outcomes: readonly RaceOutcome[] | null
  runs: number
  capacity?: number
  small?: boolean
  texts: RunGridTexts
}) {
  const { outcomes, texts } = props
  const ran = outcomes !== null
  const losing = outcomes ? outcomes.filter((outcome) => outcome.picture.lost !== 0).length : null
  const total = Math.max(props.capacity ?? 0, props.runs)
  const cells: ComponentChildren[] = []
  for (let index = 0; index < total; index++) {
    const outcome = outcomes?.[index]
    const spare = index >= props.runs
    const kind = spare
      ? 'cell-spare'
      : !outcome
        ? 'cell-empty'
        : outcome.picture.lost !== 0
          ? 'cell-lost'
          : 'cell-safe'
    cells.push(
      <span
        key={index}
        class={`cell ${kind}`}
        style={outcome ? { '--d': `${Math.round((index * FILL_MS) / props.runs)}ms` } : undefined}
      />,
    )
  }
  return (
    <figure class={`runs-fig${props.small ? ' small' : ''}`}>
      <div class="runs-head">
        <span
          class={`big${losing === 0 ? ' ok' : ''}${ran ? '' : ' unknown'}`}
          style={{ minWidth: `${String(total).length}ch` }}
        >
          {losing ?? texts.unknown}
        </span>
        <span class="of">{texts.of}</span>
        <strong>{texts.loseMoney}</strong>
      </div>
      <div class="runs" role="img" aria-label={texts.summary}>
        {cells}
      </div>
      <ul class="legend" aria-hidden="true">
        <li>
          <span class="cell cell-safe" />{' '}
          {texts.legendSafe(losing === null ? texts.unknown : props.runs - losing)}
        </li>
        <li>
          <span class="cell cell-lost" /> {texts.legendLost(losing ?? texts.unknown)}
        </li>
      </ul>
      {texts.caption ? <figcaption class="cap">{texts.caption}</figcaption> : null}
    </figure>
  )
}

/** The runs as emoji squares, 10 per row, for a shared result. */
export function runGridText(outcomes: readonly RaceOutcome[]): string {
  const cells = outcomes.map((outcome) => (outcome.picture.lost !== 0 ? '🟥' : '🟦'))
  const rows: string[] = []
  for (let index = 0; index < cells.length; index += 10) rows.push(cells.slice(index, index + 10).join(''))
  return rows.join('\n')
}
