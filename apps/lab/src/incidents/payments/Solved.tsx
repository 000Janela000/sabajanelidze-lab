import type { AllRunsSummary } from '@lab/core'
import { useState } from 'preact/hooks'
import { RunGrid } from '../../game/RunGrid.tsx'
import { CleanUp } from './CleanUp.tsx'
import { COUNT, SOLVED } from './texts.ts'

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
      proof.querySelector<HTMLElement>(':scope > summary')?.focus()
    }
  }

  return (
    <>
      <RunGrid
        outcomes={props.fixed.outcomes}
        texts={{
          of: COUNT.of(props.fixed.runs),
          loseMoney: COUNT.loseMoney,
          legendSafe: COUNT.legendSafe,
          legendLost: COUNT.legendLost,
          caption: <strong>{SOLVED.grid(props.fixed.runs)}</strong>,
          summary: SOLVED.grid(props.fixed.runs),
        }}
      />
      <p class="why">{SOLVED.why}</p>
      <div class="actions">
        <button type="button" class="btn" onClick={openProof}>
          {SOLVED.readCode}
        </button>
        <a class="btn-2" href={props.bookUrl}>
          {SOLVED.book}
        </a>
        <button type="button" class="btn-2" onClick={() => copy(props.shareText, COPY.RESULT)}>
          {copied === COPY.RESULT ? SOLVED.copied : SOLVED.copyResult}
        </button>
        <button type="button" class="btn-2" onClick={() => copy(props.shareUrl, COPY.LINK)}>
          {copied === COPY.LINK ? SOLVED.linkCopied : SOLVED.sendToCto}
        </button>
      </div>
      {copied === COPY.FAILED ? <p class="why">{SOLVED.copyFailed(props.shareUrl)}</p> : null}
      <CleanUp />
    </>
  )
}
