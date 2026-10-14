/* The runs and the first run's end state. No DOM here, so the build can draw the no-JavaScript fallback in Node. */
import { caption, frameAt, parseRun, type Run } from './frames.ts'
import { figureHtml } from './render.ts'
import { RUNS } from './runs.generated.ts'

export const LAB_URL = 'https://lab.sabajanelidze.com/day/payments'

/** The run shown first: A gets slow right after reading the balance, B runs past, both are paid. */
export const FIRST_RUN = 'AL AR100 BL BR100 BS20 BP80 AS20 AP80|PP|20|160'

export const runs: readonly Run[] = RUNS.map(parseRun)
export const first = Math.max(0, RUNS.indexOf(FIRST_RUN))

/** The end of the first run as HTML: what the page shows before (or without) JavaScript. */
export function endStateHtml(labUrl = LAB_URL): string {
  const run = runs[first] as Run
  return figureHtml(frameAt(run, run.steps.length), caption(run, first + 1, runs.length), labUrl)
}
