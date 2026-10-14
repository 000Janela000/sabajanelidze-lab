// Package payments is the Go version of the lab's withdrawal: the same reserve-then-settle fix,
// the same codes, and the same Postgres statements as the TypeScript code the game runs.
package payments

// WithdrawStatus is the answer to a withdrawal request.
type WithdrawStatus string

const (
	StatusPaid    WithdrawStatus = "PAID"
	StatusRefused WithdrawStatus = "REFUSED"
	// StatusUnknown: the bank did not answer, so the money stays on hold until the payout is resolved.
	StatusUnknown WithdrawStatus = "UNKNOWN"
)

// Refusal says why a withdrawal was refused.
type Refusal string

const (
	RefusalInvalidAmount     Refusal = "INVALID_AMOUNT"
	RefusalInsufficientFunds Refusal = "INSUFFICIENT_FUNDS"
	RefusalBankRefused       Refusal = "BANK_REFUSED"
	RefusalPayoutIDReused    Refusal = "PAYOUT_ID_REUSED"
)

// ReserveResult is the result of the atomic reserve step.
type ReserveResult string

const (
	Reserved                 ReserveResult = "RESERVED"
	ReserveInsufficientFunds ReserveResult = "INSUFFICIENT_FUNDS"
	ReserveDuplicate         ReserveResult = "DUPLICATE"
)

// PayoutStatus is our own lasting record of a payout.
type PayoutStatus string

const (
	PayoutHeld     PayoutStatus = "HELD"
	PayoutPaid     PayoutStatus = "PAID"
	PayoutReleased PayoutStatus = "RELEASED"
)

// BankAnswer is the bank's answer to a payout request.
type BankAnswer string

const (
	BankPaid    BankAnswer = "PAID"
	BankRefused BankAnswer = "REFUSED"
)
