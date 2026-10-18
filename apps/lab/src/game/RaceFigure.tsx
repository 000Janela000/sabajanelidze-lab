/*
 * The race figure: two requests as dots moving along the same steps, with what each step read, saved or paid.
 * Every frame comes from the real code running (the step scheduler), not from a drawn animation.
 * On lane A each step is a real button: tapping it makes A slow right after that step.
 */

export const LANE_STATE = {
  WAITING: 'WAITING',
  RUNNING: 'RUNNING',
  SLOW: 'SLOW',
  FINISHED: 'FINISHED',
} as const
export type LaneState = (typeof LANE_STATE)[keyof typeof LANE_STATE]

export interface Lane {
  /** How many steps this request has taken. */
  readonly done: number
  /** A short value per step once it ran, for example "100" or "20". */
  readonly values: readonly (string | null)[]
  readonly state: LaneState
  /** The end of the request in words ("paid 80", "refused"), once it finished. */
  readonly result: string | null
  /** True when this request paid out (it is one of the payouts). */
  readonly paid: boolean
}

export interface RaceFigureTexts {
  readonly figure: string
  readonly lane: (name: string) => string
  readonly pickLabel: (step: number, label: string) => string
  readonly slowHere: string
  /** Under lane A's steps, pointing up at them, until the first tap. */
  readonly yourMove: string
}

export interface RaceFigureProps {
  /** Plain labels, one per step, long ("read the balance") and short ("read"). */
  readonly steps: readonly { readonly long: string; readonly short: string }[]
  readonly lanes: { readonly A: Lane; readonly B: Lane }
  /** The step after which A gets slow, once picked. */
  readonly slowAfter: number | null
  /** The run is over and money was lost. */
  readonly lost: boolean
  readonly texts: RaceFigureTexts
  /** When set, the steps on lane A are buttons. */
  readonly onPick?: ((step: number) => void) | undefined
  /** A run is playing: the buttons stay (so focus stays on them) but do nothing until it ends. */
  readonly busy?: boolean | undefined
  /** Draws attention to lane A's buttons until the first tap. */
  readonly hinting?: boolean | undefined
}

function LaneRow(props: { name: 'A' | 'B'; lane: Lane; figure: RaceFigureProps }) {
  const { name, lane, figure } = props
  const columns = figure.steps.length + 1
  const position = lane.state === LANE_STATE.FINISHED ? figure.steps.length : lane.done
  const classes = [
    'lane',
    `lane-${name.toLowerCase()}`,
    lane.state === LANE_STATE.SLOW ? 'is-slow' : '',
    figure.lost && lane.paid ? 'is-lost' : '',
    lane.state === LANE_STATE.FINISHED ? 'is-done' : '',
  ]
  return (
    <div class={classes.filter(Boolean).join(' ')} style={{ '--cols': columns }}>
      <span class="lane-name" aria-hidden="true">
        {name}
      </span>
      <div class="track">
        <span class="rail" aria-hidden="true" />
        <span class="runner" aria-hidden="true" style={{ '--pos': position }}>
          <span class="runner-dot" />
        </span>
        {figure.steps.map((step, index) => {
          const ran = index < lane.done
          const pick = name === 'A' ? figure.onPick : undefined
          const nodeClasses = ['node', ran ? 'ran' : '', index === position && !ran ? 'is-next' : '']
          return (
            <div key={step.short} class={nodeClasses.filter(Boolean).join(' ')}>
              {pick ? (
                <button
                  type="button"
                  class="dot"
                  aria-pressed={figure.slowAfter === index + 1}
                  aria-disabled={figure.busy ? 'true' : undefined}
                  aria-label={figure.texts.pickLabel(index + 1, step.long)}
                  onClick={() => {
                    if (!figure.busy) pick(index + 1)
                  }}
                >
                  <span>{index + 1}</span>
                </button>
              ) : (
                <span class="dot" aria-hidden="true">
                  <span>{index + 1}</span>
                </span>
              )}
              <span class="val tnum">{lane.values[index] ?? ''}</span>
            </div>
          )
        })}
        <div class="node end">
          <span class="res">{lane.result ?? ''}</span>
        </div>
        {name === 'A' && figure.hinting && figure.onPick ? (
          <span class="your-move" aria-hidden="true">
            {figure.texts.yourMove}
          </span>
        ) : null}
        {name === 'A' && figure.slowAfter !== null ? (
          <span class="slow-mark" style={{ '--after': figure.slowAfter }}>
            <span>{figure.texts.slowHere}</span>
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** Two lanes, A and B, over the same steps. */
export function RaceFigure(props: RaceFigureProps) {
  const classes = [
    'race',
    props.hinting ? 'race-hinting' : '',
    props.onPick && !props.busy ? 'race-pickable' : '',
  ]
  return (
    <fieldset class={classes.filter(Boolean).join(' ')}>
      <legend class="visually-hidden">{props.texts.figure}</legend>
      <div class="race-head" aria-hidden="true" style={{ '--cols': props.steps.length + 1 }}>
        <span />
        <div class="race-cols">
          {props.steps.map((step, index) => (
            <span key={step.short}>
              <b>{index + 1}</b> <span class="long">{step.long}</span>
              <span class="short">{step.short}</span>
            </span>
          ))}
          <span />
        </div>
      </div>
      <LaneRow name="A" lane={props.lanes.A} figure={props} />
      <LaneRow name="B" lane={props.lanes.B} figure={props} />
    </fieldset>
  )
}
