package payments

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Schema is the same two tables the TypeScript store uses. The CHECKs are a backstop, not the fix.
const Schema = `
CREATE TABLE IF NOT EXISTS balances (
  customer_id text PRIMARY KEY,
  available   bigint NOT NULL CHECK (available >= 0),
  held        bigint NOT NULL DEFAULT 0 CHECK (held >= 0)
);
CREATE TABLE IF NOT EXISTS payouts (
  payout_id   text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES balances (customer_id),
  amount      bigint NOT NULL CHECK (amount > 0),
  status      text NOT NULL CHECK (status IN ('HELD', 'PAID', 'RELEASED'))
);`

// PostgresStore is the same store on a real database.
type PostgresStore struct {
	pool *pgxpool.Pool
}

// NewPostgresStore wraps a connection pool.
func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore {
	return &PostgresStore{pool: pool}
}

func (s *PostgresStore) LoadCustomer(ctx context.Context, customerID string) error {
	var one int
	err := s.pool.QueryRow(ctx, `SELECT 1 FROM balances WHERE customer_id = $1`, customerID).Scan(&one)
	if errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("unknown customer %s", customerID)
	}
	return err
}

func (s *PostgresStore) ReadAvailable(ctx context.Context, customerID string) (Cents, error) {
	var available Cents
	err := s.pool.QueryRow(ctx, `SELECT available FROM balances WHERE customer_id = $1`, customerID).Scan(&available)
	return available, err
}

func (s *PostgresStore) WriteAvailable(ctx context.Context, customerID string, value Cents) error {
	_, err := s.pool.Exec(ctx, `UPDATE balances SET available = $2 WHERE customer_id = $1`, customerID, value)
	return err
}

// #region reserve-go

// Reserve is one SQL statement: the balance check, the move to on hold and the payout record
// happen together or not at all, so two requests can never both pass the check.
func (s *PostgresStore) Reserve(ctx context.Context, customerID string, amount Cents, payoutID string) (ReserveResult, error) {
	if amount <= 0 {
		return "", fmt.Errorf("not a valid amount: %d", amount)
	}
	var id string
	err := s.pool.QueryRow(ctx, `
		WITH moved AS (
		  UPDATE balances
		     SET available = available - $2, held = held + $2
		   WHERE customer_id = $1 AND available >= $2
		     AND NOT EXISTS (SELECT 1 FROM payouts WHERE payout_id = $3)
		  RETURNING customer_id
		)
		INSERT INTO payouts (payout_id, customer_id, amount, status)
		SELECT $3, customer_id, $2, 'HELD' FROM moved
		RETURNING payout_id`, customerID, amount, payoutID).Scan(&id)
	if err == nil {
		return Reserved, nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		// The same new ID at the same moment: the primary key stops the second statement, all of it.
		return ReserveDuplicate, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}
	if record, err := s.Payout(ctx, payoutID); err != nil {
		return "", err
	} else if record != nil {
		return ReserveDuplicate, nil
	}
	return ReserveInsufficientFunds, nil
}

// #endregion reserve-go

func (s *PostgresStore) Payout(ctx context.Context, payoutID string) (*PayoutRecord, error) {
	record := PayoutRecord{PayoutID: payoutID}
	err := s.pool.QueryRow(ctx, `SELECT customer_id, amount, status FROM payouts WHERE payout_id = $1`, payoutID).
		Scan(&record.CustomerID, &record.Amount, &record.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &record, err
}

func (s *PostgresStore) Settle(ctx context.Context, payoutID string) error {
	return s.closeHold(ctx, payoutID, PayoutPaid, `held = b.held - p.amount`)
}

func (s *PostgresStore) Release(ctx context.Context, payoutID string) error {
	return s.closeHold(ctx, payoutID, PayoutReleased, `held = b.held - p.amount, available = b.available + p.amount`)
}

func (s *PostgresStore) closeHold(ctx context.Context, payoutID string, status PayoutStatus, change string) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		// Lock order: the balance row first, then the payout row, the same order as Reserve.
		if _, err := tx.Exec(ctx, `
			SELECT 1 FROM balances
			 WHERE customer_id = (SELECT customer_id FROM payouts WHERE payout_id = $1)
			   FOR UPDATE`, payoutID); err != nil {
			return err
		}
		tag, err := tx.Exec(ctx, `
			WITH p AS (
			  UPDATE payouts SET status = $2 WHERE payout_id = $1 AND status = 'HELD'
			  RETURNING customer_id, amount
			)
			UPDATE balances b SET `+change+` FROM p WHERE b.customer_id = p.customer_id`, payoutID, status)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("no open hold for payout %s", payoutID)
		}
		return nil
	})
}

// Balance returns what is available and on hold for a customer.
func (s *PostgresStore) Balance(ctx context.Context, customerID string) (available, held Cents, err error) {
	err = s.pool.QueryRow(ctx, `SELECT available, held FROM balances WHERE customer_id = $1`, customerID).
		Scan(&available, &held)
	return available, held, err
}
