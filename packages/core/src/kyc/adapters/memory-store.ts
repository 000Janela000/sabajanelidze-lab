import { type EventResult, KYC_STATUS, RECORD_RESULT, type RecordResult } from '../codes.ts'
import type {
  Applicant,
  ApplicantTx,
  KycStore,
  ProviderApi,
  ProviderEvent,
  ProviderRecord,
  RefusalLog,
} from '../ports.ts'

/** A fresh applicant, before any message from the provider. */
export function newApplicant(applicantId: string): Applicant {
  return { applicantId, status: KYC_STATUS.NOT_STARTED, version: 0, lastSentAt: '', hold: null }
}

/** An in-memory stand-in for the applicants and provider_events tables. The game and the unit tests use it. */
export class MemoryKycStore implements KycStore {
  readonly #applicants = new Map<string, Applicant>()
  readonly #events = new Map<string, ProviderEvent>()
  readonly #locks = new Map<string, Promise<void>>()
  readonly #serialise: boolean

  /**
   * `serialise: false` switches the per-applicant lock off. Only the lock's own test does that, to show the
   * lock is what keeps two messages for one applicant from interleaving.
   */
  constructor(applicantIds: readonly string[], options: { serialise?: boolean } = {}) {
    for (const applicantId of applicantIds) this.#applicants.set(applicantId, newApplicant(applicantId))
    this.#serialise = options.serialise ?? true
  }

  async forApplicant<T>(applicantId: string, work: (tx: ApplicantTx) => Promise<T>): Promise<T> {
    if (!this.#serialise) return work(this.#tx(applicantId))
    // A queue per applicant: each caller waits for the one before it to finish.
    const before = this.#locks.get(applicantId) ?? Promise.resolve()
    let release = () => {}
    this.#locks.set(
      applicantId,
      before.then(() => new Promise<void>((resolve) => (release = resolve))),
    )
    await before
    try {
      return await work(this.#tx(applicantId))
    } finally {
      release()
    }
  }

  /** The applicant as stored now. */
  applicant(applicantId: string): Applicant {
    const applicant = this.#applicants.get(applicantId)
    if (!applicant) throw new Error(`Unknown applicant ${applicantId}`)
    return applicant
  }

  /** Every kept message for this applicant, in the order they were kept. */
  events(applicantId: string): ProviderEvent[] {
    return [...this.#events.values()].filter((event) => event.applicantId === applicantId)
  }

  #tx(applicantId: string): ApplicantTx {
    return {
      loadApplicant: async () => this.applicant(applicantId),
      saveApplicant: async (applicant) => {
        this.#applicants.set(applicantId, applicant)
      },
      recordEvent: async (event): Promise<RecordResult> => {
        const sameId = this.#events.has(event.eventId)
        if (sameId) return RECORD_RESULT.SAME_ID
        const sameVersion = this.events(applicantId).some((kept) => kept.version === event.version)
        if (sameVersion) return RECORD_RESULT.SAME_VERSION
        this.#events.set(event.eventId, event)
        return RECORD_RESULT.NEW
      },
      storedEvent: async (version) =>
        this.events(applicantId).find((event) => event.version === version) ?? null,
    }
  }
}

/** One refused message, as kept for evidence. */
export interface RefusedMessage {
  readonly event: ProviderEvent
  readonly reason: EventResult
  /** When our server got it (the message's own `sentAt` is whatever the sender wrote). */
  readonly receivedAt: string
}

/**
 * The refusal log in memory, capped so the demo cannot grow without end (a real system keeps every refusal for
 * its retention period). `now` is the clock, so tests can fix it.
 */
export class MemoryRefusalLog implements RefusalLog {
  readonly #refusals: RefusedMessage[] = []
  readonly #cap: number
  readonly #now: () => Date

  constructor(options: { cap?: number; now?: () => Date } = {}) {
    this.#cap = options.cap ?? 100
    this.#now = options.now ?? (() => new Date())
  }

  async record(event: ProviderEvent, reason: EventResult): Promise<void> {
    const receivedAt = this.#now().toISOString()
    this.#refusals.push({ event, reason, receivedAt })
    if (this.#refusals.length > this.#cap) this.#refusals.shift()
  }

  /** The refusals kept, oldest first. */
  list(): readonly RefusedMessage[] {
    return [...this.#refusals]
  }
}

/** The provider's API as a fixed set of records: the lab's made-up provider, reached without a network. */
export class MemoryProviderApi implements ProviderApi {
  readonly #records: Map<string, ProviderRecord>

  constructor(records: readonly ProviderRecord[]) {
    this.#records = new Map(records.map((record) => [record.applicantId, record]))
  }

  async record(applicantId: string): Promise<ProviderRecord> {
    const record = this.#records.get(applicantId)
    if (!record) throw new Error(`The provider has no applicant ${applicantId}`)
    return record
  }
}
