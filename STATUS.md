# sabajanelidze-lab — Status

> Read this at the start of every session. Update it at the end.
> Rule: if it matters next session, write it here. Never put secret values here; write only where they live.
> Last updated: **2026-10-15**

## Where we are
- **Live:** not live yet. Planned address: `lab.sabajanelidze.com` (not created).
- **Stage:** Phase 2, building. Design v2 approved (`docs/game-design.md`). **Incident 1, Payments, works end to end on the local site** (briefing card → reproduce → count → fix → clean up → proof card), on the real code in `packages/core`. The proof card shows the fix in **TypeScript or Go** (tabs). Not deployed anywhere.
- **Run it locally:** `pnpm install`, then `pnpm build` and `pnpm --filter @lab/site exec astro preview` (one preview server at a time; stop it with `pnpm --filter @lab/site exec astro preview stop` before `pnpm test:e2e`). Checks: `pnpm check`; Go: `cd go && go vet ./... && go test ./...` (the race detector `-race` needs a C compiler, so it runs in CI only on this PC).
- **CI:** four jobs, all green on `5a94130`: core, site (build + 16 browser tests), real-Postgres race (TypeScript), Go (race detector + real Postgres).
- **Hosting / deploy:** planned: one Cloudflare Worker (free plan). Nothing created.
- **Git:** `main`, GitHub `000Janela000/sabajanelidze-lab` (**private** until launch). Agent commits use the author "Claude Agent" with Saba's GitHub noreply address (never his personal email).

## Decisions (Saba)
- **2026-10-14:** Core **"One day on call"**: each station is an incident: reproduce → count → fix (pick the patch that survives every order) → clean up. Launch with **payments first, with the portfolio**; then KYC; then deposits (simulated, then real Sepolia); then AI. **Every proof card shows its build chain.** Keep the crypto-exchange theme; proof cards say only "patterns I use in production" about past work. Repo private now, public at launch.
- **2026-10-15:** Status and error codes are **UPPER_CASE constants, never plain text** (rule in `AGENTS.md`). Clean up first (codes, folders, texts files, briefing card + first-move hint, concrete home page), then KYC. **Add the Go tab now** (the game stays TypeScript; no Python). Design: follow the portfolio's look (then the notebook tokens + 7 game extensions; keep the "MONEY LOST" stamp and "ticket #1041 · via support chat").

## Open problems (most important first)
1. **The portfolio's design is being reset** (NOTICE lab-game#7, 2026-10-15): Saba chose direction A, **"Calm precision"**, in place of the notebook: no grid, no glow, no notebook labels ("fig.", "§", "rev."), one button style without the offset shadow, light + dark (dark follows the system, a labelled switch in the footer), one calm blue accent. The lab's current look (commit `2cc19d7`) is built on the old notebook tokens. **Plan:** keep building on the current look (no second re-skin); when the portfolio session sends the new `tokens.css` + `docs/design-tokens.md`, re-skin the lab once and run a **contrast audit (WCAG AA)** on it, as the portfolio session asked.
2. **Saba's review of incident 1:** the clip `private/shots/incident-1-payments.webm` shows the old design; screenshots of the current one are in `private/shots/real/`. Every visible text needs his yes before going public (publish gate, item by item).
3. A few facts only Saba knows (not blocking): listed in `private/game-design-notes.md`.

## Next steps
- Lab session: build **Incident 2, KYC** (design doc 7.2) on the new structure (reuse `apps/lab/src/game/`, codes, a texts file, tests).
- When the new tokens arrive: re-skin + contrast audit (see open problem 1).
- Small, later: the 4 Biome `noDescendingSpecificity` warnings in `game.css`; maybe add the Go checks to the pre-commit hook; a new clip for the new design.
- Before launch: the Worker + `lab.sabajanelidze.com` (needs Saba's OK), making the repo public, the publish gate for every text.

## Approvals in force
- **Scoped OK (Saba, 2026-10-14):** until launch, in this repo only, commit and push to the private GitHub repo without asking each time. **Not covered:** deploys, the Worker or the subdomain, making the repo public, other repos.
- **Public-safety rule:** the repo becomes public at launch with its full history, so every commit must be public-safe. Employer details, strategy and personal notes stay in `private/`.

## Waiting on someone outside
- Portfolio session (`sabajanelidze-81`): a NOTICE with the new "Calm precision" `tokens.css` and `docs/design-tokens.md`.

## Log (newest first)
- **2026-10-15:** **Go tab.** `go/payments`: the same withdrawal in Go (same codes, same SQL, same lock order), a mutex in-memory store, a Postgres store (pgx v5.11.0), tests: 9 in memory + 3 on real Postgres, the 20-at-once race held at `Reserve` by a barrier so the reserves really collide, all under `-race` in CI. A Codex review of the Go code found 4 problems (negative amount in `Reserve`, a same-ID test funded for only one payout, no barrier, no bank-refusal test); all fixed, and each test was shown to fail on purpose-broken code. Proof card: TypeScript/Go tabs (keyboard arrows, no-JavaScript shows both), a "Go version" test link, Go files in the build chain. Also fixed: **the real-Postgres CI job had been red since `1908990`** (the folder clean-up moved the test file; CI still pointed at the old path); code boxes now take keyboard focus so they can be scrolled (an accessibility scan of the open proof card found it); the game's patch code wraps instead of scrolling. 16 browser tests.
- **2026-10-15:** NOTICE lab-game#7 from the portfolio session: design reset to "Calm precision" (see open problem 1). `/book` stays the booking path and reads `?from=lab-<station>`; for now it is a "Get in touch" page.
- **2026-10-15:** Design pass (`2cc19d7`): the portfolio's notebook tokens v1 copied as-is to `apps/lab/src/styles/tokens.css`, 7 game extensions, both themes, the same theme switch (`data-theme`, localStorage key `theme`).
- **2026-10-15:** Clean-up (`1908990`): UPPER_CASE codes, folders by layer (`money/`, `payments/`, `simulation/`; site `game/`, `incidents/payments/`), all words in one texts file per incident, the briefing card and first-move hint, a concrete home page.
- **2026-10-15:** Booking path confirmed by the portfolio session: `https://www.sabajanelidze.com/book?from=lab-<station>`.
- **2026-10-15:** Built the foundation and incident 1. Core: ledger with holds, `withdraw` (build v1) and `withdrawV01` (naive), three patches, a step scheduler that runs the real async code one await at a time, lasting payout records (repeated IDs are safe), reconciliation both ways, a Postgres store. Site: Astro 7 + Preact 10 island, text version, proof card with build-time code excerpts, build chain from git and `build-log/checks.jsonl`. A Codex review found 7 problems; all fixed with tests (`private/reviews/2026-10-15-codex-incident1-review.md`). The real-Postgres test found a deadlock; fixed by lock order (balance row first). Honest counts: build v0.1 loses in 36 of 54 ways to run.
- **2026-10-15:** The portfolio session's NOTICE lab-game#3: Saba approves each exact text himself (publish gate, item by item, in this terminal). Title: Principal Engineer.
- **2026-10-14:** Saba gave the scoped commit/push OK. Moved employer details, strategy and personal questions to `private/game-design-notes.md` so every commit is public-safe.
- **2026-10-14:** Design attack: five Fable 5.1 reviewers (designer, CEO, CTO, backend, AI engineer) + Codex. Saba chose all four recommended changes. Wrote design v2.
- **2026-10-14:** Saba decided: art A, repo private now. Created the private GitHub repo `000Janela000/sabajanelidze-lab`. Sent `STATUS lab-game#1` to the portfolio session.
- **2026-10-14:** Session started from the portfolio session's brief (`../SabaJanelidze/private/strategy/2026-10-14-game-session-brief.md`). Set up `AGENTS.md`, `CLAUDE.md`, `STATUS.md`, `.gitignore`, `private/`, local git. Wrote the game design document v1.
