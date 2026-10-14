# sabajanelidze-lab — Status

> Read this at the start of every session. Update it at the end.
> Rule: if it matters next session, write it here. Never put secret values here; write only where they live.
> Last updated: **2026-10-14**

## Where we are
- **Live:** not live yet. Planned address: `lab.sabajanelidze.com` (not created).
- **Stage:** Phase 1, design done. The game design document is at **v2**: `docs/game-design.md` ("On call: one day at a tiny crypto exchange"). v2 came from six attack reviews (`private/reviews/2026-10-14-design-attack.md`). Nothing built yet.
- **Hosting / deploy:** planned: one Cloudflare Worker (free plan). Nothing created.
- **Git:** `main`, GitHub `000Janela000/sabajanelidze-lab` (**private** until launch). Agent commits use the author "Claude Agent" with Saba's GitHub noreply address (never his personal email).

## Decisions (Saba, 2026-10-14)
- Core: **"One day on call"**: each station is an incident: reproduce → fix (pick the patch that survives every order) → clean up.
- Launch: **payments incident first, with the portfolio**; then KYC; then deposits (simulated, then real Sepolia); then AI.
- **Every proof card shows its build chain** (agent-written, checks run, refusals, Saba's approval, Codex review). History is kept from the first commit and never squashed.
- **Keep the crypto-exchange theme**; proof cards say only "patterns I use in production" about past work; a "built at home, no employer code" line.
- Art direction **A, "exchange back office"**. Repo private now, public at launch.

## Open problems (most important first)
1. **Design tokens** (colours, fonts, timings) come from the portfolio session; they don't exist yet. Asked it for a NOTICE with the path. Until then the lab uses neutral placeholders.
2. A few facts only Saba knows (not blocking): listed in `private/game-design-notes.md`.

## Next steps
- Lab session: build the foundation, then Incident 1 "Payments" (design doc sections 7.1, 10, 13.2). Then a STATUS to the portfolio session.

## Approvals in force
- **Scoped OK (Saba, 2026-10-14):** until launch, in this repo only, commit and push to the private GitHub repo without asking each time. **Not covered:** deploys, the Worker or the subdomain, making the repo public, other repos.
- **Public-safety rule:** the repo becomes public at launch with its full history, so every commit must be public-safe. Employer details, strategy and personal notes stay in `private/`.

## Waiting on someone outside
- Portfolio session (`sabajanelidze-81`): a NOTICE with the design-tokens path, once they exist.

## Log (newest first)
- **2026-10-14:** Saba gave the scoped commit/push OK. Moved employer details, strategy and personal questions to `private/game-design-notes.md` so every commit is public-safe.
- **2026-10-14:** Design attack: five Fable 5.1 reviewers (designer, CEO, CTO, backend, AI engineer) + Codex. Saba chose all four recommended changes (core "One day on call", payments first, build chain, keep theme). Wrote design v2. Verified race numbers with scripts (build v0.1: 36 of 70 orders lose, 1 of 4 pause points; "check twice" 43%, "lock only the read" 45%, "reserve, then settle" 0%).
- **2026-10-14:** Saba decided: art A, repo private now. Created the private GitHub repo `000Janela000/sabajanelidze-lab` (empty). Sent `STATUS lab-game#1` to the portfolio session.
- **2026-10-14:** Session started from the portfolio session's brief (`../SabaJanelidze/private/strategy/2026-10-14-game-session-brief.md`). Set up `AGENTS.md`, `CLAUDE.md`, `STATUS.md`, `.gitignore`, `private/`, local git (`core.autocrlf=input`, `core.filemode=false`). Wrote the game design document v1.
