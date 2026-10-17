/** How a number in the readout reads: plain, waiting for a result, money lost, or safe. */
export const READOUT_TONE = { PLAIN: 'PLAIN', PENDING: 'PENDING', LOST: 'LOST', SAFE: 'SAFE' } as const
export type ReadoutTone = (typeof READOUT_TONE)[keyof typeof READOUT_TONE]

export interface ReadoutCell {
  readonly label: string
  readonly value: string
  /** A shorter form for a narrow console (whole amounts, "36/54", a short name). */
  readonly short?: string
  readonly tone?: ReadoutTone
  /** Takes two of the five columns (a name, not a number). */
  readonly wide?: boolean
}

const TONE_CLASS: Record<ReadoutTone, string> = {
  PLAIN: '',
  PENDING: 'pending',
  LOST: 'is-lost',
  SAFE: 'is-safe',
}

/**
 * The strip of numbers under the screen: always five columns, so it keeps one shape in every state. Labels may wrap
 * (a longer language later); the console's stacks absorb that. A value is always one line, and never decides how
 * wide its column is, so a number that changes moves nothing. It fades in where it stands (keyed by its value).
 */
export function Readout(props: {
  title: string
  subtitle: string
  cells: readonly ReadoutCell[]
  lost?: boolean
}) {
  return (
    <section class={`readout${props.lost ? ' lost' : ''}`} aria-label={props.title}>
      <h3 class="readout-title">
        {props.title} <span class="sub">{props.subtitle}</span>
      </h3>
      <dl class="readout-cells">
        {props.cells.map((cell) => (
          <div key={cell.label} class={`rc${cell.wide ? ' wide' : ''}`}>
            <dt>{cell.label}</dt>
            <dd class={`tnum ${TONE_CLASS[cell.tone ?? READOUT_TONE.PLAIN]}`.trim()} key={cell.value}>
              {cell.short && cell.short !== cell.value ? (
                <>
                  <span class="long">{cell.value}</span>
                  <span class="short">{cell.short}</span>
                </>
              ) : (
                cell.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
