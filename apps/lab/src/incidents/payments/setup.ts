import type { CodeLine } from '../../lib/code-line.ts'

/** The fixed set-up of incident 1: one customer with 100, two withdrawals of 80. */
export const CUSTOMER = '42'
export const OPENING = 10000
export const AMOUNT = 8000

/** The patches the visitor can pick in step 3. */
export const PATCH = { CHECK_TWICE: 'CHECK_TWICE', RESERVE: 'RESERVE', LOCK_READ: 'LOCK_READ' } as const
export type PatchId = (typeof PATCH)[keyof typeof PATCH]

export interface PatchOption {
  readonly id: PatchId
  readonly lines: readonly CodeLine[]
}
