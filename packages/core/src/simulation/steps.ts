/** Every step a payments request can wait at, as a code. The game shows the words for each code. */
export const STEP = {
  LOAD_CUSTOMER: 'LOAD_CUSTOMER',
  READ_BALANCE: 'READ_BALANCE',
  SAVE_BALANCE: 'SAVE_BALANCE',
  RESERVE: 'RESERVE',
  LOOK_UP_PAYOUT: 'LOOK_UP_PAYOUT',
  SETTLE: 'SETTLE',
  RELEASE: 'RELEASE',
  LOCK: 'LOCK',
  UNLOCK: 'UNLOCK',
  PAY_OUT: 'PAY_OUT',
  ASK_BANK: 'ASK_BANK',
} as const
export type Step = (typeof STEP)[keyof typeof STEP]

/** Which step each port method is. The site uses it to number and label the lines of real code. */
export const STEP_FOR_METHOD: Readonly<Record<string, Step>> = {
  loadCustomer: STEP.LOAD_CUSTOMER,
  readAvailable: STEP.READ_BALANCE,
  writeAvailable: STEP.SAVE_BALANCE,
  reserve: STEP.RESERVE,
  payout: STEP.LOOK_UP_PAYOUT,
  settle: STEP.SETTLE,
  release: STEP.RELEASE,
  lock: STEP.LOCK,
  unlock: STEP.UNLOCK,
  pay: STEP.PAY_OUT,
  status: STEP.ASK_BANK,
}
