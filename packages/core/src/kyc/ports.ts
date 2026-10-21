import type { EventResult, HoldReason, KycStatus, RecordResult } from './codes.ts'

/**
 * One message from the identity provider about one applicant. This provider numbers its messages per applicant
 * (version 1, 2, 3 ...), may send the same message more than once, and does not promise order. (Not every provider
 * gives a version; without one, a message is only a sign to fetch the applicant's state: see `ProviderApi`.)
 */
export interface ProviderEvent {
  /** Unique per message. A copy sent again has the same ID. */
  readonly eventId: string
  readonly applicantId: string
  /** The provider's own counter for this applicant: 1, 2, 3 ... */
  readonly version: number
  readonly status: KycStatus
  /** When the provider sent it, to the second, by the provider's clock (ISO 8601, UTC). Set by the sender. */
  readonly sentAt: string
  /** HMAC-SHA256 of the message with the key we share with the provider, in hex. */
  readonly signature: string
}

/** Our record of one applicant. */
export interface Applicant {
  readonly applicantId: string
  readonly status: KycStatus
  /** The last provider version applied (0 before the first message). */
  readonly version: number
  /** The `sentAt` of the last message applied: the time that message claimed, not when we got it. */
  readonly lastSentAt: string
  /** Trading is held, whatever the status says (null: no hold). */
  readonly hold: HoldReason | null
}

/** The store, inside one applicant's lock. In Postgres this is a transaction holding the applicant's row. */
export interface ApplicantTx {
  loadApplicant(): Promise<Applicant>
  saveApplicant(applicant: Applicant): Promise<void>
  /** Keeps the message by its event ID, unless that ID, or another message with its version, is already kept. */
  recordEvent(event: ProviderEvent): Promise<RecordResult>
  /** A kept message for this applicant with exactly this version, if there is one. */
  storedEvent(version: number): Promise<ProviderEvent | null>
}

export interface KycStore {
  /** Runs `work` while holding the applicant's lock, so two messages for one applicant never interleave. */
  forApplicant<T>(applicantId: string, work: (tx: ApplicantTx) => Promise<T>): Promise<T>
}

export interface SignatureCheck {
  /** True only if the signature was made with the key we share with the provider. */
  verify(event: ProviderEvent): Promise<boolean>
}

/**
 * Messages refused before anything is stored (a bad signature) or refused as a conflict, kept as evidence. Apart
 * from the kept messages on purpose: a forged message must never use up a real message's ID.
 */
export interface RefusalLog {
  record(event: ProviderEvent, reason: EventResult): Promise<void>
}

export interface KycPorts {
  readonly store: KycStore
  readonly signatures: SignatureCheck
  readonly refusals: RefusalLog
}

/** A handler for one message from the identity provider (the real one, or a teaching version). */
export type HandleEvent = (ports: KycPorts, event: ProviderEvent) => Promise<EventResult>

/** One step of an applicant's case, as the provider itself records it. */
export interface ProviderEntry {
  readonly version: number
  readonly status: KycStatus
  readonly sentAt: string
}

/** The provider's own record of an applicant: every version it sent, oldest first. */
export interface ProviderRecord {
  readonly applicantId: string
  readonly history: readonly ProviderEntry[]
}

/** The provider's API, reached over our authenticated connection (not a message anyone can post to us). */
export interface ProviderApi {
  record(applicantId: string): Promise<ProviderRecord>
}
