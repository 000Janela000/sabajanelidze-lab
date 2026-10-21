package kyc

import "context"

// ProviderEvent is one message from the identity provider about one applicant. This provider numbers its messages
// per applicant (version 1, 2, 3 ...), may send the same message more than once, and does not promise order.
type ProviderEvent struct {
	EventID     string
	ApplicantID string
	Version     int
	Status      Status
	// SentAt is the time the sender wrote into the message (ISO 8601, UTC, to the second).
	SentAt string
	// Signature is the HMAC-SHA256 of the message with the key we share with the provider, in hex.
	Signature string
}

// Applicant is our record of one applicant.
type Applicant struct {
	ApplicantID string
	Status      Status
	Version     int
	LastSentAt  string
	// Hold is empty when trading is not held.
	Hold HoldReason
}

// Tx is the store inside one applicant's lock. In Postgres it is a transaction holding the applicant's row.
type Tx interface {
	LoadApplicant(ctx context.Context) (Applicant, error)
	SaveApplicant(ctx context.Context, applicant Applicant) error
	// RecordEvent keeps the message by its event ID, unless that ID, or another message with its version, is kept.
	RecordEvent(ctx context.Context, event ProviderEvent) (RecordResult, error)
	// StoredEvent is the kept message for this applicant with exactly this version, or nil.
	StoredEvent(ctx context.Context, version int) (*ProviderEvent, error)
}

// Store runs work while holding the applicant's lock, so two messages for one applicant never interleave.
type Store interface {
	ForApplicant(ctx context.Context, applicantID string, work func(Tx) (EventResult, error)) (EventResult, error)
}

// RefusalLog keeps refused messages as evidence, apart from the kept ones, so a forged message never uses up a
// real message's ID.
type RefusalLog interface {
	Record(ctx context.Context, event ProviderEvent, reason EventResult) error
}
