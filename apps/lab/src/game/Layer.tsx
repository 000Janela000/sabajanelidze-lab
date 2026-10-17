import type { ComponentChildren } from 'preact'

/**
 * One of several contents that share one grid cell (a parent with the class "stack"). The cell is as tall as its
 * tallest content at the current width, so showing another one moves nothing. A content that is not shown stays
 * laid out, but cannot be seen, reached by keyboard or read by a screen reader.
 * `fill` makes a content take the cell's height instead of setting it (code that scrolls inside its own box).
 */
export function Layer(props: { on: boolean; class?: string; fill?: boolean; children: ComponentChildren }) {
  const classes = ['layer', props.fill ? 'fill' : '', props.on ? '' : 'is-off', props.class ?? '']
  return (
    <div
      class={classes.filter(Boolean).join(' ')}
      inert={!props.on}
      aria-hidden={props.on ? undefined : 'true'}
    >
      {props.children}
    </div>
  )
}
