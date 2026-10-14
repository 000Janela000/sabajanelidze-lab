export interface BriefingTexts {
  readonly stamp: string
  readonly duration: string
  readonly situation: string
  readonly steps: ReadonlyArray<{ readonly name: string; readonly rest: string }>
  readonly start: string
  readonly skip: string
}

/** The first thing a visitor sees: the situation in one sentence, the steps, and how long it takes. */
export function BriefingCard(props: { texts: BriefingTexts; onStart: () => void; skipHref: string }) {
  const { texts } = props
  return (
    <div class="brief">
      <div class="brief-top">
        <span class="nb-stamp">{texts.stamp}</span>
        <span class="time">{texts.duration}</span>
      </div>
      <p class="brief-lead">{texts.situation}</p>
      <ol class="brief-steps">
        {texts.steps.map((step, index) => (
          <li key={step.name}>
            <span class="num">{index + 1}</span> <b>{step.name}</b> {step.rest}
          </li>
        ))}
      </ol>
      <div class="brief-actions">
        <button type="button" class="nb-btn" onClick={props.onStart}>
          {texts.start}
        </button>
        <a class="nb-link" href={props.skipHref}>
          {texts.skip}
        </a>
      </div>
    </div>
  )
}
