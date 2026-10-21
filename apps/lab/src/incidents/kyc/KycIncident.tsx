import type { AllDeliveriesSummary } from '@lab/core'
import { useMemo, useRef, useState } from 'preact/hooks'
import { useDeckRiding } from '../../game/deck-riding.ts'
import { Layer } from '../../game/Layer.tsx'
import { Message, type Said } from '../../game/Message.tsx'
import { NextButton } from '../../game/NextButton.tsx'
import { PauseGate } from '../../game/pause-gate.ts'
import { Readout } from '../../game/Readout.tsx'
import { runGridText } from '../../game/RunGrid.tsx'
import { openProof, ShareLinks, useShare } from '../../game/share.tsx'
import type { CodeLine } from '../../lib/code-line.ts'
import { countEvent } from '../../lib/count.ts'
import { COUNT_EVENT } from '../../lib/count-codes.ts'
import { CLEAN_UP_SIZERS, deeperCells, RegulatorScreen, useCleanUp } from './CleanUp.tsx'
import { CountControls, CountView, countCells, countSizers, lockedOut, useCount } from './Count.tsx'
import { FIX_SIZERS, FIX_VIEW, FixControls, FixScreen, fixCells, useFix } from './Fix.tsx'
import { CodeView, NightView, PHASE, REPRODUCE_SIZERS, reproduceCells, useReproduce } from './Reproduce.tsx'
import { SolvedScreen, solvedCells, solvedSaid, solvedSizers } from './Solved.tsx'
import type { PatchOption, Reproduction } from './setup.ts'
import { CLEAN_UP, CONSOLE, COUNT, FIX, READOUT, REPRODUCE, SOLVED } from './texts.ts'
import '../../game/game.css'
import './kyc.css'

/** The parts of the incident. Each has its own heading, screen, readout, message and controls. */
const STAGE = {
  REPRODUCE: 'REPRODUCE',
  COUNT: 'COUNT',
  FIX: 'FIX',
  SOLVED: 'SOLVED',
  DEEPER: 'DEEPER',
} as const
type Stage = (typeof STAGE)[keyof typeof STAGE]
const STAGES = Object.values(STAGE)

/** Where each stage sits in the progress line (SOLVED and DEEPER: all three steps done). */
const STEP_INDEX: Record<Stage, number> = { REPRODUCE: 0, COUNT: 1, FIX: 2, SOLVED: 3, DEEPER: 3 }

/** What the screen shows in step 1: the night, or the code it runs. */
const REPRO_VIEW = { NIGHT: 'NIGHT', CODE: 'CODE' } as const
type ReproView = (typeof REPRO_VIEW)[keyof typeof REPRO_VIEW]

interface Props {
  /** Build v0.1's real code, as game lines. */
  readonly v01: readonly CodeLine[]
  /** How many delivery orders Anna's two messages can arrive in, computed at build time. */
  readonly orders: number
  readonly patches: readonly PatchOption[]
  readonly shareUrl: string
  readonly bookUrl: string
  readonly proofId: string
}

/**
 * Incident 2 as a game, in the same console as incident 1: the steps; the step's heading and goal; a screen (the
 * night, the code, the orders, the patches, the records); a readout of five columns; one message line; the controls.
 * Each part holds everything it can ever show in one grid cell, so the console keeps one height in every state.
 */
export function KycIncident(props: Props) {
  const [stage, setStage] = useState<Stage>(STAGE.REPRODUCE)
  const [reproView, setReproView] = useState<ReproView>(REPRO_VIEW.NIGHT)
  const [reproduction, setReproduction] = useState<Reproduction | null>(null)
  const [fixed, setFixed] = useState<AllDeliveriesSummary | null>(null)
  const [paused, setPaused] = useState(false)
  // The first step shows at once on arrival; only later steps fade in (a move forward).
  const [moved, setMoved] = useState(false)
  const gate = useRef(new PauseGate())
  const machine = useRef<HTMLElement>(null)
  const deck = useRef<HTMLDivElement>(null)
  useDeckRiding(deck, machine)
  const headings = useRef<Partial<Record<Stage, HTMLHeadingElement | null>>>({})

  function goTo(next: Stage) {
    setMoved(true)
    setStage(next)
    requestAnimationFrame(() => {
      headings.current[next]?.focus({ preventScroll: true })
      const element = machine.current
      if (!element) return
      // Scroll only when the console's top is out of sight, so the page does not move for nothing.
      const top = element.getBoundingClientRect().top
      if (top < 60 || top > window.innerHeight * 0.4) {
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
    if (!now && gate.current.paused) {
      gate.current.resume()
      setPaused(false)
    }
  }

  const reproduce = useReproduce({
    gate: gate.current,
    onPlaying,
    onReproduced: (found) => setReproduction((before) => before ?? found),
  })
  const count = useCount({ orders: props.orders })
  const fix = useFix({
    onFixed: (summary) => {
      setFixed(summary)
      countEvent(COUNT_EVENT.FINISHED, 'kyc')
      goTo(STAGE.SOLVED)
    },
  })
  const cleanUp = useCleanUp()
  const share = useShare()

  const shareText =
    reproduction && count.summary && fixed
      ? [
          ...SOLVED.share(
            reproduction.tries,
            count.guess,
            count.summary.wrong,
            count.summary.orders,
            fix.tries,
          ),
          runGridText(count.summary.outcomes, lockedOut),
          props.shareUrl,
        ].join('\n')
      : ''

  const sizers = useMemo(
    () => [
      ...REPRODUCE_SIZERS,
      ...countSizers(props.orders),
      ...FIX_SIZERS,
      ...solvedSizers(props.orders, props.shareUrl),
      ...CLEAN_UP_SIZERS,
    ],
    [],
  )
  const said: Record<Stage, Said | null> = {
    REPRODUCE: reproduce.said,
    COUNT: count.said,
    FIX: fix.said,
    SOLVED: solvedSaid(props.orders, share, props.shareUrl),
    DEEPER: cleanUp.said,
  }

  const busy = reproduce.running || count.running || fix.running
  const current = STEP_INDEX[stage]
  const isRepro = stage === STAGE.REPRODUCE
  // Anna locked out on screen: the night ended with her not approved (the night itself carries the stamp).
  const annaLocked = reproduce.phase === PHASE.DIAGNOSE || reproduce.phase === PHASE.DONE

  const missions: Record<Stage, { heading: string; goal: string }> = {
    REPRODUCE: { heading: REPRODUCE.heading, goal: REPRODUCE.goal },
    COUNT: { heading: COUNT.heading, goal: COUNT.goal },
    FIX: { heading: FIX.heading, goal: FIX.goal(props.orders) },
    SOLVED: { heading: SOLVED.heading(props.orders), goal: SOLVED.goal },
    DEEPER: { heading: CLEAN_UP.heading, goal: CLEAN_UP.situation },
  }

  // The screen's switch: Night / Code in step 1, Patch / Result in step 3, hidden (but laid out) elsewhere.
  const toggleOn = stage === STAGE.REPRODUCE || stage === STAGE.FIX
  const secondOn = isRepro ? reproView === REPRO_VIEW.CODE : fix.view === FIX_VIEW.RESULT
  const secondOpen = isRepro || fix.last !== null
  function pickView(second: boolean) {
    if (isRepro) setReproView(second ? REPRO_VIEW.CODE : REPRO_VIEW.NIGHT)
    else if (!second) fix.show(FIX_VIEW.PATCH)
    else if (fix.last) fix.show(FIX_VIEW.RESULT)
  }
  // A patch that still locks Anna out, on screen: its readout gets the red edge.
  const fixLost =
    fix.last !== null &&
    fix.last.summary.wrong > 0 &&
    fix.last.id === fix.choice &&
    fix.view === FIX_VIEW.RESULT &&
    fix.filling === null
  // The first move, spotlit: after the normal night and until the first cut, the cuts stand out.
  const spotlit = isRepro && reproView === REPRO_VIEW.NIGHT && reproduce.hinting && !reproduce.running
  // "Start the night again": once a night has locked Anna out, a way back to the cuts.
  const canRestart = reproduce.phase === PHASE.DIAGNOSE

  return (
    <section
      ref={machine}
      class={`console machine kyc${busy ? ' is-running' : ''}${moved ? ' moved' : ''}${spotlit ? ' is-spotlit' : ''}`}
      aria-label={CONSOLE.label}
    >
      <header class="m-head">
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
              <span class="name">{name}</span>
            </li>
          ))}
        </ol>
        <div class="m-status">
          <span class="m-run" aria-hidden="true">
            <span class="led" />
            <span class="m-run-label">{CONSOLE.running}</span>
          </span>
          {/* Always laid out, so the header keeps its height; between nights it is invisible and out of reach. */}
          <button
            type="button"
            class={`btn-2 m-pause${reproduce.running ? '' : ' is-idle'}`}
            aria-pressed={paused}
            aria-hidden={reproduce.running ? undefined : 'true'}
            tabIndex={reproduce.running ? undefined : -1}
            disabled={!reproduce.running}
            onClick={togglePause}
          >
            <span class="label-stack">
              <span class={paused ? 'is-off' : ''}>{CONSOLE.pause}</span>
              <span class={paused ? '' : 'is-off'}>{CONSOLE.resume}</span>
            </span>
          </button>
        </div>
      </header>

      <div class="m-body">
        <div class="stack m-mission">
          {STAGES.map((name) => (
            <Layer key={name} on={stage === name}>
              <h2
                ref={(element) => {
                  headings.current[name] = element
                }}
                tabIndex={-1}
                class="m-h"
              >
                {name === STAGE.SOLVED ? (
                  <span class="ok" aria-hidden="true">
                    ✓{' '}
                  </span>
                ) : null}
                {missions[name].heading}
              </h2>
              <p class="m-goal">{missions[name].goal}</p>
            </Layer>
          ))}
        </div>

        <div class="m-display" data-stage={stage}>
          <div class="m-titlebar">
            <span class="m-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span class="stack m-label">
              {STAGES.map((name) => (
                <span
                  key={name}
                  class={stage === name ? '' : 'is-off'}
                  aria-hidden={stage === name ? undefined : 'true'}
                >
                  <span class="long">{CONSOLE.screen[name].long}</span>
                  <span class="short">{CONSOLE.screen[name].short}</span>
                </span>
              ))}
            </span>
            <fieldset
              class={`m-toggle${toggleOn ? '' : ' is-off'}`}
              inert={!toggleOn}
              aria-hidden={toggleOn ? undefined : 'true'}
            >
              <legend class="visually-hidden">{CONSOLE.viewsLabel}</legend>
              <button type="button" class="m-seg" aria-pressed={!secondOn} onClick={() => pickView(false)}>
                <span class="label-stack">
                  <span class={isRepro ? '' : 'is-off'}>{CONSOLE.views.NIGHT}</span>
                  <span class={isRepro ? 'is-off' : ''}>{CONSOLE.views.PATCH}</span>
                </span>
              </button>
              <button
                type="button"
                class="m-seg"
                aria-pressed={secondOn}
                aria-disabled={secondOpen ? undefined : 'true'}
                onClick={() => pickView(true)}
              >
                <span class="label-stack">
                  <span class={isRepro ? '' : 'is-off'}>{CONSOLE.views.CODE}</span>
                  <span class={isRepro ? 'is-off' : ''}>{CONSOLE.views.RESULT}</span>
                </span>
              </button>
            </fieldset>
          </div>
          <div class="m-screen-wrap">
            <div class="stack m-screen">
              <Layer on={isRepro && reproView === REPRO_VIEW.NIGHT}>
                <NightView game={reproduce} />
              </Layer>
              <Layer on={isRepro && reproView === REPRO_VIEW.CODE} fill>
                <CodeView lines={props.v01} label={CONSOLE.codeLabel} />
              </Layer>
              <Layer on={stage === STAGE.COUNT}>
                <CountView game={count} orders={props.orders} />
              </Layer>
              <Layer on={stage === STAGE.FIX}>
                <FixScreen game={fix} patches={props.patches} orders={props.orders} />
              </Layer>
              <Layer on={stage === STAGE.SOLVED}>
                <SolvedScreen fixed={fixed} orders={props.orders}>
                  <ShareLinks
                    share={share}
                    shareText={shareText}
                    shareUrl={props.shareUrl}
                    bookUrl={props.bookUrl}
                    texts={SOLVED}
                  />
                </SolvedScreen>
              </Layer>
              <Layer on={stage === STAGE.DEEPER}>
                <RegulatorScreen game={cleanUp} />
              </Layer>
            </div>
            {/* A light crosses the screen when the next step loads. */}
            {moved ? <span key={stage} class="m-sweep" aria-hidden="true" /> : null}
          </div>
        </div>

        <div class="stack m-readout">
          <Layer on={stage === STAGE.REPRODUCE}>
            <Readout
              title={READOUT.reproduce.title}
              subtitle={READOUT.reproduce.subtitle}
              cells={reproduceCells(reproduce.applicant, !reproduce.running)}
              lost={annaLocked}
            />
          </Layer>
          <Layer on={stage === STAGE.COUNT}>
            <Readout
              title={READOUT.count.title}
              subtitle={READOUT.count.subtitle}
              cells={countCells(reproduction, count, props.orders)}
            />
          </Layer>
          <Layer on={stage === STAGE.FIX}>
            <Readout
              title={READOUT.fix.title}
              subtitle={READOUT.fix.subtitle}
              cells={fixCells(count.summary, fix, props.orders)}
              lost={fixLost}
            />
          </Layer>
          <Layer on={stage === STAGE.SOLVED}>
            <Readout
              title={READOUT.solved.title}
              subtitle={READOUT.solved.subtitle}
              cells={solvedCells(count.summary, props.orders)}
            />
          </Layer>
          <Layer on={stage === STAGE.DEEPER}>
            <Readout
              title={READOUT.deeper.title}
              subtitle={READOUT.deeper.subtitle}
              cells={deeperCells(cleanUp)}
            />
          </Layer>
        </div>

        <Message said={said[stage]} sizers={sizers} />

        <div ref={deck} class="stack m-deck">
          <Layer on={stage === STAGE.REPRODUCE}>
            <div class="m-deck-row">
              <NextButton
                open={reproduction !== null && !reproduce.running}
                label={REPRODUCE.next}
                locked={REPRODUCE.nextLocked}
                onClick={() => goTo(STAGE.COUNT)}
              />
              <button
                type="button"
                class={`link m-link-btn${canRestart ? '' : ' is-off'}`}
                aria-hidden={canRestart ? undefined : 'true'}
                tabIndex={canRestart ? undefined : -1}
                onClick={reproduce.again}
              >
                {REPRODUCE.again}
              </button>
            </div>
          </Layer>
          <Layer on={stage === STAGE.COUNT}>
            <CountControls game={count} orders={props.orders} onNext={() => goTo(STAGE.FIX)} />
          </Layer>
          <Layer on={stage === STAGE.FIX}>
            <FixControls game={fix} />
          </Layer>
          <Layer on={stage === STAGE.SOLVED}>
            <div class="m-deck-row">
              <button type="button" class="btn" onClick={() => openProof(props.proofId)}>
                {SOLVED.readCode}
              </button>
              <button type="button" class="btn-2" onClick={() => goTo(STAGE.DEEPER)}>
                {CLEAN_UP.open}
              </button>
            </div>
          </Layer>
          <Layer on={stage === STAGE.DEEPER}>
            {/* No filled button here: the move is one of the three choices on the screen (Saba, 2026-10-19). */}
            <div class="m-deck-row">
              <button type="button" class="btn-2" onClick={() => goTo(STAGE.SOLVED)}>
                {CLEAN_UP.back}
              </button>
              <button type="button" class="btn-2" onClick={() => openProof(props.proofId)}>
                {SOLVED.readCode}
              </button>
            </div>
          </Layer>
        </div>
      </div>
    </section>
  )
}
