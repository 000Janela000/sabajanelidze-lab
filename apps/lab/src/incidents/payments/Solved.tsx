import type { AllRunsSummary } from '@lab/core'
import { useState } from 'preact/hooks'
import { RunGrid } from '../../game/RunGrid.tsx'
import { CleanUp } from './CleanUp.tsx'
import { SOLVED } from './texts.ts'

const COPY = { RESULT: 'RESULT', LINK: 'LINK', FAILED: 'FAILED' } as const
type Copied = (typeof COPY)[keyof typeof COPY]

/** The win: the fix holds everywhere, then the ways out (the code, a call, sharing) and the clean-up. */
export function Solved(props: {
  fixed: AllRunsSummary
  shareText: string
  shareUrl: string
  bookUrl: string
  proofId: string
}) {
  const [copied, setCopied] = useState<Copied | null>(null)

  async function copy(text: string, what: Copied) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
    } catch {
      setCopied(COPY.FAILED)
    }
  }

  function openProof() {
    const proof = document.getElementById(props.proofId)
    if (proof instanceof HTMLDetailsElement) {
      proof.open = true
      proof.scrollIntoView({ block: 'start' })
      proof.querySelector('summary')?.focus()
    }
  }

  return (
    <section class="stage solved">
      <RunGrid outcomes={props.fixed.outcomes} caption={SOLVED.grid(props.fixed.runs)} />
      <p>{SOLVED.why}</p>
      <div class="actions">
        <button type="button" class="button primary" onClick={openProof}>
          {SOLVED.readCode}
        </button>
        <a class="button" href={props.bookUrl}>
          {SOLVED.book}
        </a>
        <button type="button" class="button" onClick={() => copy(props.shareText, COPY.RESULT)}>
          {copied === COPY.RESULT ? SOLVED.copied : SOLVED.copyResult}
        </button>
        <button type="button" class="button" onClick={() => copy(props.shareUrl, COPY.LINK)}>
          {copied === COPY.LINK ? SOLVED.linkCopied : SOLVED.sendToCto}
        </button>
      </div>
      {copied === COPY.FAILED ? <p class="note">{SOLVED.copyFailed(props.shareUrl)}</p> : null}
      <CleanUp />
    </section>
  )
}
