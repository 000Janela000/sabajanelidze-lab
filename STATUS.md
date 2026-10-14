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
- **2026-10-15 (later):** **Look: a calm page + the game in a dark console** (`decisions/0001-calm-page-dark-console.md`), after three fresh-eyes testers and six reviewers (art director, game designer, fintech CTO, frontend engineer, growth advisor on Fable 5.1, plus Codex; `private/reviews/2026-10-15-fresh-eyes/summary.md`). The race figure plays **one safe run on arrival**, then asks. **"Book a call" is for both** consulting clients and employers. Saba's words on the calm look alone: "no personality … anyone with raw HTML can build it".

## Open problems (most important first)
1. **Build the new look and first screen** (decision 0001): tokens v2 (already copied, not committed), remove the notebook frame (grid, margin column, shift strip, mono labels, offset shadow), frame sentence + one meta line + action on the first screen, theme switch in the footer (`components/ThemeSwitch.astro`, not committed), text version behind a "contains the answers" disclosure; then the dark console with the race figure (safe run on arrival), the books, the travelling receipt; then run strips and the patch attack replay. Then a pixel-sampling contrast audit (the portfolio's `private/design/phase1c/audit/audit.mjs` takes a base URL and paths).
2. **Brand split risk:** www.sabajanelidze.com (live) is still the old Georgian-first site ("Senior Full-Stack Engineer, 3 years"); the lab says "Principal Engineer". The portfolio session got NOTICE lab-game#3 with Saba's feedback and the reviewers' advice (one live object on its home page). Don't launch the lab before this is settled.
3. **Saba's review of incident 1:** the clip `private/shots/incident-1-payments.webm` shows the old design; screenshots of the current one are in `private/shots/real/`. Every visible text needs his yes before going public (publish gate, item by item).
4. A few facts only Saba knows (not blocking): listed in `private/game-design-notes.md`.

## Next steps
- Now: open problem 1 (the new look, first screen, the console). Then incident 2's screens on the console (identity messages as moving envelopes).
- Incident 2, KYC: **core done** (`packages/core/src/kyc`, commit `55955bf`); next the screens, the proof card (TypeScript + Go), the Postgres version.
- Show Saba screenshots of the new first screen and console before building further moments.
- Small, later: the 4 Biome `noDescendingSpecificity` warnings in `game.css`; maybe add the Go checks to the pre-commit hook; a new clip for the new design.
- Before launch: the Worker + `lab.sabajanelidze.com` (needs Saba's OK), making the repo public, the publish gate for every text.

## Approvals in force
- **Scoped OK (Saba, 2026-10-14):** until launch, in this repo only, commit and push to the private GitHub repo without asking each time. **Not covered:** deploys, the Worker or the subdomain, making the repo public, other repos.
- **Public-safety rule:** the repo becomes public at launch with its full history, so every commit must be public-safe. Employer details, strategy and personal notes stay in `private/`.

## Waiting on someone outside
- Nothing. (The new tokens arrived in NOTICE lab-game#8.)

## Log (newest first)
- **2026-10-15:** Fresh-eyes test (3 testers, screenshots only) and two clarity proposals (designer agent, Codex), then Saba: the calm look has "no personality"; asked to compare with the live site and to run the attackers again. Six reviewers agreed: calm page, personality in a live game object. Saba chose: dark console, safe run on arrival, Book a call for both, NOTICE lab-game#3 to the portfolio session (sent). Decision 0001 written; design doc 12.1 updated.
- **2026-10-15:** **Incident 2 core** (`55955bf`): the identity provider's messages are checked by signature (HMAC-SHA256, Web Crypto), stored once by event ID, applied in the provider's version order, early ones parked; one applicant's messages never interleave. Every delivery order of Anna's two messages (each once or twice: 14 orders): build v0.1 locks her out in 7, "ignore older messages" 7 (both carry the same second), "refuse moves that aren't allowed" 4, build v1 0. A forged "approved" lets Boris in with every build except v1. 15 new tests, including a random-order property test and its defence check.
- **2026-10-15:** Code coloured like VS Code (green comments) in both themes (`4697c59`); each colour is darkened or lightened at build time until it reads at 4.5:1 on every background code sits on; axe checks it in both themes. Saba's feedback: the code boxes were not readable; the design lacks smoothness, and the incident page did not say what it is or why he was there.
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
