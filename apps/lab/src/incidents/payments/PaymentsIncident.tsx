import type { AllRunsSummary } from '@lab/core'
import { useRef, useState } from 'preact/hooks'
import { BriefingCard } from '../../game/BriefingCard.tsx'
import { runGridText } from '../../game/RunGrid.tsx'
import { StepStrip } from '../../game/StepStrip.tsx'
import type { CodeLine } from '../../lib/code-line.ts'
import { Count } from './Count.tsx'
import { Fix } from './Fix.tsx'
import { Reproduce } from './Reproduce.tsx'
import { Solved } from './Solved.tsx'
import type { PatchOption, Reproduction } from './setup.ts'
import { BRIEFING, COUNT, FIX, REPRODUCE, SOLVED, STEPS_STRIP_LABEL } from './texts.ts'
import '../../game/game.css'

const STAGE = {
  BRIEFING: 'BRIEFING',
  REPRODUCE: 'REPRODUCE',
  COUNT: 'COUNT',
  FIX: 'FIX',
  SOLVED: 'SOLVED',
} as const
type Stage = (typeof STAGE)[keyof typeof STAGE]

const STRIP_INDEX: Record<Stage, number> = { BRIEFING: -1, REPRODUCE: 0, COUNT: 1, FIX: 2, SOLVED: 3 }

interface Props {
  /** Build v0.1's real code, as game lines. */
  readonly v01: readonly CodeLine[]
  /** How many distinct ways build v0.1 can run, computed from the code at build time. */
  readonly runs: number
  readonly patches: readonly PatchOption[]
  readonly shareUrl: string
  readonly bookUrl: string
  readonly proofId: string
}

/** Incident 1 as a game: briefing → reproduce → count → fix → solved (with clean-up), in one notebook section. */
export function PaymentsIncident(props: Props) {
  const [stage, setStage] = useState<Stage>(STAGE.BRIEFING)
  const [reproduction, setReproduction] = useState<Reproduction | null>(null)
  const [counted, setCounted] = useState<{ summary: AllRunsSummary; guess: string } | null>(null)
  const [patchTries, setPatchTries] = useState(0)
  const [fixed, setFixed] = useState<AllRunsSummary | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  function goTo(next: Stage) {
    setStage(next)
    requestAnimationFrame(() => {
      heading.current?.focus()
      heading.current?.scrollIntoView({ block: 'nearest' })
    })
  }

  const steps = BRIEFING.steps.map((step) => step.name)
  const shareText =
    reproduction && counted && fixed
      ? [
          ...SOLVED.share(
            reproduction.tries,
            counted.guess,
            counted.summary.losing,
            counted.summary.runs,
            patchTries,
          ),
          runGridText(counted.summary.outcomes),
          props.shareUrl,
        ].join('\n')
      : ''

  const receipts = (
    <>
      {reproduction && stage !== STAGE.REPRODUCE ? (
        <p class="receipt">
          <span class="x">✗</span>
          <span class="nb-mono">
            {COUNT.receipt(
              reproduction.tries,
              reproduction.line,
              reproduction.paidOut,
              reproduction.available,
              reproduction.short,
            )}
          </span>
        </p>
      ) : null}
      {counted && (stage === STAGE.FIX || stage === STAGE.SOLVED) ? (
        <p class="receipt">
          <span class="nb-mono">
            {FIX.receipt(counted.summary.losing, counted.summary.runs, counted.guess)}
          </span>
        </p>
      ) : null}
    </>
  )

  return (
    <section class="sec" id="play">
      <div class="sec-in">
        {stage === STAGE.BRIEFING ? (
          <p class="margin">
            {BRIEFING.margin}
            <small>{BRIEFING.duration}</small>
          </p>
        ) : (
          <StepStrip label={STEPS_STRIP_LABEL} steps={steps} current={STRIP_INDEX[stage]} />
        )}
        <div>
          {stage === STAGE.BRIEFING ? (
            <BriefingCard
              texts={BRIEFING}
              onStart={() => goTo(STAGE.REPRODUCE)}
              skipHref={`#${props.proofId}`}
            />
          ) : (
            <>
              {receipts}
              <h2 ref={heading} tabIndex={-1} class="step-h">
                {stage === STAGE.SOLVED && fixed ? (
                  <>
                    <span class="ok" aria-hidden="true">
                      ✓
                    </span>
                    {SOLVED.heading(fixed.runs)}
                  </>
                ) : stage === STAGE.REPRODUCE ? (
                  REPRODUCE.heading
                ) : stage === STAGE.COUNT ? (
                  COUNT.heading
                ) : (
                  FIX.heading
                )}
              </h2>
              {stage === STAGE.REPRODUCE ? (
                <Reproduce
                  lines={props.v01}
                  onReproduced={setReproduction}
                  onNext={() => goTo(STAGE.COUNT)}
                />
              ) : null}
              {stage === STAGE.COUNT ? (
                <Count
                  runs={props.runs}
                  onCounted={(summary, guess) => setCounted({ summary, guess })}
                  onNext={() => goTo(STAGE.FIX)}
                />
              ) : null}
              {stage === STAGE.FIX ? (
                <Fix
                  patches={props.patches}
                  onTry={() => setPatchTries((count) => count + 1)}
                  onFixed={(summary) => {
                    setFixed(summary)
                    goTo(STAGE.SOLVED)
                  }}
                />
              ) : null}
              {stage === STAGE.SOLVED && fixed ? (
                <Solved
                  fixed={fixed}
                  shareText={shareText}
                  shareUrl={props.shareUrl}
                  bookUrl={props.bookUrl}
                  proofId={props.proofId}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
