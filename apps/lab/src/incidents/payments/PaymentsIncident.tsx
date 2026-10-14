import type { AllRunsSummary } from '@lab/core'
import { useRef, useState } from 'preact/hooks'
import { PauseGate } from '../../game/pause-gate.ts'
import { runGridText } from '../../game/RunGrid.tsx'
import type { CodeLine } from '../../lib/code-line.ts'
import { Count } from './Count.tsx'
import { Fix } from './Fix.tsx'
import { Reproduce } from './Reproduce.tsx'
import { Solved } from './Solved.tsx'
import type { PatchOption, Reproduction } from './setup.ts'
import { CONSOLE, COUNT, FIX, REPRODUCE, SOLVED } from './texts.ts'
import '../../game/game.css'

const STAGE = {
  REPRODUCE: 'REPRODUCE',
  COUNT: 'COUNT',
  FIX: 'FIX',
  SOLVED: 'SOLVED',
} as const
type Stage = (typeof STAGE)[keyof typeof STAGE]

/** Where each stage sits in the progress line (SOLVED: all three steps done). */
const STEP_INDEX: Record<Stage, number> = { REPRODUCE: 0, COUNT: 1, FIX: 2, SOLVED: 3 }

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

/** Incident 1 as a game, inside the console: reproduce → count → fix → solved (with clean-up). */
export function PaymentsIncident(props: Props) {
  const [stage, setStage] = useState<Stage>(STAGE.REPRODUCE)
  const [reproduction, setReproduction] = useState<Reproduction | null>(null)
  const [counted, setCounted] = useState<{ summary: AllRunsSummary; guess: string } | null>(null)
  const [patchTries, setPatchTries] = useState(0)
  const [fixed, setFixed] = useState<AllRunsSummary | null>(null)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const gate = useRef(new PauseGate())
  const heading = useRef<HTMLHeadingElement>(null)

  function goTo(next: Stage) {
    setStage(next)
    requestAnimationFrame(() => {
      const element = heading.current
      if (!element) return
      element.focus({ preventScroll: true })
      // Scroll only when the new step's heading is out of sight, so the page does not jump.
      const top = element.getBoundingClientRect().top
      if (top < 80 || top > window.innerHeight * 0.6) {
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        element.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' })
      }
    })
  }

  function togglePause() {
    if (gate.current.paused) gate.current.resume()
    else gate.current.pause()
    setPaused(gate.current.paused)
  }

  function onPlaying(now: boolean) {
    setPlaying(now)
    if (!now && gate.current.paused) {
      gate.current.resume()
      setPaused(false)
    }
  }

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

  const current = STEP_INDEX[stage]
  const receipts = [
    reproduction && current > 0
      ? COUNT.receipt(
          reproduction.tries,
          reproduction.line,
          reproduction.paidOut,
          reproduction.available,
          reproduction.short,
        )
      : null,
    counted && current > 1 ? FIX.receipt(counted.summary.losing, counted.summary.runs, counted.guess) : null,
  ]

  return (
    <section class="console" aria-label={CONSOLE.label}>
      <header class="console-bar">
        <ol class="progress" aria-label={CONSOLE.progressLabel}>
          {CONSOLE.steps.map((name, index) => (
            <li
              key={name}
              class={index < current ? 'done' : index === current ? 'now' : 'later'}
              aria-current={index === current ? 'step' : undefined}
            >
              <span class="mark" aria-hidden="true">
                {index < current ? '✓' : index + 1}
              </span>
              {name}
            </li>
          ))}
        </ol>
        {playing ? (
          <button type="button" class="btn-2 console-pause" aria-pressed={paused} onClick={togglePause}>
            {paused ? CONSOLE.resume : CONSOLE.pause}
          </button>
        ) : null}
      </header>
      <div class="console-body">
        {receipts.some(Boolean) ? (
          <ul class="receipts">
            {receipts.map((text, index) =>
              text ? (
                <li key={index} class="receipt">
                  <span class={index === 0 ? 'x' : 'ok'} aria-hidden="true">
                    {index === 0 ? '✗' : '✓'}
                  </span>
                  <span class="tnum">{text}</span>
                </li>
              ) : null,
            )}
          </ul>
        ) : null}
        <div class="stage" key={stage}>
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
              gate={gate.current}
              onPlaying={onPlaying}
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
        </div>
      </div>
      <p class="console-foot">
        {CONSOLE.title} · {CONSOLE.timing}
      </p>
    </section>
  )
}
