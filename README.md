# On call: one day at a tiny crypto exchange

A browser puzzle on real code, by Saba Janelidze. **Play it: https://lab.sabajanelidze.com**

You are on call at a made-up crypto exchange. Each incident is a 2-minute puzzle: reproduce the loss, count how often it happens, then pick the fix that holds in every order. TEST MODE, no real money, no sign-up.

**Incident 1, Payments:** two withdrawals of 80 from a balance of 100, and the bank paid out 160.

## What is real

- The code is real and runs in your browser; the customer and the bank are simulated.
- Every step of the game runs the TypeScript in `packages/core`, which has its own tests.
- The same fix is also written in Go, in `go/payments`.
- On every push, CI sends 20 withdrawals at once to a real Postgres database: build v0.1 pays out more than once, build v1 exactly once.
- Codex, OpenAI's AI for code, reviewed this incident twice as a second opinion. Both reviews are published word for word in `docs/reviews/`.

## Run the tests yourself

Needs Node 24 with pnpm, and Go 1.25 for the last line.

```sh
pnpm install
pnpm --filter @lab/core test
cd go && go test -race ./...
```

The real-database tests also run when `DATABASE_URL` points at a Postgres server.

## What is where

| Folder | What it is |
|---|---|
| `packages/core` | The money logic and its tests (TypeScript) |
| `go/` | The same logic in Go |
| `packages/race-figure` | The race figure, shared with sabajanelidze.com |
| `apps/lab` | The site (Astro and Preact), served by a Cloudflare Worker |
| `tests/e2e` | Browser tests (Playwright) |
| `docs/` | The game design and the published reviews |

Licence: MIT for the code (`LICENSE`). The fonts (Newsreader, Inter) keep their own SIL Open Font Licence.

Made by Saba Janelidze, principal engineer. I build payment and ledger systems for fintech and crypto teams. Hiring, or need help with payments? [Book a call](https://www.sabajanelidze.com/book?from=lab-github)
