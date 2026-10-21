// Package kyc is the Go version of the lab's identity-check message handler: the same codes, the same signature
// scheme, the same build v1 (check the signature first, keep each message once, apply in the provider's version
// order, park an early one) and the same Postgres tables and row lock as the TypeScript code the game runs.
package kyc

// Status is where an applicant is in the identity check. Only APPROVED customers with no hold can trade.
type Status string

const (
	StatusNotStarted Status = "NOT_STARTED"
	StatusPending    Status = "PENDING"
	StatusInReview   Status = "IN_REVIEW"
	StatusApproved   Status = "APPROVED"
	StatusRejected   Status = "REJECTED"
)

// EventResult is what our server did with one message from the identity provider.
type EventResult string

const (
	Applied      EventResult = "APPLIED"
	Duplicate    EventResult = "DUPLICATE"
	Stale        EventResult = "STALE"
	Parked       EventResult = "PARKED"
	BadSignature EventResult = "BAD_SIGNATURE"
	// VersionConflict: a different message already holds this version for this applicant.
	VersionConflict EventResult = "VERSION_CONFLICT"
)

// RecordResult is what the store found when asked to keep a message.
type RecordResult string

const (
	RecordNew         RecordResult = "NEW"
	RecordSameID      RecordResult = "SAME_ID"
	RecordSameVersion RecordResult = "SAME_VERSION"
)

// HoldReason says why trading is held for an applicant, whatever their status says.
type HoldReason string

const HoldNotFromProvider HoldReason = "NOT_FROM_PROVIDER"
