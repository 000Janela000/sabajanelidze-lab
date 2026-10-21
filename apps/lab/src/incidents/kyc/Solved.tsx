import type { AllDeliveriesSummary } from '@lab/core'
import type { ComponentChildren } from 'preact'
import { type Said, TONE } from '../../game/Message.tsx'
import { READOUT_TONE, type ReadoutCell } from '../../game/Readout.tsx'
import { RunGrid } from '../../game/RunGrid.tsx'
import { COPY, type Share } from '../../game/share.tsx'
import { lockedOut, ORDER_LABELS } from './Count.tsx'
import { PATCH } from './setup.ts'
import { COUNT, FIX, READOUT, SOLVED } from './texts.ts'

/** What the console says once the fix holds (or, if copying failed, the link to copy by hand). */
export function solvedSaid(orders: number, share: Share, shareUrl: string): Said {
  return share.copied === COPY.FAILED
    ? { tone: TONE.NONE, text: SOLVED.copyFailed(shareUrl) }
    : { tone: TONE.OK, text: SOLVED.grid(orders) }
}

export function solvedSizers(orders: number, shareUrl: string): Said[] {
  return [
    { tone: TONE.OK, text: SOLVED.grid(orders) },
    { tone: TONE.NONE, text: SOLVED.copyFailed(shareUrl) },
  ]
}

/** The win: every order, attacked, none locks Anna out, and why; then the ways to pass it on (`children`). */
export function SolvedScreen(props: {
  fixed: AllDeliveriesSummary | null
  orders: number
  children: ComponentChildren
}) {
  return (
    <div class="v-solved">
      <RunGrid
        outcomes={props.fixed?.outcomes ?? null}
        isLost={lockedOut}
        labels={ORDER_LABELS}
        runs={props.orders}
        texts={{
          of: COUNT.of(props.orders),
          loseMoney: COUNT.lockOut,
          legendSafe: COUNT.legendSafe,
          legendLost: COUNT.legendLost,
          unknown: READOUT.unknown,
          caption: SOLVED.why,
          summary: SOLVED.grid(props.orders),
        }}
      />
      {props.children}
    </div>
  )
}

/** The final numbers: build v0.1 against the fix. */
export function solvedCells(counted: AllDeliveriesSummary | null, orders: number): ReadoutCell[] {
  return [
    {
      label: READOUT.solved.v01,
      value: READOUT.fix.of(counted ? counted.wrong : READOUT.unknown, orders),
      tone: counted ? READOUT_TONE.LOST : READOUT_TONE.PENDING,
    },
    {
      label: READOUT.solved.fix,
      value: FIX.patches[PATCH.VERSION_ORDER].name,
      short: FIX.patches[PATCH.VERSION_ORDER].short,
      wide: true,
    },
    { label: READOUT.solved.fixLocks, value: READOUT.fix.of(0, orders), tone: READOUT_TONE.SAFE },
    { label: READOUT.solved.forgery, value: READOUT.fix.refused, tone: READOUT_TONE.SAFE },
  ]
}
