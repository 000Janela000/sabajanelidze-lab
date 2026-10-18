# Codex review: incident 1 (payments)

On 2026-10-15, just after midnight, Codex (OpenAI's coding agent) reviewed incident 1 before it was published: the withdrawal, the two stores, the clean-up, the step simulator and the incident page. It could read the code but not change it.

Below is its answer word for word. Only the file links changed: they pointed at a folder on my computer, so they are now plain paths. The paths and line numbers are those of the code at the time (commit `faa4989` and work not yet committed). Several files have moved or been renamed since.

## What was done about each finding

| # | Finding | Fixed in | What guards it now |
|---|---|---|---|
| 1 | A repeated payout ID could take money from the balance without a new payment | `5ccb90f` | `packages/core/test/payments/withdraw.test.ts`: "a repeated payout ID gets the first answer, and no money moves twice" and "the same payout ID with a different amount is refused and changes nothing" |
| 2 | "Not found" released an unknown payout too soon | `5ccb90f` | `packages/core/test/payments/clean-up.test.ts`: "keeps the money on hold when the bank says NOT_FOUND: that answer is not final" |
| 3 | The end-of-day job could not find a bank payout with no hold | `5ccb90f` | `clean-up.test.ts`: "flags the double payout of build v0.1" and "flags a payout the bank paid twice" |
| 4 | Negative amounts were accepted | `5ccb90f` | `withdraw.test.ts`: "refuses an amount of 0, -8000 and 0.5 and changes nothing" |
| 5 | "Every possible order" counted some orders twice | `5ccb90f` | `packages/core/test/simulation/race.test.ts`: "no two counted runs are the same sequence of steps" (the count went from 70 to 54) |
| 6 | The page linked to Postgres code and a CI claim before they were committed | `ba4cc68` | The site build fails in CI when a linked file is not in the commit it links to (`apps/lab/src/lib/source.ts`), and CI runs the real-database job on every push |
| 7 | Some numbers on the page were typed by hand | `ba4cc68` | The race counts are computed at build time by running the code (`apps/lab/src/incidents/payments/build-data.ts`) |
| 8 | "Read the code and the tests" did not move keyboard focus | `ba4cc68` | `tests/e2e/payments.spec.ts`: the play-through test checks that focus moves into the card |

## Codex's answer

**Verdict:** Not ready for public release. The fixed path handles the two distinct withdrawals shown in the game, but repeated payout IDs and an unresolved bank timeout can make the money state wrong. The advertised counts include duplicate schedules.

### Critical

- **A repeated payout ID can remove money from the customer’s balance without a new bank payment.** `packages/core/src/payments/memory.ts:39` changes the balance and hold *before* its duplicate ledger entry throws. The new Postgres store:43 (`packages/core/src/payments/postgres.ts:43`) can accept the same ID again after settlement; FakeBank:165 (`packages/core/src/payments/memory.ts:165`) then returns “paid” for the old payment. From 200, two completed withdrawals of 80 with one ID can leave 40 available although the bank paid only 80. **Fix:** keep a lasting payout record keyed by customer and ID, bind it to the amount, and return the stored result before moving funds.

- **“Not found” releases an unknown payout too soon.** `packages/core/src/payments/withdraw.ts:68` releases the hold for both `refused` and `not_found`. Yet `packages/core/src/payments/reconcile.ts:43` correctly leaves `not_found` on hold. If a bank has accepted a delayed payment but cannot yet find it by status, the customer can spend the released 80 before that payment appears. **Fix:** release only on a final refusal or confirmed cancellation; keep `not_found` unknown and reconcile later.

### Major

- **The end-of-day job cannot find an extra bank payout with no hold.** `packages/core/src/payments/reconcile.ts:40` visits only open holds. In the page’s v0.1 double payment, writeAvailable in memory.ts:35 (`packages/core/src/payments/memory.ts:35`) writes no ledger entry and there are no holds, so this job returns nothing despite the bank paying 160. **Fix:** compare *all* bank payouts with payout and ledger records, and check stored balances against ledger balances. Describe the current job as “open-hold cleanup” until then.

- **The money methods accept negative amounts.** `packages/core/src/payments/withdraw.ts:39` and `packages/core/src/payments/memory.ts:39` do not require `amount > 0`. A withdrawal of −80 increases an available balance of 100 to 180; the fake bank records a negative payout, while moneyPicture:24 (`packages/core/src/payments/reconcile.ts:24`) still reports zero discrepancy. The property test uses positive amounts only. **Fix:** validate positive whole cents at the withdrawal boundary and in `reserve`, then test zero and negative requests.

- **“Every possible order” counts some completed orders twice.** `packages/core/src/sim/race.ts:107` skips picks after a request refuses early, while `packages/core/src/sim/race.ts:136` still enumerates fixed four-step slots for each request. For example, `AAABBABB` and `AAABBBAB` execute the same steps once B refuses. Thus `apps/lab/src/pages/day/payments.astro:219` presents **36 of 70 padded schedules** as 70 distinct executable orders. The tests pin that count but do not establish its wording. **Fix:** count distinct executed traces and update every patch count, or explicitly call these padded schedules. “Only safe when requests don’t overlap” on line 222 is also false: some overlapping requests refuse safely.

- **The new Postgres proof is ahead of its evidence.** `apps/lab/src/pages/day/payments.astro:167` links to new Postgres source and says the database race runs in CI. At review time those files and the CI job were uncommitted, while `apps/lab/src/lib/source.ts:26` makes links to `HEAD`; a build now would link to files absent from that commit. The build-chain list:73 (`apps/lab/src/pages/day/payments.astro:73`) also omits both new files. **Fix:** include them in the chain, verify linked files exist at the linked commit, and publish the CI claim only after that job passes.

### Minor

- **Some displayed numbers bypass the computed result.** `apps/lab/src/islands/payments/PaymentsIncident.tsx:155` hardcodes “160.00” and “20.00”; line 273 (`apps/lab/src/islands/payments/PaymentsIncident.tsx:273`) hardcodes 70. **Fix:** render these from `moneyPicture` and `allOrders`, so the page’s “computed from the code” promise remains true after changes.

- **“Read the code and the tests” scrolls without moving keyboard focus.** `apps/lab/src/islands/payments/PaymentsIncident.tsx:193` opens and scrolls to the proof card, but focus stays on the old button. **Fix:** focus the proof summary or heading after opening it.

The defence-off test does assert a failure, and the scheduler gates the withdrawal’s store and bank calls. I could not run the suite here: Vitest tried to change its cache and received `EPERM` in this read-only workspace.
