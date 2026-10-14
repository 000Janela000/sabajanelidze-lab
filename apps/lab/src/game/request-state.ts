/** What a racing request is doing, as shown on its panel. */
export const REQUEST_STATE = {
  READY: 'READY',
  RUNNING: 'RUNNING',
  SLOW: 'SLOW',
  PAID: 'PAID',
  REFUSED: 'REFUSED',
  UNKNOWN: 'UNKNOWN',
} as const
export type RequestState = (typeof REQUEST_STATE)[keyof typeof REQUEST_STATE]
