package payments

import (
	"context"
	"fmt"
	"sync"
)

// MemoryStore is an in-memory stand-in for the balances and payouts tables.
// Each method holds the mutex for its whole body, so each one is atomic, like one SQL statement.
// What it does not do is make a sequence of calls atomic: that is the naive code's mistake.
type MemoryStore struct {
	mu        sync.Mutex
	available map[string]Cents
	held      map[string]Cents
	payouts   map[string]PayoutRecord
}

// NewMemoryStore creates a store with opening balances.
func NewMemoryStore(opening map[string]Cents) *MemoryStore {
	available := make(map[string]Cents, len(opening))
	for customer, amount := range opening {
		available[customer] = amount
	}
	return &MemoryStore{available: available, held: map[string]Cents{}, payouts: map[string]PayoutRecord{}}
}

func (s *MemoryStore) LoadCustomer(_ context.Context, customerID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.available[customerID]; !ok {
		return fmt.Errorf("unknown customer %s", customerID)
	}
	return nil
}

func (s *MemoryStore) ReadAvailable(_ context.Context, customerID string) (Cents, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.available[customerID], nil
}

func (s *MemoryStore) WriteAvailable(_ context.Context, customerID string, value Cents) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.available[customerID] = value
	return nil
}

func (s *MemoryStore) Reserve(_ context.Context, customerID string, amount Cents, payoutID string) (ReserveResult, error) {
	if amount <= 0 {
		return "", fmt.Errorf("not a valid amount: %d", amount)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.payouts[payoutID]; ok {
		return ReserveDuplicate, nil
	}
	if s.available[customerID] < amount {
		return ReserveInsufficientFunds, nil
	}
	s.available[customerID] -= amount
	s.held[customerID] += amount
	s.payouts[payoutID] = PayoutRecord{PayoutID: payoutID, CustomerID: customerID, Amount: amount, Status: PayoutHeld}
	return Reserved, nil
}

func (s *MemoryStore) Payout(_ context.Context, payoutID string) (*PayoutRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.payouts[payoutID]
	if !ok {
		return nil, nil
	}
	return &record, nil
}

func (s *MemoryStore) Settle(_ context.Context, payoutID string) error {
	return s.closeHold(payoutID, PayoutPaid)
}

func (s *MemoryStore) Release(_ context.Context, payoutID string) error {
	return s.closeHold(payoutID, PayoutReleased)
}

func (s *MemoryStore) closeHold(payoutID string, status PayoutStatus) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.payouts[payoutID]
	if !ok || record.Status != PayoutHeld {
		return fmt.Errorf("no open hold for payout %s", payoutID)
	}
	s.held[record.CustomerID] -= record.Amount
	if status == PayoutReleased {
		s.available[record.CustomerID] += record.Amount
	}
	record.Status = status
	s.payouts[payoutID] = record
	return nil
}

// Balance returns what is available and on hold for a customer.
func (s *MemoryStore) Balance(customerID string) (available, held Cents) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.available[customerID], s.held[customerID]
}

// FakeBank pays out and keeps its own record of payouts: the statement reconciliation checks against.
// It is idempotent by payout ID: a payout ID it has already paid is never paid again.
type FakeBank struct {
	mu      sync.Mutex
	paid    map[string]Cents
	payouts int
	calls   int
	// TimeoutNext makes the next payout succeed at the bank but time out for the caller.
	TimeoutNext bool
	// RefuseNext makes the bank refuse the next payout: no money leaves.
	RefuseNext bool
}

// NewFakeBank creates an empty fake bank.
func NewFakeBank() *FakeBank {
	return &FakeBank{paid: map[string]Cents{}}
}

func (b *FakeBank) Pay(_ context.Context, payoutID, _ string, amount Cents) (BankAnswer, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.calls++
	if b.RefuseNext {
		b.RefuseNext = false
		return BankRefused, nil
	}
	if _, ok := b.paid[payoutID]; ok {
		return BankPaid, nil
	}
	b.paid[payoutID] = amount
	b.payouts++
	if b.TimeoutNext {
		b.TimeoutNext = false
		return "", ErrBankTimeout
	}
	return BankPaid, nil
}

// PaidOut returns the number of payouts and their total.
func (b *FakeBank) PaidOut() (count int, total Cents) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, amount := range b.paid {
		total += amount
	}
	return b.payouts, total
}

// Calls returns how many times anyone asked the bank to pay, including repeats it ignored.
func (b *FakeBank) Calls() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.calls
}
