# Codex review: the Go version of the withdrawal

On 2026-10-15 at 01:30, Codex (OpenAI's coding agent) reviewed `go/payments` before its first commit: the withdrawal, the in-memory and Postgres stores, and their tests. It could read the code but not change it.

Below is its answer word for word. Only the file links changed: they pointed at a folder on my computer, so they are now plain paths. The line numbers are those of the code before the fixes. All four were fixed before the first commit of the Go code (`5a94130`).

## What was done about each finding

| # | Finding | What guards it now |
|---|---|---|
| 1 | A direct negative reserve could create spendable money | `go/payments/withdraw_test.go`: `TestReserveRefusesBadAmountsAndChangesNothing` (both stores) |
| 2 | The real-Postgres repeated-ID test could not prove ID protection | `go/payments/postgres_test.go`: `TestPostgresSameIDTwentyTimesMovesMoneyOnce` now funds 30,000 (more than one payout), counts every call to the bank and checks the final balance |
| 3 | The race tests did not force the reserves to overlap | `go/payments/race_test.go`: all 20 requests now wait at `Reserve` until every one has arrived, then go at once |
| 4 | The bank-refusal path had no Go test | `go/payments/withdraw_test.go`: `TestWithdrawReleasesTheHoldWhenTheBankRefuses` |

Each new test was first run against code broken on purpose, to see it fail.

## Codex's answer

1. **High — a direct negative reserve can create spendable money.** `go/payments/memory.go:50` does not reject a negative amount. With 10,000 cents available, `Reserve(..., -8000, ...)` raises available to 18,000 and makes held −8,000. A later valid withdrawal can then pay more than the opening balance. `Withdraw` checks its own input, but callers can use the exported store method directly. The TypeScript store (`packages/core/src/payments/adapters/memory-store.ts:40`) rejects this. Validate positive amounts inside both Go `Reserve` methods.

2. **Medium — the real-Postgres repeated-ID test cannot prove ID protection.** `go/payments/postgres_test.go:35` gives the customer 10,000 cents, then sends twenty 8,000-cent requests with one ID (`go/payments/postgres_test.go:77`). Funds alone prevent a second reserve, even if ID protection breaks; the fake bank also deduplicates payments. The TypeScript test (`packages/core/test/payments/postgres.test.ts:166`) uses 30,000 cents. Fund at least two payouts, check the final balance and every response, and use a bank spy that counts every `Pay` call.

3. **Medium — the safe-path race tests do not force the reserve calls to overlap.** slowReads (`go/payments/race_test.go:13`) delays `ReadAvailable`, but Withdraw (`go/payments/withdraw.go:20`) calls `Reserve` instead. The Postgres test (`go/payments/postgres_test.go:47`) likewise starts goroutines without a barrier before reserve. A broken read-then-write reserve could pass if those calls run one after another. Add a shared barrier immediately before `Reserve` in the real-database test.

4. **Low — the bank-refusal path has no Go regression test.** `go/payments/memory.go:121` can pay or time out, but cannot refuse. If Withdraw’s release branch (`go/payments/withdraw.go:47`) were changed to settle a refused payout, the Go tests would still pass. The TypeScript test (`packages/core/test/payments/withdraw.test.ts:21`) covers this case. Add a refusal mode and assert that available returns to its opening value, held becomes zero, and the bank pays nothing.

I found no double-payout or deadlock path in the current Postgres SQL by inspection. I did not run a real-database test in this read-only review, so that conclusion is not a runtime verification. No files were changed.
