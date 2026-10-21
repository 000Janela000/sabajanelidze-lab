/** The way on: laid out from the start, locked (with the reason, in full contrast) until it is earned. */
export function NextButton(props: { open: boolean; label: string; locked: string; onClick: () => void }) {
  return (
    <button
      type="button"
      class={`btn m-next${props.open ? '' : ' is-locked'}`}
      aria-disabled={props.open ? undefined : 'true'}
      onClick={() => {
        if (props.open) props.onClick()
      }}
    >
      <span class="label-stack">
        <span class={props.open ? 'is-off' : ''}>
          <LockIcon /> {props.locked}
        </span>
        <span class={props.open ? '' : 'is-off'}>{props.label}</span>
      </span>
    </button>
  )
}

function LockIcon() {
  return (
    <svg class="lock" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h.5A1.5 1.5 0 0 1 13.5 8.5v5A1.5 1.5 0 0 1 12 15H4a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 4 7h.5Zm1.5 0h4V5a2 2 0 1 0-4 0v2Z"
      />
    </svg>
  )
}
