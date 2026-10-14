import type { RaceOutcome } from '@lab/core'
import type { ComponentChildren } from 'preact'

export interface RunGridTexts {
  /** "of 54 ways to run" */
  readonly of: string
  /** "lose money" */
  readonly loseMoney: string
  /** Extra text after the headline, for example "· your guess: 20". */
  readonly extra?: string
  readonly legendSafe: (count: number) => string
  readonly legendLost: (count: number) => string
  /** The figure number, for example "fig. 2". */
  readonly figure: string
  readonly caption: ComponentChildren
  /** The whole result as one sentence, for screen readers. */
  readonly summary: string
}

/** Every run as one square: solid blue safe, hatched red lost. Cells fade in one by one (not with reduced motion). */
export function RunGrid(props: { outcomes: readonly RaceOutcome[]; texts: RunGridTexts }) {
  const { outcomes, texts } = props
  const losing = outcomes.filter((outcome) => outcome.picture.lost !== 0).length
  return (
    <figure class="runs-fig">
      <div class="runs-head">
        <span class={`big${losing === 0 ? ' ok' : ''}`}>{losing}</span>
        <span class="of">{texts.of}</span>
        <strong>{texts.loseMoney}</strong>
        {texts.extra ? <span class="of">{texts.extra}</span> : null}
      </div>
      <div class="runs" role="img" aria-label={texts.summary}>
        {outcomes.map((outcome, index) => (
          <span
            key={index}
            class={`cell ${outcome.picture.lost !== 0 ? 'cell-lost' : 'cell-safe'}`}
            style={{ '--i': index }}
          />
        ))}
      </div>
      <ul class="legend" aria-hidden="true">
        <li>
          <span class="cell cell-safe" /> {texts.legendSafe(outcomes.length - losing)}
        </li>
        <li>
          <span class="cell cell-lost" /> {texts.legendLost(losing)}
        </li>
      </ul>
      <figcaption class="nb-cap">
        <span class="nb-cap-num">{texts.figure}</span> — {texts.caption}
      </figcaption>
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
