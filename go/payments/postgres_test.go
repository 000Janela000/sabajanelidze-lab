package payments

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// These tests run only where a real Postgres server is available (CI sets DATABASE_URL).
func openPostgres(t *testing.T) *PostgresStore {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL is not set: no real Postgres here")
	}
	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	if _, err := pool.Exec(context.Background(), Schema); err != nil {
		t.Fatal(err)
	}
	return NewPostgresStore(pool)
}

// freshCustomer starts clean, so the tests can run twice on the same database.
func freshCustomer(t *testing.T, store *PostgresStore, customerID string, opening Cents) {
	t.Helper()
	for _, statement := range []string{
		`DELETE FROM payouts WHERE customer_id = $1`,
		`DELETE FROM balances WHERE customer_id = $1`,
	} {
		if _, err := store.pool.Exec(context.Background(), statement, customerID); err != nil {
			t.Fatal(err)
		}
	}
	insert := `INSERT INTO balances (customer_id, available) VALUES ($1, $2)`
	if _, err := store.pool.Exec(context.Background(), insert, customerID, opening); err != nil {
		t.Fatal(err)
	}
}

func balance(t *testing.T, store *PostgresStore, customerID string) (available, held Cents) {
	t.Helper()
	available, held, err := store.Balance(context.Background(), customerID)
	if err != nil {
		t.Fatal(err)
	}
	return available, held
}

func TestPostgresBuildV1PaysOnce(t *testing.T) {
	store, bank := openPostgres(t), NewFakeBank()
	freshCustomer(t, store, "go-v1", 10000)
	results := collide(t, Withdraw, store, bank, "go-v1", distinctIDs)
	payouts, total := bank.PaidOut()
	available, held := balance(t, store, "go-v1")
	if payouts != 1 || total != 8000 || available != 2000 || held != 0 {
		t.Fatalf("payouts %d, total %d, available %d, held %d; want 1, 8000, 2000, 0", payouts, total, available, held)
	}
	if paid := count(results, StatusPaid); paid != 1 {
		t.Fatalf("%d answered PAID; want 1", paid)
	}
}

// Enough money for three payouts, so only the payout ID can stop the copies.
func TestPostgresSameIDTwentyTimesMovesMoneyOnce(t *testing.T) {
	store, bank := openPostgres(t), NewFakeBank()
	freshCustomer(t, store, "go-same", 30000)
	results := collide(t, Withdraw, store, bank, "go-same", func(int) string { return "go-same-one" })
	available, held := balance(t, store, "go-same")
	if calls := bank.Calls(); calls != 1 || available != 22000 || held != 0 {
		t.Fatalf("bank asked %d times, available %d, held %d; want 1, 22000, 0", calls, available, held)
	}
	// Copies that arrive while the first is still with the bank answer UNKNOWN; none may be refused.
	if refused := count(results, StatusRefused); refused != 0 {
		t.Fatalf("%d copies were refused; want 0", refused)
	}
}

// The defence check on a real database: without the reserve, the same race pays out more than once.
func TestPostgresBuildV01PaysMoreThanOnce(t *testing.T) {
	store, bank := openPostgres(t), NewFakeBank()
	freshCustomer(t, store, "go-v01", 10000)
	collide(t, WithdrawV01, store, bank, "go-v01", distinctIDs)
	payouts, total := bank.PaidOut()
	available, _ := balance(t, store, "go-v01")
	if payouts < 2 || total+available == 10000 {
		t.Fatalf("payouts %d, total %d, available %d; the naive build should lose money", payouts, total, available)
	}
}
