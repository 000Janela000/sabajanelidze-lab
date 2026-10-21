import { useState } from 'preact/hooks'

export const COPY = { RESULT: 'RESULT', LINK: 'LINK', FAILED: 'FAILED' } as const
export type Copied = (typeof COPY)[keyof typeof COPY]

export interface Share {
  readonly copied: Copied | null
  copy(text: string, what: Copied): Promise<void>
}

/** Copying the result or the link; when the clipboard refuses, the console says so and shows the link. */
export function useShare(): Share {
  const [copied, setCopied] = useState<Copied | null>(null)
  async function copy(text: string, what: Copied) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
    } catch {
      setCopied(COPY.FAILED)
    }
  }
  return { copied, copy }
}

/** Both labels in one cell, so the control is as wide as the longer one and never changes width. */
function Labels(props: { shown: number; texts: readonly string[] }) {
  return (
    <span class="label-stack">
      {props.texts.map((text, index) => (
        <span key={text} class={index === props.shown ? '' : 'is-off'}>
          {text}
        </span>
      ))}
    </span>
  )
}

export interface ShareTexts {
  readonly book: string
  readonly copyResult: string
  readonly copied: string
  readonly sendToCto: string
  readonly linkCopied: string
}

/** Book a call, copy the result, send the link: small, after the main action. */
export function ShareLinks(props: {
  share: Share
  shareText: string
  shareUrl: string
  bookUrl: string
  texts: ShareTexts
}) {
  const { share, texts } = props
  return (
    <p class="m-links">
      <a href={props.bookUrl}>{texts.book}</a>
      <button type="button" class="link" onClick={() => void share.copy(props.shareText, COPY.RESULT)}>
        <Labels shown={share.copied === COPY.RESULT ? 1 : 0} texts={[texts.copyResult, texts.copied]} />
      </button>
      <button type="button" class="link" onClick={() => void share.copy(props.shareUrl, COPY.LINK)}>
        <Labels shown={share.copied === COPY.LINK ? 1 : 0} texts={[texts.sendToCto, texts.linkCopied]} />
      </button>
    </p>
  )
}

/** Opens the proof card under the console and puts keyboard focus on it. */
export function openProof(proofId: string) {
  const proof = document.getElementById(proofId)
  if (proof instanceof HTMLDetailsElement) {
    proof.open = true
    proof.scrollIntoView({ block: 'start' })
    proof.querySelector<HTMLElement>(':scope > summary')?.focus()
  }
}
