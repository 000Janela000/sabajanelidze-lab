# sabajanelidze-lab — Status

> Read this at the start of every session. Update it at the end.
> Rule: if it matters next session, write it here. Never put secret values here; write only where they live.
> Last updated: **2026-10-15**

## Where we are
- **Live:** not live yet. Planned address: `lab.sabajanelidze.com` (not created).
- **Stage:** Phase 2, building. Design v2 approved (`docs/game-design.md`). **Incident 1, Payments, works end to end on the local site** (reproduce → count → fix → clean up → proof card), on the real code in `packages/core`. Not deployed anywhere.
- **Run it locally:** `pnpm install`, then `pnpm build` and `pnpm --filter @lab/site exec astro preview` (one preview server at a time). Checks: `pnpm check`; browser tests: `pnpm test:e2e`.
- **Hosting / deploy:** planned: one Cloudflare Worker (free plan). Nothing created.
- **Git:** `main`, GitHub `000Janela000/sabajanelidze-lab` (**private** until launch). Agent commits use the author "Claude Agent" with Saba's GitHub noreply address (never his personal email).

## Decisions (Saba, 2026-10-14)
- Core: **"One day on call"**: each station is an incident: reproduce → fix (pick the patch that survives every order) → clean up.
- Launch: **payments incident first, with the portfolio**; then KYC; then deposits (simulated, then real Sepolia); then AI.
- **Every proof card shows its build chain** (agent-written, checks run, refusals, Saba's approval, Codex review). History is kept from the first commit and never squashed.
- **Keep the crypto-exchange theme**; proof cards say only "patterns I use in production" about past work; a "built at home, no employer code" line.
- Art direction **A, "exchange back office"**. Repo private now, public at launch.

## Open problems (most important first)
1. **Saba's review of incident 1:** the clip `private/shots/incident-1-payments.webm` and screenshots in `private/shots/`; every visible text needs his yes before going public (publish gate).
2. **Design tokens** (colours, fonts, timings) come from the portfolio session; its direction is "notebook" (light "Paper", dark "Blueprint"). It will send a NOTICE with the token file path. Until then the lab uses neutral placeholders (`apps/lab/src/styles/global.css`).
3. A few facts only Saba knows (not blocking): listed in `private/game-design-notes.md`.

## Next steps
- Saba: watch the clip (`private/shots/incident-1-payments.webm`) and send notes; the texts of incident 1 go through the publish gate as one list later.
- Lab session (Saba's choice, 2026-10-15): build Incident 2, KYC (design doc 7.2), applying Saba's notes on incident 1 as they come.
- Before launch: the Worker + `lab.sabajanelidze.com` (needs Saba's OK), the portfolio's design tokens, making the repo public.

## Approvals in force
- **Scoped OK (Saba, 2026-10-14):** until launch, in this repo only, commit and push to the private GitHub repo without asking each time. **Not covered:** deploys, the Worker or the subdomain, making the repo public, other repos.
- **Public-safety rule:** the repo becomes public at launch with its full history, so every commit must be public-safe. Employer details, strategy and personal notes stay in `private/`.

## Waiting on someone outside
- Portfolio session (`sabajanelidze-81`): a NOTICE with the design-tokens path, once they exist.

## Log (newest first)
- **2026-10-15:** Booking path confirmed by the portfolio session: `https://www.sabajanelidze.com/book?from=lab-<station>`. CI green on all three jobs (core, site with browser tests, real-Postgres race). Saba chose: watch the clip, then KYC.
- **2026-10-15:** Built the foundation and incident 1. Core: ledger with holds, `withdraw` (build v1) and `withdrawV01` (naive), three patches, a step scheduler that runs the real async code one await at a time, lasting payout records (repeated IDs are safe), reconciliation both ways, a Postgres store. Site: Astro 7 + Preact 10 island (about 17 KB of JavaScript on the incident page), text version, proof card with build-time code excerpts, build chain from git and `build-log/checks.jsonl`. Tests: 40 unit/property tests, 3 real-Postgres tests (CI only), 8 Playwright tests (desktop, phone, reduced motion, axe, no-JavaScript text). A Codex review found 7 problems (repeated payout IDs, early release on "not found", one-way reconciliation, negative amounts, padded order counts, typed-in numbers, focus); all fixed with tests (`private/reviews/2026-10-15-codex-incident1-review.md`). Honest counts: build v0.1 loses in 36 of 54 ways to run.
- **2026-10-15:** The portfolio session's NOTICE lab-game#3: Saba decided there is no request to Bitnet; he approves each exact text himself (publish gate, item by item, in this terminal). Title: Principal Engineer. Portfolio design direction: notebook ("Paper" light, "Blueprint" dark).
- **2026-10-14:** Saba gave the scoped commit/push OK. Moved employer details, strategy and personal questions to `private/game-design-notes.md` so every commit is public-safe.
- **2026-10-14:** Design attack: five Fable 5.1 reviewers (designer, CEO, CTO, backend, AI engineer) + Codex. Saba chose all four recommended changes (core "One day on call", payments first, build chain, keep theme). Wrote design v2. Verified race numbers with scripts (build v0.1: 36 of 70 orders lose, 1 of 4 pause points; "check twice" 43%, "lock only the read" 45%, "reserve, then settle" 0%).
- **2026-10-14:** Saba decided: art A, repo private now. Created the private GitHub repo `000Janela000/sabajanelidze-lab` (empty). Sent `STATUS lab-game#1` to the portfolio session.
- **2026-10-14:** Session started from the portfolio session's brief (`../SabaJanelidze/private/strategy/2026-10-14-game-session-brief.md`). Set up `AGENTS.md`, `CLAUDE.md`, `STATUS.md`, `.gitignore`, `private/`, local git (`core.autocrlf=input`, `core.filemode=false`). Wrote the game design document v1.
