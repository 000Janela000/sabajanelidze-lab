import type { Step } from '@lab/core'
import type { CodeLine } from '../lib/code-line.ts'
import { IndentedCode } from './CodeText.tsx'
import { REQUEST_STATE, type RequestState } from './request-state.ts'

export const LINE_STATE = { DONE: 'DONE', NOW: 'NOW', TODO: 'TODO' } as const
export type LineState = (typeof LINE_STATE)[keyof typeof LINE_STATE]

export interface CodePanelTexts {
  readonly title: string
  readonly tag: string
  readonly state: Record<RequestState, string>
  readonly step: Record<Step, string>
  /** Accessible name of a line button, for example "Make request A slow after line 2: read the balance". */
  readonly pickLabel: (line: number, step: string) => string
  readonly pause: string
  readonly compactNote: string
  readonly lineState: Record<LineState, string>
}

export interface CodePanelProps {
  readonly id: string
  readonly lines: readonly CodeLine[]
  /** Index of the code line the request waits at or just ran; null before it starts. */
  readonly current: number | null
  readonly state: RequestState
  readonly texts: CodePanelTexts
  /** When set, each step line becomes a button. */
  readonly onPick?: ((stepNumber: number) => void) | undefined
  /** A run is playing: the line buttons stay (so focus stays on them) but do nothing until it ends. */
  readonly busy?: boolean | undefined
  /** The step number after which this request was made slow, if any. */
  readonly paused?: number | null | undefined
  /** True when that pause made the exchange lose money. */
  readonly pausedLost?: boolean | undefined
  /** Draws attention to the tappable lines until the first tap. */
  readonly hinting?: boolean | undefined
  /** Show only the step labels and where the request is (request B). */
  readonly compact?: { readonly stepsDone: number } | undefined
}

/** One request's real code, with step numbers, plain labels and the current line highlighted. */
export function CodePanel(props: CodePanelProps) {
  const { texts } = props
  const classes = ['req', props.compact ? 'req-compact' : '', props.hinting ? 'req-hinting' : '']

  const head = (
    <header class="req-head">
      <strong>{texts.title}</strong> <span class="tag">{texts.tag}</span>{' '}
      <span
        class={`chip chip-${props.state.toLowerCase()}${props.pausedLost && props.state === 'PAID' ? ' chip-lost' : ''}`}
      >
        {texts.state[props.state]}
      </span>
    </header>
  )

  if (props.compact) {
    const done = props.compact.stepsDone
    const steps = props.lines.flatMap((line) => (line.step ? [line.step] : []))
    return (
      <section class={classes.filter(Boolean).join(' ')} aria-label={texts.title} data-request={props.id}>
        {head}
        <p class="note">{texts.compactNote}</p>
        <ol class="code">
          {steps.map((step, index) => {
            const state: LineState =
              index < done
                ? LINE_STATE.DONE
                : index === done && props.state === REQUEST_STATE.RUNNING
                  ? LINE_STATE.NOW
                  : LINE_STATE.TODO
            return (
              <li key={`${step}-${index}`} class={`line${state === LINE_STATE.NOW ? ' current' : ''}`}>
                <div class="row">
                  <span class="n">{index + 1}</span>
                  <span>{texts.step[step]}</span>
                  <span class="state">{texts.lineState[state]}</span>
                </div>
              </li>
            )
          })}
        </ol>
      </section>
    )
  }

  let stepNumber = 0
  return (
    <section class={classes.filter(Boolean).join(' ')} aria-label={texts.title} data-request={props.id}>
      {head}
      <ol class="code">
        {props.lines.map((line, index) => {
          if (line.step) stepNumber += 1
          const number = line.step ? stepNumber : null
          const label = line.step ? texts.step[line.step] : null
          const pausedHere = number !== null && props.paused === number
          const lineClasses = [
            'line',
            pausedHere && props.pausedLost ? 'lost' : props.current === index ? 'current' : '',
            number === null ? 'frame' : '',
          ]
          const content = (
            <>
              <span class="n" aria-hidden="true">
                {number ?? ''}
              </span>
              <IndentedCode tokens={line.tokens} />
              {label ? <span class="label">{label}</span> : null}
            </>
          )
          return (
            <li key={index} class={lineClasses.filter(Boolean).join(' ')}>
              {props.onPick && number !== null && label ? (
                <button
                  type="button"
                  class="row"
                  aria-pressed={pausedHere}
                  aria-disabled={props.busy ? 'true' : undefined}
                  aria-label={texts.pickLabel(number, label)}
                  onClick={() => {
                    if (!props.busy) props.onPick?.(number)
                  }}
                >
                  {content}
                </button>
              ) : (
                <div class="row">{content}</div>
              )}
              {pausedHere ? <p class="pause">{texts.pause}</p> : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
