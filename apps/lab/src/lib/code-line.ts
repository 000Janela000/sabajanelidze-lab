import type { Step } from '@lab/core'

/** A run of characters in one colour. No colour means the page's own text colour. */
export interface CodeToken {
  readonly text: string
  /** A CSS colour such as `light-dark(#0000ff, #569cd6)`: the browser picks by the page's theme. */
  readonly color?: string
}

/** One line of real code as the game shows it. Shared by build-time code and the islands. */
export interface CodeLine {
  readonly text: string
  /** The same line, coloured like a code editor. */
  readonly tokens: readonly CodeToken[]
  /** The step this line waits at, if the line awaits a port. */
  readonly step: Step | null
}
