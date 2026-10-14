import { type AllRunsSummary, allRuns, withdrawV01 } from '@lab/core'
import { useState } from 'preact/hooks'
import { RunGrid } from '../../game/RunGrid.tsx'
import { AMOUNT, OPENING } from './setup.ts'
import { COUNT } from './texts.ts'

/** Step 2: guess, then the machine runs build v0.1 every way it can run. */
export function Count(props: {
  runs: number
  onCounted: (summary: AllRunsSummary, guess: string) => void
  onNext: () => void
}) {
  const [guess, setGuess] = useState('')
  const [summary, setSummary] = useState<AllRunsSummary | null>(null)
  const [running, setRunning] = useState(false)

  async function run() {
    setRunning(true)
    const result = await allRuns(withdrawV01, OPENING, AMOUNT)
    setSummary(result)
    setRunning(false)
    props.onCounted(result, guess)
  }

  return (
    <section class="stage">
      <p class="goal">{COUNT.question(props.runs)}</p>
      <div class="guess-row">
        <label>
          {COUNT.guessLabel}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={props.runs}
            value={guess}
            onInput={(event) => setGuess((event.target as HTMLInputElement).value)}
          />
        </label>
        <button type="button" class="button primary" disabled={running} onClick={run}>
          {COUNT.run(props.runs)}
        </button>
      </div>
      {summary ? (
        <>
          <RunGrid outcomes={summary.outcomes} caption={COUNT.result(summary.losing, summary.runs, guess)} />
          <button type="button" class="button primary" onClick={props.onNext}>
            {COUNT.next}
          </button>
        </>
      ) : null}
    </section>
  )
}
