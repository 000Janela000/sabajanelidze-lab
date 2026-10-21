package kyc

import "context"

// #region kyc-handle-go

// HandleEvent is build v1 in Go: check the signature first, keep each message once, and apply messages in the
// provider's version order. A message that arrives before an earlier version is parked, and applied as soon as the
// gap closes. One applicant's messages never interleave (a row lock in Postgres). A refused message is logged as
// evidence, apart from the kept ones (so it can never use up a real message's ID) and outside the applicant's lock.
func HandleEvent(ctx context.Context, store Store, signatures SignatureCheck, refusals RefusalLog, event ProviderEvent) (EventResult, error) {
	signatureValid := signatures.Verify(event)
	if !signatureValid {
		err := refusals.Record(ctx, event, BadSignature)
		return BadSignature, err
	}
	result, err := store.ForApplicant(ctx, event.ApplicantID, func(tx Tx) (EventResult, error) {
		return applyInOrder(ctx, tx, event)
	})
	if err != nil {
		return "", err
	}
	if result == VersionConflict {
		err = refusals.Record(ctx, event, result)
	}
	return result, err
}

// applyInOrder runs inside the applicant's lock: keep the message once, then apply it and every parked one that
// follows on.
func applyInOrder(ctx context.Context, tx Tx, event ProviderEvent) (EventResult, error) {
	recorded, err := tx.RecordEvent(ctx, event)
	if err != nil {
		return "", err
	}
	if recorded == RecordSameID {
		return Duplicate, nil
	}
	if recorded == RecordSameVersion {
		// The same version under a new ID: a copy if it says the same, a conflict if it says something else.
		kept, err := tx.StoredEvent(ctx, event.Version)
		if err != nil {
			return "", err
		}
		sameContent := kept != nil && kept.Status == event.Status
		if !sameContent {
			return VersionConflict, nil
		}
	}
	applicant, err := tx.LoadApplicant(ctx)
	if err != nil {
		return "", err
	}
	if event.Version <= applicant.Version {
		return Stale, nil
	}
	if event.Version > applicant.Version+1 {
		return Parked, nil
	}

	// Apply this message, then every parked one that now follows on.
	next := &event
	for next != nil {
		applicant.Status, applicant.Version, applicant.LastSentAt = next.Status, next.Version, next.SentAt
		next, err = tx.StoredEvent(ctx, applicant.Version+1)
		if err != nil {
			return "", err
		}
	}
	err = tx.SaveApplicant(ctx, applicant)
	return Applied, err
}

// #endregion kyc-handle-go
