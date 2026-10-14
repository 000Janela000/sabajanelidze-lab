import {
  type AllRunsSummary,
  allRuns,
  pauseAfter,
  type Withdraw,
  withdraw,
  withdrawCheckTwice,
  withdrawLockRead,
} from '@lab/core'
import { useState } from 'preact/hooks'
import { RunGrid } from '../../game/RunGrid.tsx'
import { AMOUNT, OPENING, type PatchId, type PatchOption } from './setup.ts'
import { COUNT, FIX } from './texts.ts'

const PATCH_CODE: Record<PatchId, Withdraw> = {
  CHECK_TWICE: withdrawCheckTwice,
  RESERVE: withdraw,
  LOCK_READ: withdrawLockRead,
}

/** Step 3: the visitor picks a patch; the machine attacks it with every way the two requests can run. */
export function Fix(props: {
  patches: readonly PatchOption[]
  onTry: () => void
  onFixed: (summary: AllRunsSummary) => void
}) {
  const [choice, setChoice] = useState<PatchId | null>(null)
  const [result, setResult] = useState<{ summary: AllRunsSummary; losingLine: number | null } | null>(null)
  const [running, setRunning] = useState(false)

  async function attack() {
    if (!choice) return
    setRunning(true)
    props.onTry()
    const code = PATCH_CODE[choice]
    const summary = await allRuns(code, OPENING, AMOUNT)
    let losingLine: number | null = null
    if (summary.losing > 0) {
      for (let line = 1; line <= summary.linesPerRequest; line++) {
        if ((await pauseAfter(code, OPENING, AMOUNT, line)).picture.lost !== 0) {
          losingLine = line
          break
        }
      }
    }
    setResult({ summary, losingLine })
    setRunning(false)
    if (summary.losing === 0) props.onFixed(summary)
  }

  return (
    <>
      <p class="goal">{FIX.goal}</p>
      <fieldset class="patches">
        <legend class="visually-hidden">{FIX.patchesLegend}</legend>
        {props.patches.map((patch) => (
          <label key={patch.id} class={`patch${choice === patch.id ? ' chosen' : ''}`}>
            <input
              type="radio"
              name="patch"
              value={patch.id}
              checked={choice === patch.id}
              onChange={() => setChoice(patch.id)}
            />
            <span class="dot" aria-hidden="true" />
            <span class="name">{FIX.patches[patch.id].name}</span>
            <span class="sum">{FIX.patches[patch.id].summary}</span>
            <details>
              <summary>{FIX.showCode}</summary>
              <pre>
                <code>{patch.lines.map((line) => line.text).join('\n')}</code>
              </pre>
            </details>
          </label>
        ))}
      </fieldset>
      <div class="attack">
        <button type="button" class="nb-btn" disabled={!choice || running} onClick={attack}>
          {FIX.attack}
        </button>
      </div>
      {result && result.summary.losing > 0 ? (
        <div aria-live="polite">
          <RunGrid
            outcomes={result.summary.outcomes}
            texts={{
              of: COUNT.of(result.summary.runs),
              loseMoney: COUNT.loseMoney,
              legendSafe: COUNT.legendSafe,
              legendLost: COUNT.legendLost,
              figure: FIX.figure,
              caption: (
                <>
                  <strong>
                    {FIX.stillLoses(result.summary.losing, result.summary.runs, result.losingLine)}
                  </strong>{' '}
                  {FIX.stillLosesWhy}
                </>
              ),
              summary: FIX.stillLoses(result.summary.losing, result.summary.runs, result.losingLine),
            }}
          />
        </div>
      ) : null}
    </>
  )
}
