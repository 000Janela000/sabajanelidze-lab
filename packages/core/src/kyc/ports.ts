import type { EventResult, KycStatus } from './codes.ts'

/**
 * One message from the identity provider about one applicant. The provider numbers its messages per
 * applicant (version 1, 2, 3 ...), may send the same message more than once, and does not promise order.
 */
export interface ProviderEvent {
  /** Unique per message. A copy sent again has the same ID. */
  readonly eventId: string
  readonly applicantId: string
  /** The provider's own counter for this applicant: 1, 2, 3 ... */
  readonly version: number
  readonly status: KycStatus
  /** When the provider sent it, to the second, by the provider's clock (ISO 8601, UTC). */
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
  /** The `sentAt` of the last message applied. Only the timestamp patch reads it. */
  readonly lastSentAt: string
}

/** The store, inside one applicant's lock. In Postgres this is a transaction holding the applicant's row. */
export interface ApplicantTx {
  loadApplicant(): Promise<Applicant>
  saveApplicant(applicant: Applicant): Promise<void>
  /** Stores the message by its event ID. Returns false if that ID was already stored. */
  recordEvent(event: ProviderEvent): Promise<boolean>
  /** A stored message for this applicant with exactly this version, if there is one. */
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

export interface KycPorts {
  readonly store: KycStore
  readonly signatures: SignatureCheck
}

/** A handler for one message from the identity provider (the real one, or a teaching version). */
export type HandleEvent = (ports: KycPorts, event: ProviderEvent) => Promise<EventResult>
