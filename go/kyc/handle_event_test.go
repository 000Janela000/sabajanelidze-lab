package kyc

import (
	"context"
	"sync"
	"testing"
	"time"
)

var ctx = context.Background()

// annaMessages are Anna's two messages, signed with the provider's test key, as in the TypeScript scenarios.
func annaMessages(applicantID string) (pending, approved ProviderEvent) {
	pending = Sign(ProviderEvent{EventID: "evt_anna_1", ApplicantID: applicantID, Version: 1, Status: StatusPending, SentAt: "2026-10-14T17:02:11Z"}, ProviderTestKey)
	approved = Sign(ProviderEvent{EventID: "evt_anna_2", ApplicantID: applicantID, Version: 2, Status: StatusApproved, SentAt: "2026-10-14T17:02:11Z"}, ProviderTestKey)
	return pending, approved
}

func handle(t *testing.T, store Store, refusals RefusalLog, event ProviderEvent) EventResult {
	t.Helper()
	result, err := HandleEvent(ctx, store, NewSignatureCheck(ProviderTestKey), refusals, event)
	if err != nil {
		t.Fatal(err)
	}
	return result
}

// The same scheme as the TypeScript code: Anna's first message has the same signature in both languages.
func TestSignatureMatchesTheTypeScriptCode(t *testing.T) {
	pending, _ := annaMessages("anna")
	want := "076861b85705a0aa60b73dd40070cb557b8ce4e517dfeaf685cc81c4f57bfd0e"
	if pending.Signature != want {
		t.Fatalf("signature %s, want %s", pending.Signature, want)
	}
}

func TestAppliesInVersionOrderKeepsEachMessageOnceAndParksAnEarlyOne(t *testing.T) {
	store := NewMemoryStore("anna")
	refusals := &MemoryRefusalLog{}
	pending, approved := annaMessages("anna")
	got := []EventResult{
		handle(t, store, refusals, approved),
		handle(t, store, refusals, approved),
		handle(t, store, refusals, pending),
		handle(t, store, refusals, pending),
	}
	want := []EventResult{Parked, Duplicate, Applied, Duplicate}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("results %v, want %v", got, want)
		}
	}
	applicant := store.Applicant("anna")
	if applicant.Status != StatusApproved || applicant.Version != 2 {
		t.Fatalf("applicant %+v, want approved at version 2", applicant)
	}
}

func TestAForgedMessageIsRefusedAndLoggedAndCannotUseUpARealID(t *testing.T) {
	store := NewMemoryStore("anna")
	refusals := &MemoryRefusalLog{}
	pending, approved := annaMessages("anna")
	// The forger sends first, with the ID the provider will use for "approved".
	fake := Sign(ProviderEvent{EventID: approved.EventID, ApplicantID: "anna", Version: 2, Status: StatusRejected, SentAt: approved.SentAt}, "a-key-that-is-not-ours")
	if result := handle(t, store, refusals, fake); result != BadSignature {
		t.Fatalf("forged message: %s, want BAD_SIGNATURE", result)
	}
	handle(t, store, refusals, pending)
	if result := handle(t, store, refusals, approved); result != Applied {
		t.Fatalf("the real message after the forged one: %s, want APPLIED", result)
	}
	reasons := refusals.Reasons()
	if len(reasons) != 1 || reasons[0] != BadSignature {
		t.Fatalf("refusals %v, want one BAD_SIGNATURE", reasons)
	}
}

func TestADifferentMessageClaimingAKeptVersionIsRefusedAndLogged(t *testing.T) {
	store := NewMemoryStore("anna")
	refusals := &MemoryRefusalLog{}
	pending, approved := annaMessages("anna")
	handle(t, store, refusals, pending)
	handle(t, store, refusals, approved)
	rival := Sign(ProviderEvent{EventID: "evt_anna_2b", ApplicantID: "anna", Version: 2, Status: StatusRejected, SentAt: approved.SentAt}, ProviderTestKey)
	if result := handle(t, store, refusals, rival); result != VersionConflict {
		t.Fatalf("rival: %s, want VERSION_CONFLICT", result)
	}
	copyUnderNewID := Sign(ProviderEvent{EventID: "evt_anna_1_again", ApplicantID: "anna", Version: 1, Status: StatusPending, SentAt: pending.SentAt}, ProviderTestKey)
	if result := handle(t, store, refusals, copyUnderNewID); result != Stale {
		t.Fatalf("an old copy under a new ID: %s, want STALE", result)
	}
	if applicant := store.Applicant("anna"); applicant.Status != StatusApproved {
		t.Fatalf("applicant %+v, want approved", applicant)
	}
}

// stagedStore stages the race the lock prevents: #1's save waits at a gate, which opens when #2 has loaded the
// applicant (so #2 saw the state from before #1's save), or after 50 ms if #2 cannot get in at all (the lock).
type stagedStore struct {
	inner     Store
	reachSave sync.Once
	reachedCh chan struct{}
	openOnce  sync.Once
	gate      chan struct{}
	mu        sync.Mutex
	loads     int
}

func newStagedStore(inner Store) *stagedStore {
	return &stagedStore{inner: inner, reachedCh: make(chan struct{}), gate: make(chan struct{})}
}

func (s *stagedStore) open() { s.openOnce.Do(func() { close(s.gate) }) }

func (s *stagedStore) ForApplicant(ctx context.Context, applicantID string, work func(Tx) (EventResult, error)) (EventResult, error) {
	return s.inner.ForApplicant(ctx, applicantID, func(tx Tx) (EventResult, error) {
		return work(stagedTx{Tx: tx, store: s})
	})
}

type stagedTx struct {
	Tx
	store *stagedStore
}

func (t stagedTx) LoadApplicant(ctx context.Context) (Applicant, error) {
	applicant, err := t.Tx.LoadApplicant(ctx)
	t.store.mu.Lock()
	t.store.loads++
	second := t.store.loads == 2
	t.store.mu.Unlock()
	if second {
		t.store.open()
	}
	return applicant, err
}

func (t stagedTx) SaveApplicant(ctx context.Context, applicant Applicant) error {
	t.store.reachSave.Do(func() { close(t.store.reachedCh) })
	<-t.store.gate
	return t.Tx.SaveApplicant(ctx, applicant)
}

// race sends #1; when it is saving, sends #2.
func race(t *testing.T, memory *MemoryStore) []EventResult {
	t.Helper()
	store := newStagedStore(memory)
	refusals := &MemoryRefusalLog{}
	pending, approved := annaMessages("anna")
	first := make(chan EventResult)
	go func() { first <- handle(t, store, refusals, pending) }()
	<-store.reachedCh
	time.AfterFunc(50*time.Millisecond, store.open)
	second := handle(t, store, refusals, approved)
	return []EventResult{second, <-first}
}

// The lock's own proof: #1 has checked that nothing follows it and is saving when #2 arrives. With the lock, #2
// waits, then follows #1.
func TestWithTheLockTwoArrivingWhileOneIsSavingStillEndsApproved(t *testing.T) {
	memory := NewMemoryStore("anna")
	results := race(t, memory)
	if results[0] != Applied || results[1] != Applied {
		t.Fatalf("results %v, want APPLIED, APPLIED", results)
	}
	if applicant := memory.Applicant("anna"); applicant.Status != StatusApproved || applicant.Version != 2 {
		t.Fatalf("applicant %+v, want approved at version 2", applicant)
	}
}

// The defence check for the lock: switched off, the same test must fail. #2 reads the state from before #1's
// save, is parked, and nothing ever applies it: Anna stuck at #1.
func TestWithoutTheLockTheSameRaceLeavesAnnaStuckAtOne(t *testing.T) {
	memory := NewMemoryStore("anna").WithoutLock()
	results := race(t, memory)
	if results[0] != Parked || results[1] != Applied {
		t.Fatalf("results %v, want PARKED, APPLIED", results)
	}
	if applicant := memory.Applicant("anna"); applicant.Status != StatusPending || applicant.Version != 1 {
		t.Fatalf("applicant %+v, want pending at version 1", applicant)
	}
}

// Many goroutines at once (the race detector watches this in CI): copies of #1 and #2 end approved, kept once each.
func TestTwentyDeliveriesAtOnceEndApprovedWithEachMessageKeptOnce(t *testing.T) {
	store := NewMemoryStore("anna")
	refusals := &MemoryRefusalLog{}
	pending, approved := annaMessages("anna")
	var wg sync.WaitGroup
	for i := range 20 {
		event := pending
		if i%2 == 0 {
			event = approved
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			handle(t, store, refusals, event)
		}()
	}
	wg.Wait()
	if applicant := store.Applicant("anna"); applicant.Status != StatusApproved || applicant.Version != 2 {
		t.Fatalf("applicant %+v, want approved at version 2", applicant)
	}
	if kept := len(store.Events("anna")); kept != 2 {
		t.Fatalf("kept %d messages, want 2", kept)
	}
}
