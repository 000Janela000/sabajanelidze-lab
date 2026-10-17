import type { AllRunsSummary } from '@lab/core'
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { type Said, TONE } from '../../game/Message.tsx'
import { RunGrid } from '../../game/RunGrid.tsx'
import { COUNT, READOUT, SOLVED } from './texts.ts'

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

/** What the console says once the fix holds (or, if copying failed, the link to copy by hand). */
export function solvedSaid(fixRuns: number, share: Share, shareUrl: string): Said {
  return share.copied === COPY.FAILED
    ? { tone: TONE.NONE, text: SOLVED.copyFailed(shareUrl) }
    : { tone: TONE.OK, text: SOLVED.grid(fixRuns) }
}

export function solvedSizers(fixRuns: number, shareUrl: string): Said[] {
  return [
    { tone: TONE.OK, text: SOLVED.grid(fixRuns) },
    { tone: TONE.NONE, text: SOLVED.copyFailed(shareUrl) },
  ]
}

/** The win: every way to run, attacked, none loses money, and why; then the ways to pass it on (`children`). */
export function SolvedScreen(props: {
  fixed: AllRunsSummary | null
  fixRuns: number
  children: ComponentChildren
}) {
  return (
    <div class="v-solved">
      <RunGrid
        outcomes={props.fixed?.outcomes ?? null}
        runs={props.fixed?.runs ?? props.fixRuns}
        texts={{
          of: COUNT.of(props.fixRuns),
          loseMoney: COUNT.loseMoney,
          legendSafe: COUNT.legendSafe,
          legendLost: COUNT.legendLost,
          unknown: READOUT.unknown,
          caption: SOLVED.why,
          summary: SOLVED.grid(props.fixRuns),
        }}
      />
      {props.children}
    </div>
  )
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

/** Book a call, copy the result, send the link: small, after the main action. */
export function ShareLinks(props: { share: Share; shareText: string; shareUrl: string; bookUrl: string }) {
  const { share } = props
  return (
    <p class="m-links">
      <a href={props.bookUrl}>{SOLVED.book}</a>
      <button type="button" class="link" onClick={() => void share.copy(props.shareText, COPY.RESULT)}>
        <Labels shown={share.copied === COPY.RESULT ? 1 : 0} texts={[SOLVED.copyResult, SOLVED.copied]} />
      </button>
      <button type="button" class="link" onClick={() => void share.copy(props.shareUrl, COPY.LINK)}>
        <Labels shown={share.copied === COPY.LINK ? 1 : 0} texts={[SOLVED.sendToCto, SOLVED.linkCopied]} />
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
