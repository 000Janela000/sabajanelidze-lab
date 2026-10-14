# 0001: A calm page, and the game in a dark console

- **Date:** 2026-10-15
- **Decided by:** Saba, after fresh-eyes tests and a review by six reviewers (five AI agents in different roles, plus Codex)

## The problem
1. The first screen of an incident did not say what the page is, who made it, or what to do. Visitors met a made-up ticket, three labels for one thing, a schedule of stations that do not exist yet, and a Start button below the bottom edge of the screen (on phones, far below).
2. The "notebook" look had personality, but it sat in decoration (grid paper, small monospace labels in a margin), and the decoration was part of the confusion.
3. The portfolio's new calm look (shared design tokens, version 2) is clear, but on its own it shows no design or frontend craft.

## The decision
- **The page is calm.** The lab copies the portfolio's design tokens (version 2) as they are: no grid, no glow, no notebook labels, one button style, light and dark themes, the theme switch in the footer ("Theme: Light · Dark · Auto").
- **The game lives in a dark "console"** in both themes: a panel built from the dark theme's own colours, as a lab-only game extension. All personality goes there, in objects that move because of the real code and explain something.
- **The race figure is the first thing you see.** Requests A and B move through the same four steps; the books change with them. On arrival it plays one safe run by itself (about 4 seconds, then it stops and asks you to find the run that breaks). A pause control is always there; with reduced motion it shows the final frame and Step buttons.
- **The first screen says who and what:** a one-line frame ("a working demo by Saba Janelidze, Principal Engineer …"), one meta line (incident, topic, time, test mode), the ticket, the action, and "Read the code and tests".
- **The text version stays real HTML**, behind a disclosure that warns it contains the answers.
- **"Book a call" is for both** consulting clients and employers.
- Kept from the notebook: the MONEY LOST stamp and the dashed "paused here" mark.

## Signature moments (in this order)
1. The race lanes (tap where A gets slow; watch B run past it).
2. The books as a real ledger: numbers change in place, the shortfall turns red, the stamp lands.
3. The result travels up into a progress line as the next step rises: no hard cuts between steps.
4. Every way to run, as small race strips that fill in about 1.5 seconds.
5. A wrong patch is attacked with the exact order that breaks it, shown in its code.

## Why not the others
- **Calm page only:** clear, but nothing on it shows craft.
- **The notebook:** its personality was in the frame, not in the game, and the frame confused visitors.
- **A separate dark "ops room" look for the whole lab:** the most character, but two brands next to the portfolio.
