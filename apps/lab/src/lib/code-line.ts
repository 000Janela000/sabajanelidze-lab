import type { Step } from '@lab/core'

/** One line of real code as the game shows it. Shared by build-time code and the islands. */
export interface CodeLine {
  readonly text: string
  /** The step this line waits at, if the line awaits a port. */
  readonly step: Step | null
}
