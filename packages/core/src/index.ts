/*
 * The lab's core. Folders: money/ (cents, ledger), payments/ (codes, ports, the real withdrawal, clean-up;
 * adapters/ for the stores and the fake bank; teaching/ for the naive code and wrong patches the game shows),
 * kyc/ (the identity provider's messages: the same layout), simulation/ (running real code one step at a
 * time, or delivering messages in every order).
 */
export { MemoryKycStore } from './kyc/adapters/memory-store.ts'
export * from './kyc/codes.ts'
export { handleEvent } from './kyc/handle-event.ts'
export type {
  Applicant,
  ApplicantTx,
  HandleEvent,
  KycPorts,
  KycStore,
  ProviderEvent,
  SignatureCheck,
} from './kyc/ports.ts'
export { ANNA, annaMessages, BORIS, borisMessages, forgedApprovalForBoris } from './kyc/scenarios.ts'
export { PROVIDER_TEST_KEY, sign, signatureCheck } from './kyc/signature.ts'
export { handleEventV01 } from './kyc/teaching/build-v01.ts'
export { ALLOWED_MOVES, handleEventAllowedMoves, handleEventTimestamp } from './kyc/teaching/patches.ts'
export { type Cents, cents, formatCents } from './money/cents.ts'
export { type Entry, Ledger, type Transaction } from './money/ledger.ts'
export { type BankPayout, FakeBank } from './payments/adapters/fake-bank.ts'
export { MemoryPaymentsStore } from './payments/adapters/memory-store.ts'
export { POSTGRES_SCHEMA, PostgresPaymentsStore, type Sql } from './payments/adapters/postgres-store.ts'
export { type ReconcileLine, reconcile, resolveUnknownPayout } from './payments/clean-up.ts'
export * from './payments/codes.ts'
export { ALL_DEFENCES, type PaymentDefences, withdrawWith } from './payments/defences.ts'
export { type MoneyPicture, moneyPicture } from './payments/money-picture.ts'
export {
  type Bank,
  BankTimeout,
  isValidAmount,
  type PaymentPorts,
  type PaymentsStore,
  type PayoutRecord,
} from './payments/ports.ts'
export { withdrawV01 } from './payments/teaching/build-v01.ts'
export { withdrawCheckTwice, withdrawLockRead, withdrawLockReadAndSave } from './payments/teaching/patches.ts'
export {
  PAID,
  refused,
  UNKNOWN,
  type Withdraw,
  type WithdrawRequest,
  type WithdrawResult,
  withdraw,
} from './payments/withdraw.ts'
export { type AllRunsSummary, allRuns, pauseAfter, runSchedule } from './simulation/all-runs.ts'
export {
  type AllDeliveriesSummary,
  allDeliveryOrders,
  type DeliveryOutcome,
  deliver,
  deliveryOrders,
} from './simulation/deliveries.ts'
export { gatedPaymentPorts } from './simulation/gated-ports.ts'
export {
  CUSTOMER_ID,
  interleavings,
  Race,
  type RaceOutcome,
  type RaceSetup,
  requestName,
  runOrder,
  stepsAlone,
} from './simulation/race.ts'
export { StepScheduler, type TraceLine } from './simulation/scheduler.ts'
export { STEP, STEP_FOR_METHOD, type Step } from './simulation/steps.ts'
