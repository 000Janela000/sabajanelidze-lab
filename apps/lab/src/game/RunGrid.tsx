import type { RaceOutcome } from '@lab/core'
import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'

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
export const FILL_MS = 1500

/** How long a grid takes to fill here: no time at all with reduced motion, where it appears at once. */
export function fillTime(): number {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  return reduced ? 0 : FILL_MS
}

/** Waits until a grid that starts filling now is full, so a result can be told once its last square is in. */
export function untilFilled(): Promise<void> {
  const fill = fillTime()
  return new Promise((resolve) => setTimeout(resolve, fill))
}

/**
 * Every run as one square: solid blue safe, hatched red lost. Before the run (`outcomes` null) the squares are
 * empty outlines, so the grid already has its final size. `capacity` keeps room for a larger run than this one (the
 * extra squares are laid out but not shown), so grids of different sizes take the same space. Cells fill one by one
 * over their outlines (at once with reduced motion); key the grid by the run to replay that. The number and the
 * legend wait for the last square, so the result lands with its proof, not before it.
 */
export function RunGrid(props: {
  outcomes: readonly RaceOutcome[] | null
  runs: number
  capacity?: number
  small?: boolean
  texts: RunGridTexts
}) {
  const { outcomes, texts } = props
  const [filled, setFilled] = useState<readonly RaceOutcome[] | null>(null)
  useEffect(() => {
    if (!outcomes) {
      setFilled(null)
      return
    }
    const timer = setTimeout(() => setFilled(outcomes), fillTime())
    return () => clearTimeout(timer)
  }, [outcomes])
  const ran = filled !== null
  const losing = filled ? filled.filter((outcome) => outcome.picture.lost !== 0).length : null
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
