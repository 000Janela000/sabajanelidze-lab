package kyc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Schema is the same three tables the TypeScript store uses: a message kept once by its event ID and once per
// applicant and version; refused messages in their own table.
const Schema = `
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

// PostgresStore is the same store on a real database: one transaction per message, holding the applicant's row.
type PostgresStore struct {
	pool *pgxpool.Pool
	// lockRow false skips the row lock. Only the lock's own test does that.
	lockRow bool
}

// NewPostgresStore wraps a connection pool.
func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore {
	return &PostgresStore{pool: pool, lockRow: true}
}

// WithoutRowLock returns a store that skips the row lock (for the lock's own test).
func (s *PostgresStore) WithoutRowLock() *PostgresStore {
	return &PostgresStore{pool: s.pool, lockRow: false}
}

func (s *PostgresStore) ForApplicant(ctx context.Context, applicantID string, work func(Tx) (EventResult, error)) (EventResult, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // a no-op after Commit
	// #region kyc-postgres-lock-go
	// The applicant's row exists from the start of the check; a first message creates it if not. Then the row is
	// locked, before the message is kept: every message for this applicant waits here until the one before it has
	// committed (and a copy waits on the lock, not on a half-written row).
	_, err = tx.Exec(ctx, `INSERT INTO kyc_applicants (applicant_id, status) VALUES ($1, 'NOT_STARTED')
		ON CONFLICT (applicant_id) DO NOTHING`, applicantID)
	if err != nil {
		return "", err
	}
	if s.lockRow {
		if _, err := tx.Exec(ctx, `SELECT 1 FROM kyc_applicants WHERE applicant_id = $1 FOR UPDATE`, applicantID); err != nil {
			return "", err
		}
	}
	// #endregion kyc-postgres-lock-go
	result, err := work(postgresTx{tx: tx, applicantID: applicantID})
	if err != nil {
		return "", err
	}
	err = tx.Commit(ctx)
	return result, err
}

// Applicant is the applicant as stored now.
func (s *PostgresStore) Applicant(ctx context.Context, applicantID string) (Applicant, error) {
	return postgresTx{tx: s.pool, applicantID: applicantID}.LoadApplicant(ctx)
}

// querier is what a transaction and a pool both do.
type querier interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type postgresTx struct {
	tx          querier
	applicantID string
}

func (t postgresTx) LoadApplicant(ctx context.Context) (Applicant, error) {
	applicant := Applicant{ApplicantID: t.applicantID}
	var hold *string
	err := t.tx.QueryRow(ctx, `SELECT status, version, last_sent_at, hold FROM kyc_applicants WHERE applicant_id = $1`,
		t.applicantID).Scan(&applicant.Status, &applicant.Version, &applicant.LastSentAt, &hold)
	notFound := errors.Is(err, pgx.ErrNoRows)
	if notFound {
		return Applicant{}, fmt.Errorf("unknown applicant %s", t.applicantID)
	}
	if hold != nil {
		applicant.Hold = HoldReason(*hold)
	}
	return applicant, err
}

func (t postgresTx) SaveApplicant(ctx context.Context, applicant Applicant) error {
	var hold *string
	if applicant.Hold != "" {
		reason := string(applicant.Hold)
		hold = &reason
	}
	_, err := t.tx.Exec(ctx, `UPDATE kyc_applicants SET status = $2, version = $3, last_sent_at = $4, hold = $5
		WHERE applicant_id = $1`, t.applicantID, applicant.Status, applicant.Version, applicant.LastSentAt, hold)
	return err
}

func (t postgresTx) RecordEvent(ctx context.Context, event ProviderEvent) (RecordResult, error) {
	var kept string
	err := t.tx.QueryRow(ctx, `INSERT INTO kyc_provider_events (event_id, applicant_id, version, status, sent_at, signature)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT DO NOTHING
		RETURNING event_id`,
		event.EventID, t.applicantID, event.Version, event.Status, event.SentAt, event.Signature).Scan(&kept)
	keptNow := err == nil
	if keptNow {
		return RecordNew, nil
	}
	nothingKept := errors.Is(err, pgx.ErrNoRows)
	if !nothingKept {
		return "", err
	}
	var one int
	err = t.tx.QueryRow(ctx, `SELECT 1 FROM kyc_provider_events WHERE event_id = $1`, event.EventID).Scan(&one)
	sameID := err == nil
	if sameID {
		return RecordSameID, nil
	}
	sameVersion := errors.Is(err, pgx.ErrNoRows)
	if sameVersion {
		return RecordSameVersion, nil
	}
	return "", err
}

func (t postgresTx) StoredEvent(ctx context.Context, version int) (*ProviderEvent, error) {
	event := ProviderEvent{}
	err := t.tx.QueryRow(ctx, `SELECT event_id, applicant_id, version, status, sent_at, signature
		FROM kyc_provider_events WHERE applicant_id = $1 AND version = $2`, t.applicantID, version).
		Scan(&event.EventID, &event.ApplicantID, &event.Version, &event.Status, &event.SentAt, &event.Signature)
	notFound := errors.Is(err, pgx.ErrNoRows)
	if notFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &event, nil
}

// PostgresRefusalLog keeps refused messages in their own table, with when each came.
type PostgresRefusalLog struct {
	pool *pgxpool.Pool
}

// NewPostgresRefusalLog wraps a connection pool.
func NewPostgresRefusalLog(pool *pgxpool.Pool) *PostgresRefusalLog {
	return &PostgresRefusalLog{pool: pool}
}

func (l *PostgresRefusalLog) Record(ctx context.Context, event ProviderEvent, reason EventResult) error {
	message, err := json.Marshal(event)
	if err != nil {
		return err
	}
	_, err = l.pool.Exec(ctx, `INSERT INTO kyc_refused_messages (event_id, applicant_id, reason, message)
		VALUES ($1, $2, $3, $4)`, event.EventID, event.ApplicantID, reason, message)
	return err
}
