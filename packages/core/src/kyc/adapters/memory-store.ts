import { KYC_STATUS } from '../codes.ts'
import type { Applicant, ApplicantTx, KycStore, ProviderEvent } from '../ports.ts'

/** An in-memory stand-in for the applicants and provider_events tables. The game and the unit tests use it. */
export class MemoryKycStore implements KycStore {
  readonly #applicants = new Map<string, Applicant>()
  readonly #events = new Map<string, ProviderEvent>()
  readonly #locks = new Map<string, Promise<void>>()

  constructor(applicantIds: readonly string[]) {
    for (const applicantId of applicantIds) {
      this.#applicants.set(applicantId, {
        applicantId,
        status: KYC_STATUS.NOT_STARTED,
        version: 0,
        lastSentAt: '',
      })
    }
  }

  async forApplicant<T>(applicantId: string, work: (tx: ApplicantTx) => Promise<T>): Promise<T> {
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

  #tx(applicantId: string): ApplicantTx {
    return {
      loadApplicant: async () => this.applicant(applicantId),
      saveApplicant: async (applicant) => {
        this.#applicants.set(applicantId, applicant)
      },
      recordEvent: async (event) => {
        if (this.#events.has(event.eventId)) return false
        this.#events.set(event.eventId, event)
        return true
      },
      storedEvent: async (version) =>
        [...this.#events.values()].find(
          (event) => event.applicantId === applicantId && event.version === version,
        ) ?? null,
    }
  }
}
