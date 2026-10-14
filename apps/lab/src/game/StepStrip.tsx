/** The incident's steps, with the current one marked: ① Reproduce ② Count ③ Fix. */
export function StepStrip(props: { label: string; steps: readonly string[]; current: number }) {
  return (
    <ol class="step-strip" aria-label={props.label}>
      {props.steps.map((step, index) => (
        <li
          key={step}
          class={index < props.current ? 'step-done' : index === props.current ? 'step-current' : 'step-todo'}
          aria-current={index === props.current ? 'step' : undefined}
        >
          <span class="step-number">{index + 1}</span> {step}
        </li>
      ))}
    </ol>
  )
}
