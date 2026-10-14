import { formatCents, type MoneyPicture, type RaceOutcome } from '@lab/core'
import type { CodeLine } from '../../lib/code-line.ts'

export type RequestState = {
  /** Index of the code line the request waits at or just ran; null before it starts. */
  readonly line: number | null
  readonly status: 'waiting' | 'paid' | 'refused' | 'unknown' | 'slow'
}

/** One request's code, with step numbers and the current line highlighted. */
export function RequestPanel(props: {
  name: string
  lines: readonly CodeLine[]
  state: RequestState
  /** When set, each step line becomes a button: "A gets slow after this line". */
  onPick?: ((stepNumber: number) => void) | undefined
  picked?: number | null | undefined
  /** On phones, show only the current line (the other request runs the same code). */
  compact?: boolean
}) {
  let stepNumber = 0
  return (
    <section
      class={`request request-${props.name.toLowerCase()}${props.compact ? ' request-compact' : ''}`}
      aria-label={`Request ${props.name}`}
    >
      <header class="request-head">
        <span class="request-name">Request {props.name}</span>
        <span class={`chip chip-${props.state.status}`}>
          {props.state.line === null && props.state.status === 'waiting'
            ? 'ready'
            : statusText(props.state.status)}
        </span>
      </header>
      {props.compact ? (
        <p class="request-note">Same code as request A; only the current line is shown.</p>
      ) : null}
      <ol class="code">
        {props.lines.map((line, index) => {
          if (line.step) stepNumber += 1
          const number = line.step ? stepNumber : null
          const current = props.state.line === index
          const content = (
            <>
              <span class="line-number" aria-hidden="true">
                {number ?? ''}
              </span>
              <code>{line.text.trimEnd()}</code>
              {line.step ? <span class="line-label">{line.step}</span> : null}
            </>
          )
          return (
            <li
              key={index}
              class={`line${current ? ' current' : ''}${line.step ? ' step' : ''}${index === 0 || index === props.lines.length - 1 ? ' frame' : ''}`}
            >
              {props.onPick && number !== null ? (
                <button
                  type="button"
                  class={`line-pick${props.picked === number ? ' picked' : ''}`}
                  aria-pressed={props.picked === number}
                  aria-label={`Make request ${props.name} slow after line ${number}: ${line.step}`}
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

function statusText(status: RequestState['status']): string {
  switch (status) {
    case 'waiting':
      return 'running'
    case 'slow':
      return 'slow network…'
    case 'paid':
      return 'paid out'
    case 'refused':
      return 'refused'
    case 'unknown':
      return 'unknown'
  }
}

/** Where the customer's money is: our books next to the bank's own record. */
export function MoneyPanel(props: { picture: MoneyPicture; final: boolean }) {
  const { picture, final } = props
  const lost = picture.lost !== 0
  return (
    <dl class={`money${final && lost ? ' money-lost' : ''}${final && !lost ? ' money-safe' : ''}`}>
      <div>
        <dt>Customer had</dt>
        <dd>{formatCents(picture.deposited)}</dd>
      </div>
      <div>
        <dt>Balance shows</dt>
        <dd>{formatCents(picture.available)}</dd>
      </div>
      <div>
        <dt>On hold</dt>
        <dd>{formatCents(picture.held)}</dd>
      </div>
      <div>
        <dt>Bank paid out</dt>
        <dd>{formatCents(picture.paidOut)}</dd>
      </div>
      {final ? (
        <div class="money-verdict">
          <dt>{lost ? 'Exchange is short' : 'Money lost'}</dt>
          <dd>
            {lost ? (
              <>
                <span aria-hidden="true">✗ </span>
                {formatCents(Math.abs(picture.lost))}
              </>
            ) : (
              <>
                <span aria-hidden="true">✓ </span>none
              </>
            )}
          </dd>
        </div>
      ) : null}
    </dl>
  )
}

/** Every order as one square: red lost money, green safe, grey impossible (blocked by a lock). */
export function OrderGrid(props: { outcomes: readonly RaceOutcome[]; label: string }) {
  return (
    <figure class="grid-figure">
      <div class="order-grid" role="img" aria-label={props.label}>
        {props.outcomes.map((outcome, index) => (
          <span
            key={index}
            class={`cell ${!outcome.possible ? 'cell-impossible' : outcome.picture.lost !== 0 ? 'cell-lost' : 'cell-safe'}`}
          />
        ))}
      </div>
      <figcaption>{props.label}</figcaption>
    </figure>
  )
}
