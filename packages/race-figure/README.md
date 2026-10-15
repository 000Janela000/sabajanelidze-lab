# `<race-figure>` — the payments race, as one element

Version **1.1.0** (1.1.0: "Exchange short", and the link says "Reproduce it yourself →"). Built from the lab repo (`packages/race-figure`). The lab's home page uses it, and the portfolio's home page embeds the same files.

## What it shows

Two withdrawals of 80 run at the same time on a balance of 100. Both follow the four steps of the real code: **load the customer → read the balance (and check 80 ≤ balance) → save the new balance → pay out**. Each withdrawal has a ring that moves down its column; the values appear as each step runs; the books show the balance and the total paid out. In the losing run both requests read 100, both pass the check, and the bank pays 160 from a balance of 100.

- **Honest by construction.** Each run is a recorded trace of the game's real code, checked by a test on every build. The 54 runs in `src/runs.generated.ts` come from running the lab's real withdrawal (build v0.1) one step at a time (`scripts/record.ts`). A test fails if the shipped data differs from a fresh recording, or from the core's own count (54 ways to run, 36 lose money, 18 don't). The element ships no money logic: it only replays.
- **Plays once** when at least half of it is on screen (about 4 seconds), then stops on the result, with **Run another order** (one of the 54 recorded runs) and **Reproduce it yourself →** (the lab).
- **Without JavaScript** the end of the losing run is already in the HTML, so the result shows.
- **Reduced motion:** nothing moves; "Run another order" shows another result at once.
- **While it plays** there is a Pause / Play button (WCAG 2.2.2), and it pauses in a hidden tab.
- Motion is transform and opacity only. Labels are real, selectable text. The caption (a polite live region) carries the result for screen readers.

## Files to vendor

All in `packages/race-figure/dist/`:

| File | What | Size (gzip) |
|---|---|---|
| `race-figure.js` | The element: an ES module that defines `<race-figure>`, with the 54 recorded runs | 8.5 KB (2.8 KB) |
| `race-figure.css` | Its styles, only through `--rf-*` variables | 5.5 KB (1.7 KB) |
| `race-figure.html` | The end state to write into the page (the no-JavaScript fallback) | 2.5 KB (0.7 KB) |

## Embed

```html
<link rel="stylesheet" href="/vendor/race-figure.css" />

<!-- Paste the contents of race-figure.html here. Change lab-url (and the link's href) if you want a tagged link. -->
<race-figure lab-url="https://lab.sabajanelidze.com/day/payments">…</race-figure>

<!-- Load on idle; the element upgrades the HTML above. -->
<script type="module">
  const load = () => import('/vendor/race-figure.js')
  'requestIdleCallback' in window ? requestIdleCallback(load) : setTimeout(load, 1)
</script>
```

If the element starts with no HTML inside, it writes the end state itself.

## Styling

It reads the design tokens of the page around it, so it follows light and dark. Each one can be set on `race-figure`:

| Variable | Default |
|---|---|
| `--rf-fg`, `--rf-muted` | `var(--fg)`, `var(--muted)` |
| `--rf-line`, `--rf-hair` | `var(--line-strong)`, `var(--line)` |
| `--rf-bg` | `var(--surface)` |
| `--rf-accent` (withdrawal A, links), `--rf-danger` (the loss) | `var(--accent)`, `var(--danger)` |
| `--rf-focus` | `var(--focus)` |
| `--rf-font`, `--rf-mono` (money figures) | `var(--font-body)`, `var(--font-code)` |
| `--rf-radius` | `var(--radius-card)` |
| `--rf-row` (height of one step) | `2.6rem` (`2.3rem` under 30 rem wide) |

Size, as measured in the portfolio's hero (2026-10-15): 413 × 438 px on desktop, 335 × 419 px on a 390 px phone. At most 28 rem (448 px) wide; full width on phones.

## Develop

```sh
pnpm --filter @lab/race-figure run generate   # record the 54 runs from the real code
pnpm --filter @lab/race-figure run build      # dist/ and the sizes
pnpm --filter @lab/race-figure run test       # the records equal a fresh run and the core's count
```

CI rebuilds and fails if `src/runs.generated.ts` or `dist/` differ from what is committed.
