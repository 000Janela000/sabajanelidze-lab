package kyc

import (
	"context"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// These tests run only where a real Postgres server is available (CI sets DATABASE_URL).
func openPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL is not set: no real Postgres here")
	}
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	if _, err := pool.Exec(ctx, Schema); err != nil {
		t.Fatal(err)
	}
	return pool
}

// freshApplicant starts clean (so the tests can run twice on one database), with the applicant's row in place, as
// it is from the start of a check.
func freshApplicant(t *testing.T, pool *pgxpool.Pool, applicantID string) {
	t.Helper()
	for _, statement := range []string{
		`DELETE FROM kyc_refused_messages WHERE applicant_id = $1`,
		`DELETE FROM kyc_provider_events WHERE applicant_id = $1`,
		`DELETE FROM kyc_applicants WHERE applicant_id = $1`,
		`INSERT INTO kyc_applicants (applicant_id, status) VALUES ($1, 'NOT_STARTED')`,
	} {
		if _, err := pool.Exec(ctx, statement, applicantID); err != nil {
			t.Fatal(err)
		}
	}
}

// slowLooks waits after each "is the next version here?" look: the moment a second message could slip in.
type slowLooks struct{ inner Store }

func (s slowLooks) ForApplicant(ctx context.Context, applicantID string, work func(Tx) (EventResult, error)) (EventResult, error) {
	return s.inner.ForApplicant(ctx, applicantID, func(tx Tx) (EventResult, error) {
		return work(slowTx{Tx: tx})
	})
}

type slowTx struct{ Tx }

func (t slowTx) StoredEvent(ctx context.Context, version int) (*ProviderEvent, error) {
	event, err := t.Tx.StoredEvent(ctx, version)
	time.Sleep(40 * time.Millisecond)
	return event, err
}

// pgRace sends #1, then #2 10 ms later, while #1 is between its look and its save.
func pgRace(t *testing.T, pool *pgxpool.Pool, store *PostgresStore, applicantID string) Applicant {
	t.Helper()
	freshApplicant(t, pool, applicantID)
	pending, approved := annaMessages(applicantID)
	pending, approved = Sign(withID(pending, applicantID), ProviderTestKey), Sign(withID(approved, applicantID), ProviderTestKey)
	refusals := NewPostgresRefusalLog(pool)
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		handle(t, slowLooks{store}, refusals, pending)
	}()
	time.Sleep(10 * time.Millisecond)
	handle(t, slowLooks{store}, refusals, approved)
	wg.Wait()
	applicant, err := store.Applicant(ctx, applicantID)
	if err != nil {
		t.Fatal(err)
	}
	return applicant
}

// withID gives a message an event ID of its own per applicant, so each test has its own rows.
func withID(event ProviderEvent, applicantID string) ProviderEvent {
	event.EventID = event.EventID + "_" + applicantID
	return event
}

func TestPostgresWithTheRowLockTwoArrivingWhileOneIsSavingStillEndsApproved(t *testing.T) {
	pool := openPostgres(t)
	applicant := pgRace(t, pool, NewPostgresStore(pool), "go-real-lock")
	if applicant.Status != StatusApproved || applicant.Version != 2 {
		t.Fatalf("applicant %+v, want approved at version 2", applicant)
	}
}

// The defence check on a real database: without the row lock, the same race leaves Anna stuck at #1.
func TestPostgresWithoutTheRowLockTheSameRaceLeavesAnnaStuckAtOne(t *testing.T) {
	pool := openPostgres(t)
	applicant := pgRace(t, pool, NewPostgresStore(pool).WithoutRowLock(), "go-real-no-lock")
	if applicant.Status != StatusPending || applicant.Version != 1 {
		t.Fatalf("applicant %+v, want pending at version 1", applicant)
	}
}

func TestPostgresTwentyDeliveriesAtOnceEndApprovedWithEachMessageKeptOnce(t *testing.T) {
	pool := openPostgres(t)
	freshApplicant(t, pool, "go-real-many")
	store := NewPostgresStore(pool)
	refusals := NewPostgresRefusalLog(pool)
	pending, approved := annaMessages("go-real-many")
	pending, approved = Sign(withID(pending, "go-real-many"), ProviderTestKey), Sign(withID(approved, "go-real-many"), ProviderTestKey)
	var wg sync.WaitGroup
	for i := range 20 {
		event := pending
		if i%2 == 0 {
			event = approved
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			handle(t, slowLooks{store}, refusals, event)
		}()
	}
	wg.Wait()
	applicant, err := store.Applicant(ctx, "go-real-many")
	if err != nil {
		t.Fatal(err)
	}
	if applicant.Status != StatusApproved || applicant.Version != 2 {
		t.Fatalf("applicant %+v, want approved at version 2", applicant)
	}
	var kept int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM kyc_provider_events WHERE applicant_id = $1`, "go-real-many").Scan(&kept); err != nil {
		t.Fatal(err)
	}
	if kept != 2 {
		t.Fatalf("kept %d messages, want 2", kept)
	}
}
