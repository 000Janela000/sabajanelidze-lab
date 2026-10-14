/** One line of real code as the game shows it. Shared by build-time code and the islands. */
export interface CodeLine {
  readonly text: string
  /** The plain label of the step this line waits at, if the line awaits a port. */
  readonly step: string | null
}
