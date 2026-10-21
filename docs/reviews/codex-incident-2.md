# Codex review: incident 2 (identity checks)

On 2026-10-21, Codex (OpenAI's coding agent) reviewed incident 2 before it was published: the identity-check code in TypeScript and Go, its stores, the clean-up, the delivery simulator, the game and its page. It could read the code but not change it.

Below is its answer word for word. Only the file links changed: they pointed at a folder on my computer, so they are now plain paths. The paths and line numbers are those of the code at the time (commit `bde227b`).

## What was done about each finding

| # | Finding | Fixed in | What guards it now |
|---|---|---|---|
| 1 | A signature could be moved to another applicant by moving a "\|" between fields | `e22830d` | Each signed field now carries its length. `packages/core/test/kyc/handle-event.test.ts`: "a signature cannot be moved to another applicant by moving a "\|" from one field to the next"; `go/kyc/handle_event_test.go`: `TestASignatureCannotBeMovedToAnotherApplicantByMovingASeparator` |
| 2 | The clean-up could leave a parked message unapplied | `e22830d` | `packages/core/test/kyc/provider-check.test.ts`: "a message parked before the clean-up is applied once the clean-up has caught up" |
| 3 | An out-of-date answer from the provider could put a real applicant on hold | `e22830d` | When our record is newer than the provider's answer, the clean-up asks again before it decides. `provider-check.test.ts`: "a real message applied after the provider answered is not called forged: the provider is asked again" |
| 4 | A second signed message for a kept version, with the same status, is not logged | Kept on purpose | Only the provider can sign, so this is the provider sending the same fact again under a new ID; applying it changes nothing. A message that says something else at a kept version is refused and logged (`packages/core/test/kyc/handle-event.test.ts`: "a different message claiming a version already kept is refused and logged, never applied"). The page now says exactly this |
| 5 | The proof card did not say the provider's API is simulated, and joined two database tests into one | `e22830d` | The card says "simulated here" and describes the two real-database tests apart. Every claim on the card was also checked against the code by a second reviewer |
| 6 | A later click in the clean-up could be overwritten by an earlier one | `e22830d` | Each click is numbered, and a result that comes back after a newer click is dropped (`apps/lab/src/incidents/kyc/CleanUp.tsx`). No automated test: the timing cannot be staged from the browser |

## Codex's answer

**Not ready to publish.** The 14 delivery orders and the teaching patch counts match the code and tests, but the findings below need fixes.

### Critical

1. **A valid signature can be reused for another applicant if an ID contains `|`.** `packages/core/src/kyc/signature.ts:14` and `go/kyc/signature.go:17` join fields with that separator without escaping them. A signed approval for event `e`, applicant `attacker|victim` has the same signed bytes as event `e|attacker`, applicant `victim`. Build v1 can apply the altered event to the victim. This depends on the provider allowing `|` in an ID; the port sets no restriction. Use an unambiguous signed format in both languages and test this case.

2. **Clean-up can leave a parked revocation unapplied.** `packages/core/src/kyc/provider-check.ts:50` advances the applicant directly to the provider snapshot without draining stored messages. For example, it fetches history through v2 “approved”; a signed v3 “rejected” arrives and is parked while the applicant is still at v1; clean-up then saves v2. A retry of v3 returns `DUPLICATE` at `packages/core/src/kyc/handle-event.ts:26`. The applicant remains approved and can trade. Apply contiguous parked messages after catching up, under the same lock, and add this race to the tests.

### Major

3. **An older provider snapshot can wrongly put a valid applicant on hold.** The provider record is fetched before the applicant lock at `packages/core/src/kyc/provider-check.ts:50`. If it contains v2 and a genuine v3 is applied before clean-up takes the lock, the comparison sees no v3 in the old snapshot and sets `NOT_FROM_PROVIDER` at line 64. Treat a local version ahead of the fetched record as inconclusive and fetch again before placing a fraud hold.

4. **Some conflicting signed messages disappear from the refusal trail.** `packages/core/src/kyc/handle-event.ts:29` and `go/kyc/handle_event.go:45` compare only status when a different ID claims a kept version. Two signed v2 approvals with different IDs and `sentAt` values result in `STALE`, with no conflict logged. Compare the full signed content and log differing messages as version conflicts.

### Minor

5. **The proof card describes checks the demo does not perform.** `apps/lab/src/incidents/kyc/texts.ts:357` says the provider record is fetched “over our authenticated connection,” while the game uses the fixed in-memory records in `packages/core/src/kyc/adapters/memory-store.ts:117`. Say that this API is simulated. The real-database description at `apps/lab/src/incidents/kyc/texts.ts:354` also merges two tests: the 20-delivery test and the separate two-delivery lock-off race. Describe them separately.

6. **A later clean-up click can be overwritten by an earlier one.** `apps/lab/src/incidents/kyc/CleanUp.tsx:98` sets the selected choice after asynchronous work, while all three buttons remain usable. If “Ask the provider” starts, then “Answer from our record” finishes first, the earlier ask can finish last and replace the visitor’s latest choice. Disable choices while a request runs or discard results from superseded clicks.

This was a read-only code review; I did not run the test suite.
