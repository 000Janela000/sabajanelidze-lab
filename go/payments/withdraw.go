package payments

import (
	"context"
	"errors"
)

// #region withdraw-go

// Withdraw is build v1 in Go: reserve, then settle. The check and the move are one atomic step,
// so a second request can never reserve money the first one already holds.
// A repeated payout ID never moves money again: it gets the stored answer
// (UNKNOWN while the first payout is still on hold).
func Withdraw(ctx context.Context, store Store, bank Bank, req Request) (Result, error) {
	if req.Amount <= 0 {
		return refused(RefusalInvalidAmount), nil
	}
	if err := store.LoadCustomer(ctx, req.CustomerID); err != nil {
		return Result{}, err
	}
	reserved, err := store.Reserve(ctx, req.CustomerID, req.Amount, req.PayoutID)
	if err != nil {
		return Result{}, err
	}
	switch reserved {
	case ReserveDuplicate:
		record, err := store.Payout(ctx, req.PayoutID)
		if err != nil {
			return Result{}, err
		}
		return answerFor(record, req), nil
	case ReserveInsufficientFunds:
		return refused(RefusalInsufficientFunds), nil
	}

	answer, err := bank.Pay(ctx, req.PayoutID, req.CustomerID, req.Amount)
	timedOut := errors.Is(err, ErrBankTimeout)
	if timedOut {
		// Never retry blindly: the bank may already have paid. Keep the hold and resolve it later.
		return Result{Status: StatusUnknown}, nil
	}
	if err != nil {
		return Result{}, err
	}

	if answer == BankPaid {
		err = store.Settle(ctx, req.PayoutID)
		return Result{Status: StatusPaid}, err
	}
	err = store.Release(ctx, req.PayoutID)
	return refused(RefusalBankRefused), err
}

// answerFor is the stored answer for a repeated payout ID. The same ID with a different request is refused.
func answerFor(record *PayoutRecord, req Request) Result {
	if record == nil || record.CustomerID != req.CustomerID || record.Amount != req.Amount {
		return refused(RefusalPayoutIDReused)
	}
	switch record.Status {
	case PayoutPaid:
		return Result{Status: StatusPaid}
	case PayoutReleased:
		return refused(RefusalBankRefused)
	default:
		return Result{Status: StatusUnknown}
	}
}

// #endregion withdraw-go

func refused(reason Refusal) Result {
	return Result{Status: StatusRefused, Reason: reason}
}

// WithdrawV01 is the naive build the game attacks first: it checks the balance, so it looks safe,
// but two copies running at once can both read the old balance before either saves.
// Teaching code only.
func WithdrawV01(ctx context.Context, store Store, bank Bank, req Request) (Result, error) {
	if req.Amount <= 0 {
		return refused(RefusalInvalidAmount), nil
	}
	if err := store.LoadCustomer(ctx, req.CustomerID); err != nil {
		return Result{}, err
	}
	available, err := store.ReadAvailable(ctx, req.CustomerID)
	if err != nil {
		return Result{}, err
	}
	if available < req.Amount {
		return refused(RefusalInsufficientFunds), nil
	}
	if err := store.WriteAvailable(ctx, req.CustomerID, available-req.Amount); err != nil {
		return Result{}, err
	}
	if _, err := bank.Pay(ctx, req.PayoutID, req.CustomerID, req.Amount); err != nil {
		return Result{}, err
	}
	return Result{Status: StatusPaid}, nil
}
