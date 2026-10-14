/** The incident's steps in the notebook margin: 01 ▸ Reproduce · 02 Count · 03 Fix. */
export function StepStrip(props: { label: string; steps: readonly string[]; current: number }) {
  return (
    <ol class="rail" aria-label={props.label}>
      {props.steps.map((step, index) => (
        <li
          key={step}
          class={index < props.current ? 'done' : index === props.current ? 'now' : 'later'}
          aria-current={index === props.current ? 'step' : undefined}
        >
          <span class="n">{String(index + 1).padStart(2, '0')}</span>
          <span class="label">{step}</span>
        </li>
      ))}
    </ol>
  )
}
