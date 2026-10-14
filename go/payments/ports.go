package payments

import (
	"context"
	"errors"
)

// Cents is money as a whole number of minor units. Never a float.
type Cents int64

// PayoutRecord is our lasting record of one payout, keyed by its ID.
type PayoutRecord struct {
	PayoutID   string
	CustomerID string
	Amount     Cents
	Status     PayoutStatus
}

// Store is everything the withdrawal needs from the database. Each method is atomic on its own.
type Store interface {
	LoadCustomer(ctx context.Context, customerID string) error
	ReadAvailable(ctx context.Context, customerID string) (Cents, error)
	// WriteAvailable overwrites the balance. Only the naive code uses it.
	WriteAvailable(ctx context.Context, customerID string, value Cents) error
	// Reserve moves amount from available to on hold and records the payout, in one atomic step,
	// only if the payout ID is new and the money is there. Otherwise it changes nothing.
	Reserve(ctx context.Context, customerID string, amount Cents, payoutID string) (ReserveResult, error)
	Payout(ctx context.Context, payoutID string) (*PayoutRecord, error)
	Settle(ctx context.Context, payoutID string) error
	Release(ctx context.Context, payoutID string) error
}

// Bank pays out. The payout ID doubles as the idempotency key the bank sees.
type Bank interface {
	Pay(ctx context.Context, payoutID, customerID string, amount Cents) (BankAnswer, error)
}

// ErrBankTimeout: the bank did not answer in time. The payout may or may not have happened.
var ErrBankTimeout = errors.New("the bank did not answer in time")

// Result is the answer to a withdrawal request.
type Result struct {
	Status WithdrawStatus
	Reason Refusal
}

// Request is one withdrawal.
type Request struct {
	CustomerID string
	Amount     Cents
	PayoutID   string
}
