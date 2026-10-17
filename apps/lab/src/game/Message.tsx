/** Whether a message reports a good outcome, a loss, or neither. */
export const TONE = { NONE: 'NONE', OK: 'OK', LOST: 'LOST' } as const
export type Tone = (typeof TONE)[keyof typeof TONE]

/** One thing the console says: an optional bold lead, then the text. */
export interface Said {
  readonly tone: Tone
  readonly lead?: string
  readonly text: string
}

const MARK: Record<Tone, string> = { NONE: '', OK: '✓', LOST: '✗' }

/**
 * The console's one message line, read out politely by screen readers. It is as tall as the longest thing it can
 * say: the longest messages are laid out invisibly in the same cell. They are drawn by CSS from attributes, so they
 * take space without being text on the page (not read, found or indexed).
 */
export function Message(props: { said: Said | null; sizers: readonly Said[] }) {
  const { said } = props
  return (
    <div class="m-message">
      {props.sizers.map((sizer) => (
        <p
          key={`${sizer.lead ?? ''}${sizer.text}`}
          class="m-sizer"
          aria-hidden="true"
          data-lead={`${MARK[sizer.tone]} ${sizer.lead ?? ''}`.trim()}
          data-text={sizer.text}
        />
      ))}
      <p class="m-live" aria-live="polite">
        {said ? (
          <>
            {said.tone === TONE.NONE ? null : (
              <>
                <span class={said.tone === TONE.OK ? 'ok' : 'x'} aria-hidden="true">
                  {MARK[said.tone]}
                </span>{' '}
              </>
            )}
            {said.lead ? (
              <>
                <b>{said.lead}</b>{' '}
              </>
            ) : null}
            {said.text}
          </>
        ) : null}
      </p>
    </div>
  )
}
