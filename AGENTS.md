# sabajanelidze-lab — Agent Instructions

Saba Janelidze's demo lab: a browser game, **"Run a crypto exchange for one day"**, and later more working demos. Each part of the game is a real, working demo of a skill Saba sells (payments and ledgers, crypto deposits, identity checks, AI agents). It will run on a Cloudflare Worker at `lab.sabajanelidze.com` (not live yet). The portfolio (`../SabaJanelidze`, www.sabajanelidze.com) links to it.

**This file is shared by every AI agent.** Claude Code reads it through `CLAUDE.md`. Codex reads it directly. Keep tool-specific notes out of here.

**Shared rules for all projects:** `../_shared/README.md`. Before social media, Codex, video or browser work, read the matching file in `../_shared/playbooks/`. 🔒 Locks there can't be overridden here.

---

## Start of every session
1. Read `STATUS.md`.
2. Run `git status`. It should be clean, or match what `STATUS.md` says.
3. Read `docs/game-design.md` (the game design document) before any game work.

## End of every session
1. Update `STATUS.md` (log + open problems + next steps).
2. Commit only with Saba's OK (see "Rules").
3. Never push without Saba's OK. Once the Worker exists, a push may deploy the live lab.

## Where things live
| Path | What it is |
|---|---|
| `docs/game-design.md` | The game design document: stations, rules, tech, art, plan |
| `STATUS.md` | Current state and log |
| `private/` | Gitignored notes (this repo is meant to be public) |
| `decisions/` | One file per real decision, once there are some |

The code layout and architecture are planned in `docs/game-design.md` section 10. Nothing is built yet.

## Run, check, deploy
- Not set up yet. This section gets the real commands when the first code lands.
- **Deploy:** not set up. Creating the Worker, the `lab.sabajanelidze.com` subdomain or the GitHub repo needs Saba's OK.

## Rules

### Ownership
- This repo, its Worker and `lab.sabajanelidze.com` belong to the lab session.
- **Do not touch** the portfolio repo `../SabaJanelidze` (its own session owns it), his employer's folders (listed in `private/game-design-notes.md`), or Saba's other projects. Reading the portfolio's files for orientation is fine.
- The portfolio session owns the design tokens (colours, fonts, timings). The lab follows them once they exist.

### Honesty (the game must be the proof)
- **Real code, not a cartoon of code.** Every defence the game shows runs from the same TypeScript module that the "How it works" panel links to, and that module has its own tests.
- **Label every event as real or simulated.** Example: "real, on the Sepolia test network" with an explorer link, or "simulated".
- **Show only skills Saba really has.** If a station needs a skill he does not have (for example writing smart contracts), ask him first.
- **Never reuse an employer's code, prompts, documents, vendor names or numbers.** Write new code for the lab. Describe it as "patterns I use in production", never as an employer's code.
- **Everything committed becomes public at launch, with its full history** (the repo is private until then and is never squashed). Keep employer details, strategy and personal notes in `private/`.

### Safety
- **Test networks and fake data only.** No real money, no real cards, **no card fields on our pages, ever** (Cloudflare free-plan rule).
- A **"TEST MODE, no real money"** label on every screen.
- **No real ID documents or selfies.** Identity checks use fake sample documents made for the lab. No uploads at all.
- **Secrets only as Worker secrets** (`wrangler secret put`), never in a file. Saba creates every account and every API key.
- **AI calls** go through Cloudflare AI Gateway with a spending cap, behind a bot check (Turnstile) and rate limits. Every AI panel says plainly that the visitor is talking to an AI (EU AI Act Article 50).
- **Deploy safety** (`../_shared/standards/repo-conventions.md`): never run `wrangler` from the repo root without `--config`, always dry-run first, and upload only public folders.

### Motion and accessibility
- Every animation explains something (state, cause and effect, order, direction or data). If removing it loses nothing, remove it.
- Animate only `transform` and `opacity`. Timings 100–300 ms, except visitor-paced steps.
- **Reduced motion is designed:** the same game, final states, Step buttons, short fades only.
- Nothing moves by itself for more than 5 s without a pause control.
- Every station also has a **text version** (real HTML) for screen readers, search engines and AI crawlers.
- The game's JavaScript loads **only on the game's own pages**.
- **Georgian text:** never split into letters, no `text-transform: uppercase`, no letter-spacing. Georgian copy only through `../_shared/playbooks/georgian.md`.

### Public text
- Nothing public (game texts, images, posts) without the 3 checks in `../_shared/playbooks/publish-gate.md`.

### Code
- **Statuses, results and error codes are UPPER_CASE constants, never plain-text sentences** (Saba, 2026-10-15). Example: `reason: REFUSAL.INSUFFICIENT_FUNDS`, not `reason: 'not enough money'`. Code compares codes; the words people read live only in the site's texts files, so they can be changed or translated without touching logic.
- **Name what a call gives back before you use it** (Saba, 2026-10-15). In the logic code (`packages/core`, `go/`): (1) a call whose result an `if`, `while` or `? :` tests gets its own named line first: not `if (!isValidAmount(amount))` but `const amountIsValid = isValidAmount(amount)`, then `if (!amountIsValid)`. (2) A call that does work (awaited, a store, the bank, the scheduler) never sits inside a condition, another call or a `return` next to other values: not `if (!(await race.step('A'))) break` but `const stepped = await race.step('A')`, then `if (!stepped) break`; in Go, not `return Result{…}, store.Settle(ctx, id)` but `err = store.Settle(ctx, id)`, then `return Result{…}, err`. Go's `if err := f(); err != nil` already names the result and stays. Screen code (`apps/lab`, `packages/race-figure`) may keep short checks like `if (!button)`, but never an `await` inside a condition or a call. Why: one step per line reads more easily, and in this code every `await` is a moment when another request can run. There is no speed or memory cost: the engine keeps the value either way.

### Git
- **No commit and no push without Saba's OK.**
- **Commits:** one line, `type(scope): summary` (types: `feature`, `bugfix`, `refactor`, `docs`, `chore`). No body, no trailers (`../_shared/standards/repo-conventions.md`).
- Never commit `.env*`, keys or `private/`.

### Writing
- **Plain, simple words** in all docs, code comments and notes. Short sentences. Explain every technical word the first time.

## Overrides of the shared rules
None.
