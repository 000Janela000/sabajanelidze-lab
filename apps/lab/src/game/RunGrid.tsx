import type { RaceOutcome } from '@lab/core'

/** Every run as one square: striped red lost money, solid safe. The caption is the accessible summary. */
export function RunGrid(props: { outcomes: readonly RaceOutcome[]; caption: string }) {
  return (
    <figure class="run-grid-figure">
      <div class="run-grid" role="img" aria-label={props.caption}>
        {props.outcomes.map((outcome, index) => (
          <span key={index} class={`cell ${outcome.picture.lost !== 0 ? 'cell-lost' : 'cell-safe'}`} />
        ))}
      </div>
      <figcaption>{props.caption}</figcaption>
    </figure>
  )
}

/** The runs as emoji squares, 10 per row, for a shared result. */
export function runGridText(outcomes: readonly RaceOutcome[]): string {
  const cells = outcomes.map((outcome) => (outcome.picture.lost !== 0 ? '🟥' : '🟩'))
  const rows: string[] = []
  for (let index = 0; index < cells.length; index += 10) rows.push(cells.slice(index, index + 10).join(''))
  return rows.join('\n')
}
