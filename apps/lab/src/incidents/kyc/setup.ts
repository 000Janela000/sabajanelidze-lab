import type { CodeLine } from '../../lib/code-line.ts'

/** The patches the visitor can pick in step 3, in the game's order (the right one is not the last). */
export const PATCH = {
  TIMESTAMP: 'TIMESTAMP',
  VERSION_ORDER: 'VERSION_ORDER',
  ALLOWED_MOVES: 'ALLOWED_MOVES',
} as const
export type PatchId = (typeof PATCH)[keyof typeof PATCH]

export interface PatchOption {
  readonly id: PatchId
  readonly lines: readonly CodeLine[]
}

/** What step 1 found. */
export interface Reproduction {
  readonly tries: number
}

/** Which of our answers the network loses, as the versions whose answers are lost. */
export const CUT = { ONE: [1], TWO: [2], BOTH: [1, 2] } as const satisfies Record<string, readonly number[]>
export type CutId = keyof typeof CUT
