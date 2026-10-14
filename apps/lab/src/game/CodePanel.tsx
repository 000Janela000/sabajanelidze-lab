import type { Step } from '@lab/core'
import type { CodeLine } from '../lib/code-line.ts'
import type { RequestState } from './request-state.ts'

export interface CodePanelTexts {
  readonly title: string
  readonly state: Record<RequestState, string>
  readonly step: Record<Step, string>
  /** Accessible name of a line button, for example "Make request A slow after line 2: read the balance". */
  readonly pickLabel: (line: number, step: string) => string
  /** Shown on phones when only the current line is visible. */
  readonly compactNote?: string
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
  readonly picked?: number | null | undefined
  /** On phones, show only the current line. */
  readonly compact?: boolean
  /** Draws attention to the tappable lines until the first tap. */
  readonly hinting?: boolean
}

/** One request's real code, with step numbers, plain labels and the current line highlighted. */
export function CodePanel(props: CodePanelProps) {
  let stepNumber = 0
  const classes = [
    'code-panel',
    props.compact ? 'code-panel-compact' : '',
    props.hinting ? 'code-panel-hinting' : '',
  ]
  return (
    <section class={classes.filter(Boolean).join(' ')} aria-label={props.texts.title} data-request={props.id}>
      <header class="code-panel-head">
        <span class="code-panel-title">{props.texts.title}</span>
        <span class={`chip chip-${props.state.toLowerCase()}`}>{props.texts.state[props.state]}</span>
      </header>
      {props.compact && props.texts.compactNote ? (
        <p class="code-panel-note">{props.texts.compactNote}</p>
      ) : null}
      <ol class="code">
        {props.lines.map((line, index) => {
          if (line.step) stepNumber += 1
          const number = line.step ? stepNumber : null
          const label = line.step ? props.texts.step[line.step] : null
          const classes = [
            'line',
            props.current === index ? 'current' : '',
            line.step ? 'step' : '',
            index === 0 || index === props.lines.length - 1 ? 'frame' : '',
          ]
          const content = (
            <>
              <span class="line-number" aria-hidden="true">
                {number ?? ''}
              </span>
              <code>{line.text.trimEnd()}</code>
              {label ? <span class="line-label">{label}</span> : null}
            </>
          )
          return (
            <li key={index} class={classes.filter(Boolean).join(' ')}>
              {props.onPick && number !== null && label ? (
                <button
                  type="button"
                  class={`line-pick${props.picked === number ? ' picked' : ''}`}
                  aria-pressed={props.picked === number}
                  aria-label={props.texts.pickLabel(number, label)}
                  onClick={() => props.onPick?.(number)}
                >
                  {content}
                </button>
              ) : (
                <div class="line-static">{content}</div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
