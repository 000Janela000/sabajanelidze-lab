export interface BriefingTexts {
  readonly kicker: string
  readonly situation: string
  readonly task: string
  readonly steps: readonly string[]
  readonly duration: string
  readonly start: string
  readonly skip: string
}

/** The first thing a visitor sees: the situation in one sentence, the steps, and how long it takes. */
export function BriefingCard(props: { texts: BriefingTexts; onStart: () => void; skipHref: string }) {
  const { texts } = props
  return (
    <section class="briefing" aria-labelledby="briefing-kicker">
      <p id="briefing-kicker" class="briefing-kicker">
        {texts.kicker}
      </p>
      <p class="briefing-situation">{texts.situation}</p>
      <p class="briefing-task">{texts.task}</p>
      <ol class="briefing-steps">
        {texts.steps.map((step, index) => (
          <li key={step}>
            <span class="step-number">{index + 1}</span> {step}
          </li>
        ))}
        <li class="briefing-duration">{texts.duration}</li>
      </ol>
      <div class="briefing-actions">
        <button type="button" class="button primary" onClick={props.onStart}>
          {texts.start}
        </button>
        <a class="briefing-skip" href={props.skipHref}>
          {texts.skip}
        </a>
      </div>
    </section>
  )
}
