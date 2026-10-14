package payments

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"
)

const requests = 20

// raceStore makes the requests collide on purpose. Every read of the balance waits a little, like a slow
// network, so the naive code's gap between reading and saving is always hit. And no request may run
// Reserve until all of them have reached it, so the reserves really run at the same moment.
type raceStore struct {
	Store
	atReserve *sync.WaitGroup
}

func (s raceStore) ReadAvailable(ctx context.Context, customerID string) (Cents, error) {
	value, err := s.Store.ReadAvailable(ctx, customerID)
	time.Sleep(5 * time.Millisecond)
	return value, err
}

func (s raceStore) Reserve(ctx context.Context, customerID string, amount Cents, payoutID string) (ReserveResult, error) {
	s.atReserve.Done()
	s.atReserve.Wait()
	return s.Store.Reserve(ctx, customerID, amount, payoutID)
}

type withdrawFunc func(context.Context, Store, Bank, Request) (Result, error)

func distinctIDs(i int) string { return fmt.Sprintf("p%d", i) }

// collide sends 20 withdrawals of 80 at once and returns every answer.
func collide(t *testing.T, withdraw withdrawFunc, store Store, bank Bank, customerID string, payoutID func(int) string) []Result {
	t.Helper()
	atReserve := &sync.WaitGroup{}
	atReserve.Add(requests)
	racing := raceStore{Store: store, atReserve: atReserve}
	results := make([]Result, requests)
	var group sync.WaitGroup
	for i := range requests {
		group.Add(1)
		go func() {
			defer group.Done()
			request := Request{CustomerID: customerID, Amount: 8000, PayoutID: payoutID(i)}
			result, err := withdraw(context.Background(), racing, bank, request)
			if err != nil {
				t.Error(err)
			}
			results[i] = result
		}()
	}
	group.Wait()
	return results
}

func count(results []Result, status WithdrawStatus) int {
	n := 0
	for _, result := range results {
		if result.Status == status {
			n++
		}
	}
	return n
}

// Run with -race: the race detector also checks that the Go code itself has no data race.
func TestTwentyAtOnceBuildV1PaysOnce(t *testing.T) {
	store, bank := setUp(10000)
	results := collide(t, Withdraw, store, bank, customer, distinctIDs)
	payouts, total := bank.PaidOut()
	available, held := store.Balance(customer)
	if payouts != 1 || total != 8000 || available != 2000 || held != 0 {
		t.Fatalf("payouts %d, total %d, available %d, held %d; want 1, 8000, 2000, 0", payouts, total, available, held)
	}
	if paid, refused := count(results, StatusPaid), count(results, StatusRefused); paid != 1 || refused != requests-1 {
		t.Fatalf("%d answered PAID and %d REFUSED; want 1 and %d", paid, refused, requests-1)
	}
}

// The defence check: without the atomic reserve, the same race pays out more than once.
func TestTwentyAtOnceBuildV01PaysMoreThanOnce(t *testing.T) {
	store, bank := setUp(10000)
	collide(t, WithdrawV01, store, bank, customer, distinctIDs)
	payouts, total := bank.PaidOut()
	available, _ := store.Balance(customer)
	if payouts < 2 || total+available == 10000 {
		t.Fatalf("payouts %d, total %d, available %d; the naive build should lose money", payouts, total, available)
	}
}
