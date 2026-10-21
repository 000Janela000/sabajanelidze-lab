import type { AllRunsSummary } from '@lab/core'
import type { ComponentChildren } from 'preact'
import { type Said, TONE } from '../../game/Message.tsx'
import { RunGrid, raceLost } from '../../game/RunGrid.tsx'
import { COPY, type Share } from '../../game/share.tsx'
import { COUNT, READOUT, SOLVED } from './texts.ts'

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
        isLost={raceLost}
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
