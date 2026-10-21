package kyc

import (
	"context"
	"fmt"
	"sync"
)

// MemoryStore is an in-memory stand-in for the applicants and provider_events tables. Each applicant has its own
// lock, held for the whole of ForApplicant, like a row lock held for a transaction.
type MemoryStore struct {
	mu         sync.Mutex
	locks      map[string]*sync.Mutex
	applicants map[string]Applicant
	events     map[string]ProviderEvent
	// serialise false switches the per-applicant lock off. Only the lock's own test does that.
	serialise bool
}

// NewMemoryStore creates a store with these applicants, none of them started.
func NewMemoryStore(applicantIDs ...string) *MemoryStore {
	store := &MemoryStore{
		locks:      map[string]*sync.Mutex{},
		applicants: map[string]Applicant{},
		events:     map[string]ProviderEvent{},
		serialise:  true,
	}
	for _, id := range applicantIDs {
		store.applicants[id] = Applicant{ApplicantID: id, Status: StatusNotStarted}
	}
	return store
}

// WithoutLock returns the store with its per-applicant lock switched off (for the lock's own test).
func (s *MemoryStore) WithoutLock() *MemoryStore {
	s.serialise = false
	return s
}

func (s *MemoryStore) lockFor(applicantID string) *sync.Mutex {
	s.mu.Lock()
	defer s.mu.Unlock()
	lock, ok := s.locks[applicantID]
	if !ok {
		lock = &sync.Mutex{}
		s.locks[applicantID] = lock
	}
	return lock
}

func (s *MemoryStore) ForApplicant(_ context.Context, applicantID string, work func(Tx) (EventResult, error)) (EventResult, error) {
	if s.serialise {
		lock := s.lockFor(applicantID)
		lock.Lock()
		defer lock.Unlock()
	}
	return work(memoryTx{store: s, applicantID: applicantID})
}

// Applicant is the applicant as stored now.
func (s *MemoryStore) Applicant(applicantID string) Applicant {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.applicants[applicantID]
}

// Events is every kept message for this applicant.
func (s *MemoryStore) Events(applicantID string) []ProviderEvent {
	s.mu.Lock()
	defer s.mu.Unlock()
	var kept []ProviderEvent
	for _, event := range s.events {
		if event.ApplicantID == applicantID {
			kept = append(kept, event)
		}
	}
	return kept
}

// memoryTx works on one applicant. Each method holds the store's mutex for its own body only.
type memoryTx struct {
	store       *MemoryStore
	applicantID string
}

func (t memoryTx) LoadApplicant(_ context.Context) (Applicant, error) {
	t.store.mu.Lock()
	defer t.store.mu.Unlock()
	applicant, ok := t.store.applicants[t.applicantID]
	if !ok {
		return Applicant{}, fmt.Errorf("unknown applicant %s", t.applicantID)
	}
	return applicant, nil
}

func (t memoryTx) SaveApplicant(_ context.Context, applicant Applicant) error {
	t.store.mu.Lock()
	defer t.store.mu.Unlock()
	t.store.applicants[t.applicantID] = applicant
	return nil
}

func (t memoryTx) RecordEvent(_ context.Context, event ProviderEvent) (RecordResult, error) {
	t.store.mu.Lock()
	defer t.store.mu.Unlock()
	if _, sameID := t.store.events[event.EventID]; sameID {
		return RecordSameID, nil
	}
	for _, kept := range t.store.events {
		sameVersion := kept.ApplicantID == t.applicantID && kept.Version == event.Version
		if sameVersion {
			return RecordSameVersion, nil
		}
	}
	t.store.events[event.EventID] = event
	return RecordNew, nil
}

func (t memoryTx) StoredEvent(_ context.Context, version int) (*ProviderEvent, error) {
	t.store.mu.Lock()
	defer t.store.mu.Unlock()
	for _, kept := range t.store.events {
		if kept.ApplicantID == t.applicantID && kept.Version == version {
			found := kept
			return &found, nil
		}
	}
	return nil, nil
}

// MemoryRefusalLog keeps refused messages in memory, in order.
type MemoryRefusalLog struct {
	mu       sync.Mutex
	refusals []EventResult
}

func (l *MemoryRefusalLog) Record(_ context.Context, _ ProviderEvent, reason EventResult) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.refusals = append(l.refusals, reason)
	return nil
}

// Reasons is every refusal's reason, oldest first.
func (l *MemoryRefusalLog) Reasons() []EventResult {
	l.mu.Lock()
	defer l.mu.Unlock()
	return append([]EventResult(nil), l.refusals...)
}
