import type { Sql } from '../../payments/adapters/postgres-store.ts'
import {
  type EventResult,
  type HoldReason,
  type KycStatus,
  RECORD_RESULT,
  type RecordResult,
} from '../codes.ts'
import type { Applicant, ApplicantTx, KycStore, ProviderEvent, RefusalLog } from '../ports.ts'

/**
 * The tables the identity-check code needs. A message is kept once by its event ID, and one per applicant and
 * version; refused messages go to their own table, so a forged one never takes a real message's ID.
 */
export const KYC_POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS kyc_applicants (
  applicant_id text PRIMARY KEY,
  status       text NOT NULL CHECK (status IN ('NOT_STARTED', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
  version      integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  last_sent_at text NOT NULL DEFAULT '',
  hold         text CHECK (hold IN ('NOT_FROM_PROVIDER'))
);
CREATE TABLE IF NOT EXISTS kyc_provider_events (
  event_id     text PRIMARY KEY,
  applicant_id text NOT NULL REFERENCES kyc_applicants (applicant_id),
  version      integer NOT NULL CHECK (version > 0),
  status       text NOT NULL,
  sent_at      text NOT NULL,
  signature    text NOT NULL,
  UNIQUE (applicant_id, version)
);
CREATE TABLE IF NOT EXISTS kyc_refused_messages (
  id           bigserial PRIMARY KEY,
  event_id     text NOT NULL,
  applicant_id text NOT NULL,
  reason       text NOT NULL,
  message      jsonb NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now()
);`

interface ApplicantRow {
  readonly status: KycStatus
  readonly version: number
  readonly last_sent_at: string
  readonly hold: HoldReason | null
}

interface EventRow {
  readonly event_id: string
  readonly applicant_id: string
  readonly version: number
  readonly status: KycStatus
  readonly sent_at: string
  readonly signature: string
}

const toEvent = (row: EventRow): ProviderEvent => ({
  eventId: row.event_id,
  applicantId: row.applicant_id,
  version: Number(row.version),
  status: row.status,
  sentAt: row.sent_at,
  signature: row.signature,
})

/** The identity-check store on a real database: one transaction per message, holding the applicant's row. */
export class PostgresKycStore implements KycStore {
  readonly #sql: Sql
  readonly #lockRow: boolean

  /** `lockRow: false` skips the row lock. Only the lock's own test does that, to show what the lock prevents. */
  constructor(sql: Sql, options: { lockRow?: boolean } = {}) {
    this.#sql = sql
    this.#lockRow = options.lockRow ?? true
  }

  async forApplicant<T>(applicantId: string, work: (tx: ApplicantTx) => Promise<T>): Promise<T> {
    return this.#sql.transaction(async (tx) => {
      // #region kyc-postgres-lock
      // The applicant's row exists from the start of the check; a first message creates it if not. Then the row
      // is locked, before the message is kept: every message for this applicant waits here until the one before
      // it has committed, so two never interleave (and a copy waits on the lock, not on a half-written row).
      await tx.query(
        `INSERT INTO kyc_applicants (applicant_id, status) VALUES ($1, 'NOT_STARTED')
         ON CONFLICT (applicant_id) DO NOTHING`,
        [applicantId],
      )
      if (this.#lockRow) {
        await tx.query('SELECT 1 FROM kyc_applicants WHERE applicant_id = $1 FOR UPDATE', [applicantId])
      }
      // #endregion kyc-postgres-lock
      return work(this.#tx(tx, applicantId))
    })
  }

  #tx(sql: Sql, applicantId: string): ApplicantTx {
    return {
      loadApplicant: async (): Promise<Applicant> => {
        const { rows } = await sql.query<ApplicantRow>(
          'SELECT status, version, last_sent_at, hold FROM kyc_applicants WHERE applicant_id = $1',
          [applicantId],
        )
        const row = rows[0]
        if (!row) throw new Error(`Unknown applicant ${applicantId}`)
        return {
          applicantId,
          status: row.status,
          version: Number(row.version),
          lastSentAt: row.last_sent_at,
          hold: row.hold,
        }
      },
      saveApplicant: async (applicant) => {
        await sql.query(
          'UPDATE kyc_applicants SET status = $2, version = $3, last_sent_at = $4, hold = $5 WHERE applicant_id = $1',
          [applicantId, applicant.status, applicant.version, applicant.lastSentAt, applicant.hold],
        )
      },
      recordEvent: async (event): Promise<RecordResult> => {
        // #region kyc-postgres-record
        const { rows } = await sql.query(
          `INSERT INTO kyc_provider_events (event_id, applicant_id, version, status, sent_at, signature)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING
           RETURNING event_id`,
          [event.eventId, applicantId, event.version, event.status, event.sentAt, event.signature],
        )
        // #endregion kyc-postgres-record
        const kept = rows.length === 1
        if (kept) return RECORD_RESULT.NEW
        const { rows: same } = await sql.query('SELECT 1 FROM kyc_provider_events WHERE event_id = $1', [
          event.eventId,
        ])
        const sameId = same.length === 1
        return sameId ? RECORD_RESULT.SAME_ID : RECORD_RESULT.SAME_VERSION
      },
      storedEvent: async (version) => {
        const { rows } = await sql.query<EventRow>(
          `SELECT event_id, applicant_id, version, status, sent_at, signature
             FROM kyc_provider_events WHERE applicant_id = $1 AND version = $2`,
          [applicantId, version],
        )
        const row = rows[0]
        return row ? toEvent(row) : null
      },
    }
  }

  /** Every kept message for this applicant, by version. */
  async events(applicantId: string): Promise<ProviderEvent[]> {
    const { rows } = await this.#sql.query<EventRow>(
      `SELECT event_id, applicant_id, version, status, sent_at, signature
         FROM kyc_provider_events WHERE applicant_id = $1 ORDER BY version`,
      [applicantId],
    )
    return rows.map(toEvent)
  }

  /** The applicant as stored now. */
  async applicant(applicantId: string): Promise<Applicant> {
    return this.forApplicant(applicantId, (tx) => tx.loadApplicant())
  }
}

/** The refusal log on the same database: kept for the retention period, with when each refusal came. */
export class PostgresRefusalLog implements RefusalLog {
  readonly #sql: Sql

  constructor(sql: Sql) {
    this.#sql = sql
  }

  async record(event: ProviderEvent, reason: EventResult): Promise<void> {
    await this.#sql.query(
      'INSERT INTO kyc_refused_messages (event_id, applicant_id, reason, message) VALUES ($1, $2, $3, $4)',
      [event.eventId, event.applicantId, reason, JSON.stringify(event)],
    )
  }

  /** The reasons refused for an applicant, oldest first. */
  async reasons(applicantId: string): Promise<EventResult[]> {
    const { rows } = await this.#sql.query<{ reason: EventResult }>(
      'SELECT reason FROM kyc_refused_messages WHERE applicant_id = $1 ORDER BY id',
      [applicantId],
    )
    return rows.map((row) => row.reason)
  }
}
