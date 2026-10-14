package payments

import (
	"context"
	"testing"
)

const customer = "42"

func setUp(opening Cents) (*MemoryStore, *FakeBank) {
	return NewMemoryStore(map[string]Cents{customer: opening}), NewFakeBank()
}

func TestWithdrawPaysAndSettles(t *testing.T) {
	store, bank := setUp(10000)
	got, err := Withdraw(context.Background(), store, bank, Request{CustomerID: customer, Amount: 8000, PayoutID: "p1"})
	if err != nil || got.Status != StatusPaid {
		t.Fatalf("got %+v, %v; want PAID", got, err)
	}
	if available, held := store.Balance(customer); available != 2000 || held != 0 {
		t.Fatalf("balance %d, held %d; want 2000, 0", available, held)
	}
}

func TestWithdrawRefusesWithoutMoney(t *testing.T) {
	store, bank := setUp(5000)
	got, _ := Withdraw(context.Background(), store, bank, Request{CustomerID: customer, Amount: 8000, PayoutID: "p1"})
	if got != (Result{Status: StatusRefused, Reason: RefusalInsufficientFunds}) {
		t.Fatalf("got %+v; want REFUSED INSUFFICIENT_FUNDS", got)
	}
}

func TestWithdrawRefusesBadAmounts(t *testing.T) {
	for _, amount := range []Cents{0, -8000} {
		store, bank := setUp(10000)
		got, _ := Withdraw(context.Background(), store, bank, Request{CustomerID: customer, Amount: amount, PayoutID: "p1"})
		if got.Reason != RefusalInvalidAmount {
			t.Fatalf("amount %d: got %+v; want INVALID_AMOUNT", amount, got)
		}
		if available, _ := store.Balance(customer); available != 10000 {
			t.Fatalf("amount %d changed the balance to %d", amount, available)
		}
	}
}

func TestReserveRefusesBadAmountsAndChangesNothing(t *testing.T) {
	for _, amount := range []Cents{0, -8000} {
		store, _ := setUp(10000)
		if _, err := store.Reserve(context.Background(), customer, amount, "p1"); err == nil {
			t.Fatalf("amount %d: Reserve accepted it", amount)
		}
		if available, held := store.Balance(customer); available != 10000 || held != 0 {
			t.Fatalf("amount %d: balance %d, held %d; want 10000, 0", amount, available, held)
		}
	}
}

func TestWithdrawReleasesTheHoldWhenTheBankRefuses(t *testing.T) {
	store, bank := setUp(10000)
	bank.RefuseNext = true
	got, err := Withdraw(context.Background(), store, bank, Request{CustomerID: customer, Amount: 8000, PayoutID: "p1"})
	if err != nil || got != (Result{Status: StatusRefused, Reason: RefusalBankRefused}) {
		t.Fatalf("got %+v, %v; want REFUSED BANK_REFUSED", got, err)
	}
	if available, held := store.Balance(customer); available != 10000 || held != 0 {
		t.Fatalf("balance %d, held %d; want 10000, 0", available, held)
	}
	if count, _ := bank.PaidOut(); count != 0 {
		t.Fatalf("the bank paid %d times; want 0", count)
	}
}

func TestRepeatedPayoutIDGetsTheFirstAnswer(t *testing.T) {
	store, bank := setUp(20000)
	request := Request{CustomerID: customer, Amount: 8000, PayoutID: "same"}
	if _, err := Withdraw(context.Background(), store, bank, request); err != nil {
		t.Fatal(err)
	}
	got, _ := Withdraw(context.Background(), store, bank, request)
	if got.Status != StatusPaid {
		t.Fatalf("repeat got %+v; want PAID", got)
	}
	if count, _ := bank.PaidOut(); count != 1 {
		t.Fatalf("the bank paid %d times; want 1", count)
	}
	if available, _ := store.Balance(customer); available != 12000 {
		t.Fatalf("balance %d; want 12000", available)
	}
}

func TestTimeoutKeepsTheMoneyOnHold(t *testing.T) {
	store, bank := setUp(10000)
	bank.TimeoutNext = true
	got, err := Withdraw(context.Background(), store, bank, Request{CustomerID: customer, Amount: 8000, PayoutID: "p1"})
	if err != nil || got.Status != StatusUnknown {
		t.Fatalf("got %+v, %v; want UNKNOWN", got, err)
	}
	if available, held := store.Balance(customer); available != 2000 || held != 8000 {
		t.Fatalf("balance %d, held %d; want 2000 available and 8000 on hold", available, held)
	}
}
