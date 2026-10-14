# "On call: one day at a tiny crypto exchange" — game design document

> **Version 2, 2026-10-14.** Written by the lab session. Nothing is built yet. Nothing here is public yet.
> **v2 replaces v1** after six independent reviews (a game designer, a CEO, a CTO buyer, a backend developer and an AI engineer, all Claude Fable 5.1, plus Codex). The private summary of their attacks: `private/reviews/2026-10-14-design-attack.md`.
> **Saba's decisions (2026-10-14):**
> 1. Core: **"One day on call"**: each station is an incident: reproduce it, fix it, clean it up.
> 2. Launch: **payments first** (with the portfolio), then KYC, then deposits, one at a time.
> 3. **Every proof card shows its own build chain** (how agents built that code under automatic checks).
> 4. **Keep the crypto-exchange theme**; proof cards describe work patterns only, never an employer's systems.
> 5. Art direction **A, "exchange back office"**. Repo **private now, public at launch** (created: `000Janela000/sabajanelidze-lab`).
>
> Still open: section 14. Sources: the brief, the portfolio's private research (keys: **[CR]** creative features and games · **[TS]** tech stack · **[MO]** motion · **[AIN]** recent AI), the six reviews **[RV]**, and fresh web checks linked inline. Private notes that stay out of git: `private/game-design-notes.md`.

---

## 1. The game in 12 lines

1. **You are the on-call engineer at Tiny Exchange, a small test-mode crypto exchange, for one working day.** Incidents arrive one by one: money paid out twice, a customer locked out, coins credited that never arrived.
2. **Every incident has three steps:** **reproduce** it (find how the money got lost), **fix** it (pick the patch that survives every attack), and **clean up** (handle what is still unknown, like a bank that didn't answer).
3. **It is not a coding game.** You never type code. You read 4–5 short lines, each with a plain label ("read the balance"), and you make choices (section 2).
4. **Every choice runs real code.** The code you play against is the same file the proof card links to, and that file has its own tests.
5. **Wrong fixes fail in front of you.** The machine attacks your chosen patch with every possible order of events. Two plausible patches fail on screen; the one that holds is Saba's real code.
6. **The clean-up step is the senior part:** unknown outcomes, reconciliation (comparing our books with the bank's or the chain's own record), and a short incident report.
7. **Each proof card also proves the AI pitch:** "written by an agent, 9 checks run, 2 refusals, approved by Saba, reviewed by Codex", each linked to the real record.
8. **A 2-minute cut per incident** (reproduce + fix + proof card) for busy CTOs; the rest is behind "Go deeper". Each incident has its own link and ends with "Book a call".
9. **Real where it can be, and labelled.** Test-network deposits on Sepolia are real; things a public network can't do on demand run in a simulator, using the same code, labelled "simulated". Fake data only. No card fields. "TEST MODE, no real money" on every screen.
10. **2D, plain HTML, SVG and CSS with small Preact islands.** No game engine and no 3D (section 2.3).
11. **Launch:** the payments incident ships with the portfolio. KYC, then deposits, then AI follow, one at a time.
12. **Running cost at launch: $0.** The AI incident later costs a few dollars a month under a hard cap Saba sets.

---

## 2. What kind of game it is

### 2.1 In one sentence
A **puzzle and decision game in a back-office screen**: like a detective puzzle crossed with *Papers, Please* (the game where you check passports at a border desk), where the evidence is a few lines of real code and the money they move.

### 2.2 What you actually do with your hands
- **You read, you don't write.** Each code snippet is 4–5 lines. Every line has a plain label next to it: "read the balance", "check it's at least 80", "pay out", "save the new balance". A recruiter can follow the labels; a CTO reads the code.
- **You make choices:**
  - *Where does the network get slow?* (tap a line to pause one request there)
  - *Which fix?* (pick one of three patches)
  - *The bank didn't answer. What now?* (retry, check the status, or reconcile with the statement)
  - *Approve, reject or ask for more?* (on a fake passport)
  - *How many confirmations before the money is usable?* (move a slider)
- **The machine does the heavy work:** it runs every possible order of events against your choice and shows the result as a grid of green (safe) and red (money lost) squares.

### 2.3 Why 2D, not 3D
1. **The content is text:** code lines, passports, ledgers, event logs. Text reads best flat.
2. **The look is proof.** It looks like a real exchange back office, the kind of admin panel Saba builds at work.
3. **Phones:** 3D and game engines cost 68–362 KB of JavaScript before any game code (section 10.2), and 3D scenes are slow on mid-range phones [CR]. This game's target is under 60 KB per page.
4. **Trust:** in a Stanford study, finance experts commented on design far less than ordinary users (16.4% vs 54.6%) and used design mainly to spot "flashy" sites they distrust [CR §1.1].
5. **Screen readers and Google can't read a 3D scene.** 3D would mean building the game twice.
6. **3D proves 3D skills,** which Saba doesn't sell.

---

## 3. Words used in this document

- **Incident:** something went wrong with money or a customer; the on-call engineer must find out why and fix it.
- **Reproduce:** make the bug happen again on purpose, to understand it. Engineers always reproduce a bug before fixing it.
- **Patch:** a small code change that fixes a bug.
- **Naive code:** simple code that looks fine but breaks under pressure. Shown as "build v0.1".
- **Race condition:** a bug that appears only when two actions run at the same moment in a certain order.
- **Idempotency key:** a unique ID sent with a request, so sending it twice has the same effect as sending it once.
- **Webhook:** a message a provider's server sends to ours, for example "payment succeeded".
- **Signature (HMAC):** a code computed from a message and a shared secret; if ours differs, the message is forged.
- **Reconciliation:** comparing our own books with an outside record (the bank's statement, the blockchain) and listing every difference.
- **Ledger (double-entry):** every money move is written as rows that sum to zero. Example: a deposit of 0.01 adds +0.01 to "coins we hold" and −0.01 to "owed to the customer".
- **Hold (reserve):** money moved from "available" to "on hold" before a payout, so it can't be spent twice; then settled (paid) or released (given back).
- **Test network (testnet):** a copy of a blockchain whose coins have no value. **Sepolia** is Ethereum's main one.
- **Confirmation:** each block added after the block that holds a transaction.
- **Finality ("finalized"):** the point after which Ethereum blocks can't be undone; about 15 minutes.
- **Reorg:** the network replaces its last few blocks; a deposit inside them can vanish.
- **Extended public key (xpub):** lets a server make deposit addresses without being able to spend from them.
- **Nonce:** a counter in every Ethereum transaction from one sender; it must go up by exactly one each time.
- **KYC ("know your customer"):** checking a new customer's identity.
- **MRZ:** the lines of letters and `<` signs at the bottom of a passport or ID card. Their check digits catch typing errors (not forgeries: a forger can recompute them).
- **Audit trail:** a record of who decided what, when and why, that a regulator can read later.
- **Prompt injection:** text that tries to give an AI new orders.
- **Guardrail:** a check outside the AI model that limits what the AI can do.
- **Durable Object:** a small Cloudflare server program with its own private database; only one copy of each runs.
- **Island:** a small interactive part of an otherwise plain HTML page.
- **Build chain:** the record of how a piece of code was made: which agent wrote it, which automatic checks ran, which ones refused it, who approved it.

---

## 4. Who it is for, and the path to "Book a call"

| Visitor | Arrives from | Has | Must leave knowing |
|---|---|---|---|
| **CTO of a fintech, payments or crypto company** (main buyer) | a link Saba sends, the portfolio, LinkedIn | 2 minutes, a critical eye | "He knows how money really gets lost, including the hard cases. His code is checked, and agents build it under rules. I can read it myself." |
| **Recruiter or hiring manager** | the portfolio | 1 minute | The plain labels and the plain summary on each card: "senior engineer, real fintech and AI work". |
| **Developer** | Hacker News, daily.dev, GitHub | 10+ minutes | "Fun, I learned something, the code is open and good." They share it. |

**Most visitors arrive through a direct link to one incident** [RV]. So:
- **Direct landing:** a station link opens straight on the incident ticket, with the goal line, "Read the code" and "Book a call" on the first screen, and the proof card ready (collapsed). No name field, no stars.
- **Every proof card ends with:** "I build this for teams that handle money. **Book a call**." The end-of-shift screen has the same.
- **Tagged links:** every link to the portfolio and to the booking page carries `?from=lab-<station>`, so a booked call from the game can be counted without cookies.
- **Sharing:** "Copy result" (a text grid, no personal data, like Wordle's), a share image per station for LinkedIn and email, and "Send this to your CTO" (copies the link).
- **Success numbers and a stop rule:** set by Saba (private notes). Counts are private analytics, never shown as public claims.

---

## 5. Design pillars

1. **The game is the proof.** Every win and loss is produced by real code a CTO can read.
2. **Reproduce → fix → clean up.** A real puzzle, a real choice with wrong answers, and a senior step.
3. **Seniority, not textbook.** The defences everyone knows are the start. The unknown outcome, reconciliation and the trade-offs are the point.
4. **Two minutes, no sign-up, a direct link per incident.**
5. **Plays everywhere:** phone and desktop, touch and keyboard, reduced motion, screen readers. Turn-based, never a reaction test.
6. **Honest by construction:** real or simulated on every event; the build chain on every card; no employer code, names or numbers.

---

## 6. How the shift works

### 6.1 The incident loop (the same in every station)

```
INCIDENT #1 · 13:04 · Customer #42
"I had 100. The bank paid me 160. My balance shows 20."
─────────────────────────────────────────────────────────
1 REPRODUCE  Make it happen again.
             Tap the line where request A gets slow.
             Guess first: how many of the 70 orders lose money?
2 FIX        Pick a patch:  ( ) check the balance twice
                            ( ) lock only the read
                            ( ) reserve, then settle
             → the machine attacks YOUR patch with every order
3 CLEAN UP   A retry timed out at the bank. Did it pay?
             [ Retry ]  [ Check the status ]  [ Reconcile with the statement ]
─────────────────────────────────────────────────────────
Proof: core code · its test · built by an agent, 9 checks, 2 refusals
[ Read the code ]                         [ Book a call ]
```

1. **Ticket** (under 10 seconds to read): the customer's complaint, in one or two sentences, with the numbers.
2. **Reproduce:** the visitor finds how the loss happens. The control is chosen so that **most choices do not lose money**, so the visitor has to think (example in 7.1: only 1 of 4 pause points loses).
   - **Guess, then reveal:** before the machine runs every possible order, the visitor guesses how many lose. Then the grid fills.
3. **Fix:** three plausible patches. The machine attacks the chosen patch with every order. Wrong patches fail on screen with the order that breaks them. The patch that holds is Saba's code. Where two patches are both safe, the card explains why Saba picks one (the trade-off).
4. **Clean up:** something the fix alone doesn't solve: an unknown outcome, money already lost, a regulator's question. The visitor picks what a senior engineer does. A wrong choice shows its cost.
5. **Incident report:** three lines, filled in from the visitor's own actions: what happened, the fix, what would have caught it sooner.
6. **Proof card** (section 6.4).

**The 2-minute cut:** ticket → reproduce → fix → proof card. Clean-up and the extra levels sit behind **"Go deeper"**. A direct link always lands on the cut.

### 6.2 The shift

- A **progress strip** at the top, not a full map: `09:30 Payments · 11:00 KYC · 13:00 Deposits · 15:00 AI · 17:30 End of shift`. Stations not built yet show "coming soon".
- Incidents can be played alone and in any order: `/day/payments`, `/day/kyc`, `/day/deposits`, `/day/ai`, `/day/books`.
- **One role all day:** the on-call engineer. No founder, no compliance officer, no scheduler. (Reproducing a bug on purpose is what on-call engineers do, so "attacking" fits the role.)
- No name field. No stars. One number per incident: **"money lost" before the fix, "money lost" after**.

### 6.3 End of shift

- Your incident reports for the day, one under the other: this is the "day report".
- The ledger checks (every transaction sums to zero; customer balances match their rows) and a small **solvency check** ("coins we hold ≥ coins we owe", with one line on what a real proof of reserves adds).
- If you played naive code and left money lost, the reconciliation shows the gap and you trace it to its incident.

### 6.4 The proof card

Each incident's card shows, in this order:
1. **What happened and the fix**, in two plain sentences.
2. **The core code:** a short excerpt (cut from the real file at build time) and a link to the core file, under about 150 lines, never the UI code.
3. **The tests:** the naive and the defended test side by side; a badge "this test fails when the defence is switched off" (section 10.7).
4. **The trade-off:** one or two lines, for example "why a reserve and not a row lock".
5. **What a real system adds:** for example the Postgres statement and the database concurrency test (section 10.7).
6. **The build chain:** "written by an agent in commit `abc123`, 9 checks run, 2 refusals (links), approved by Saba, reviewed by Codex (link)" (section 10.8).
7. **"I build this for teams that handle money. Book a call."**

---

## 7. The incidents

### 7.1 Incident 1 — Payments: "The bank paid me 160 from 100" (launch)

**Ticket:** "I had 100. I tapped Withdraw 80 twice by accident. The bank paid me 160 and my balance shows 20."

**Build v0.1 (the naive code), shown with plain labels:**
```
1  load the customer
2  b = balance; if b < 80 → refuse      "read the balance and check it"
3  balance = b − 80                      "save the new balance"
4  bank.pay(80)                          "pay out"
```

**Step 1 — Reproduce.** Two copies of this request run at once (A and B). The visitor taps **the line after which request A gets slow** (a network lag); B then runs to the end, then A finishes.
- Only **one** of the 4 pause points loses money: after line 2. A has read 100; B reads 100 too, saves 20 and pays 80; A saves 20 and pays 80. Paid out 160, balance 20.
- Pausing after line 1, 3 or 4 is safe. So random tapping usually fails, and the visitor has to think about *where* the gap is.
- **Guess, then reveal:** "How many of the 70 possible orders of these 8 steps lose money?" Then the machine runs them all: **36 of 70 lose** (computed with a script for this document; the game computes it live).

**Step 2 — Fix.** Three patches:

| Patch | What it does | Result (all orders) |
|---|---|---|
| "Check the balance twice" | read and check again just before saving | still loses in **120 of 252** orders (48%): the gap moves, it doesn't close |
| "Lock only the read" | a lock around reading the balance | still loses in **100 of 224** possible orders (45%): the lock is released before the save |
| **"Reserve, then settle"** (Saba's) | one atomic step: "move 80 from available to on hold, only if 80 is available"; then pay; then settle (or release the hold if the bank refuses) | **0%** |

(Numbers from the real code, checked by `packages/core/test/race.test.ts`; the game computes them live.) **The trade-off line:** a lock around both the read and the save is also safe (0 of 74 possible orders lose). The reserve still wins: it is one statement, so there is no lock to forget to release on an early return, and money in flight gets its own state ("on hold"), so a timeout or a refused payout can be settled or released later from the books. In Postgres it is `UPDATE balances SET available = available - 80, held = held + 80 WHERE id = $1 AND available >= 80`, plus a `CHECK (available >= 0)` as a backstop.

**Step 3 — Clean up (Go deeper).** "Your fix is live. Now the bank times out on a payout. Did it pay or not?"
- **Retry at once** → if the first call did pay, the customer is paid twice. ✗
- **Check the status** (with the same idempotency key passed to the bank) → the bank says "already paid"; the hold is settled. ✓
- **Reconcile with the bank's statement** at the end of the day → the job lists any payout without a matching ledger row. ✓ (the slower, safety-net path)
- The state machine on the card shows the `unknown` state and how a payout leaves it.

**More levels (Go deeper):**
- **The retry:** the phone drops the connection and sends the same withdrawal again. Naive: two payouts. Fixed: the idempotency key. The card covers the hard cases: a duplicate that arrives while the first is still running (answer "in progress"), the same key with a different amount (refused), keys scoped per customer, keys expire after 24 hours.
- **The webhooks:** "payment succeeded" arrives twice, late, out of order, or forged. Fixed: the signature check with a time window; each event stored once by its ID; events applied **in version order**, and an event that arrives too early is **parked** until the gap closes (never thrown away).
- **Now try it for real** (after launch): a private sandbox on the server with "defences off" and "defences on" switches, real HTTP requests and "copy as curl". The fake bank is a separate route reached by a real network call, so the race really happens on the server when the defences are off (section 10.4).

**What it proves:** payments and ledgers, judged at senior level: holds, idempotency, webhooks, unknown outcomes, reconciliation.
**Effort:** the 2-minute cut plus clean-up and the two extra levels: M (about 3–4 agent days) on top of the foundation. Live sandbox later: M (about 3 days).

### 7.2 Incident 2 — KYC: "An approved customer was locked out overnight"

**Ticket:** "Anna was approved yesterday. This morning she can't trade: her status says 'pending' again."

**Step 1 — Reproduce.** The (fake) identity provider sends its results as messages. The visitor controls them: **send twice, send late, send out of order, forge one**. Build v0.1 applies "the last message received wins". The visitor must find the sequence that locks Anna out: a stale "pending" that arrives after "approved". (A forged "approved" letting a rejected applicant in is a second case.)

**Step 2 — Fix.** Three patches:
- "Ignore messages with an older timestamp" → fails: the provider's clock and ours differ, and two events can share a second.
- "Refuse any move that isn't allowed" → fails differently: a genuine update that arrives early is thrown away (and approved cases *must* be able to go back to review, for example when a document expires).
- **"Store each event once, apply in version order, park early ones, verify the signature first"** (Saba's pattern) → holds.

**Step 3 — Clean up (Go deeper).** "The regulator asks: why did you approve applicant 3?" The visitor opens the **audit trail**: every decision with who, when, why, the evidence and the provider events it was based on. Then a **four-eyes** case: a real match on the made-up sanctions list needs a second officer; one click can't approve it alone.

**Extra level (Go deeper): the morning queue.** Five applicants with fake ID cards from **Utopia** (code UTO, the made-up country used in the passport standard's own examples, ICAO Doc 9303), drawn as SVG with abstract avatars. Checks shown next to each: **field validation** (MRZ check digits catch typing errors), form vs document, age, expiry, and screening with fuzzy name matching against a short invented list (example: "Aleksandre Utopov" vs "Alexander Utopov"; every listed name is invented). Traps: an expired card, a typo in the MRZ, a near-match who is **not** the same person (rejecting them is a mistake too), one real match.
- On phones the card uses the **ID-card format (3 lines of 30 characters)**, with the failing digit highlighted and the arithmetic shown below.

**What it proves:** identity checks the way a compliance team needs them: safe handling of provider messages, re-checks, audit trail, four eyes. This is the area Saba knows best.
**Plain view for the offer site:** deferred until the offer site has a real inquiry [RV, CEO]; Saba can bring it forward.
**Effort:** M (about 3–4 agent days).

### 7.3 Incident 3 — Deposits: "We paid out 1.0 that never arrived"

**Ticket:** "A customer deposited 1.0 test ETH and withdrew it a minute later. Now the deposit is gone from the chain, and we are 1.0 short."

**The real part, running quietly from the start.** When the page opens, the visitor gets a real Sepolia deposit address (made from the lab's extended public key; the server can't spend from it), and the next shared faucet transaction is on its way (section 10.5). While the visitor works on the incident, the side panel shows the real transaction: sent → in block N → 1, 2, 3 confirmations, each with a "View on Etherscan" link and a `REAL · Sepolia` chip. By the time the puzzle is done, it is credited. **No waiting screen.**

**Step 1 — Reproduce (simulated chain, labelled SIMULATED, same watcher code).** Build v0.1 credits a deposit the moment it sees it and lets the customer withdraw at once. Controls: **customer deposits 1.0**, **customer withdraws now**, **reorg: drop the last N blocks**, **restart the watcher**. The visitor finds the losing sequence (deposit → withdraw → reorg), or the double credit (restart → the same deposit seen again).

**Step 2 — Fix: choose a crediting policy.**
- "Credit and make available after 1 confirmation" → the machine runs random reorgs of depth 1–3: loses sometimes.
- "Available after 3 confirmations" → loses on a deeper reorg.
- **"Pending at 3 confirmations, available at finality; larger amounts wait longer"** (Saba's policy, shown as a small config object) → holds. The trade-off line: customers wait about 15 minutes for available funds; that is the price of not paying out money that can still vanish.
- Plus the fixes that every policy needs: credit each deposit once, keyed by its transaction and its kind (a plain ETH transfer, a token transfer, or a transfer made by a contract); detect reorgs by checking each block's parent; withdrawals use only "available".

**Step 3 — Clean up (Go deeper).** The 1.0 is already gone. The visitor freezes the customer's withdrawals, runs the reconciliation (ledger vs chain), and writes the incident report: amount at risk, root cause, the policy change, the test added. Also: a deposit of an unsupported token arrives at an address → it goes to a "needs review" queue, not lost.

**What it proves:** the exchange side of crypto deposits: confirmation and finality policy, credit-once, reorg handling, reconciliation. **Proof-card wording (true either way):** "At work I build the exchange side: balances, crediting, safe handling of repeated events, and withdrawals with retries. The chain watcher in this station was written for the lab."
**Effort:** simulated part M (about 2–3 agent days); the real Sepolia part M (about 2–3 agent days) plus Saba's set-up (section 14).

### 7.4 Incident 4 — AI: "The support bot told a customer to send coins to a stranger" (after launch)

**Before the first message, every AI panel says:** "You are talking to an AI. It sees only this game's fake data." (EU AI Act Article 50.)

**Ticket:** "A customer says our support assistant told her to send 0.1 ETH to an address 'to release her deposit'."

**Step 1 — Reproduce.** Build v0.1 is a support pipeline whose **code** obeys whatever structured answer the model returns (`{"action": "refund", "amount": 500}`), and puts customer text into the prompt unmarked. The visitor's attack is a customer message or a document note with hidden orders. Because a 2026 model often refuses such tricks by itself, the dramatic version is **recorded real runs** where the model *was* fooled under the naive set-up, each labelled "recorded on <date>, model <name>". The visitor sees that the failure is the code's, not only the model's.

**Step 2 — Fix.** Patches:
- "A stronger system prompt" → fails: recorded runs still get through.
- "Block the word 'send'" → fails: trivially reworded.
- **"Plan-then-execute"** (a published agent-security pattern: the model only classifies the ticket and extracts fields; code decides every action) **plus** tools scoped to the ticket's own customer, an **output gate** (no address, link or amount in a draft unless it came from our own data), and a human approval screen that highlights anything unusual → holds.

**Step 3 — Clean up (Go deeper).** The eval: a fixed set of attacks run against the defended pipeline, repeated several times, published with two numbers: **attack success rate** and **usefulness** (did it still answer the normal tickets correctly?), with the model and the date. Live free-text tries run only against the defended pipeline, with a visible daily counter.

**Dropped from v1:** the "AI fraud watcher" (rules deciding, AI only narrating, mislabelled as an AI watcher) [RV, AI engineer]. A rule-based risk queue with AI-written notes may come later under its true name.
**Effort:** L (about 5–7 agent days). Needs an API key with its own cap (section 14).

### 7.5 End of shift (small at launch, full later)

Launch: the incident report for each incident played. Full version: section 6.3.
**Effort:** S (about 1 agent day) small; S–M (about 2 days) full.

---

## 8. What each incident proves (Saba's real skills)

Work claims stay generic: "patterns I use in production", never an employer's names, systems, vendors, partners, colleagues or numbers. The lab's about panel says "built at home, no employer code". The mapping to Saba's own work history is kept in the private notes.

| Incident | Skill | Shown by |
|---|---|---|
| 1. Payments | **Payments and ledgers** | holds, idempotency, webhooks in version order, unknown outcomes, reconciliation, trade-offs |
| 2. KYC | **Identity checks** | provider messages handled safely, re-checks, audit trail, four eyes, field validation |
| 3. Deposits | **Crypto deposits, exchange side** | finality policy, credit-once, reorgs, reconciliation, watch-only addresses |
| 4. AI | **AI agents in a product** | plan-then-execute, scoped tools, output gate, a published eval |
| **Every card** | **AI-native engineering** (the lead pitch) | the build chain: agent-written, checked, refused, approved, reviewed |

**Not shown, on purpose:** smart contracts, trading engines and order matching (not Saba's areas), and anything about how any employer's systems work inside.

---

## 9. Honesty rules

1. **Real code only.** What the visitor plays against is the code the card shows; excerpts are cut from the real files at build time.
2. **Every defence has a test that proves itself:** each defence is a named switch in the core; CI runs its test with the switch off and expects a failure.
3. **Real vs simulated on every event:** `REAL · Sepolia` (with an Etherscan link) or `SIMULATED`. Recorded AI runs say when and with which model.
4. **The browser model is called a model.** The race grid in the browser is a teaching model; the card links to the real database concurrency test.
5. **The build chain is generated, never typed:** from git history, the CI's own records and the hooks' own log (section 10.8).
6. **Counters only from the server's own work** (faucet sends, sandbox requests), never from numbers the browser reports.
7. **No overclaims:** "solvency check", not "proof of reserves"; MRZ digits are "field validation", not forgery detection; AI "watcher" names describe what really decides.
8. **New code, written for the lab.** Never employer code, prompts, documents, vendor names or numbers.
9. **Only skills Saba has.** If a station needs one he doesn't have, it is cut or he decides first.
10. **AI is named as AI** before the first message.
11. **Never pretends to be a real exchange:** no real company names, logos, card brands or partner logos.

---

## 10. Tech

### 10.1 What the game needs from its rendering
Mostly **text and interface**: code lines, documents, ledgers, event logs, grids, buttons. Few, small animations. Loads only on its own pages; mid-range phones; reduced motion; a full text version.

### 10.2 Comparison (versions and sizes measured 2026-10-14)
Sizes: a small real use of each library, bundled with esbuild (minified, production), then gzipped. Versions from the npm registry.

| Option | Version | Size (gzip) | Draws with | Accessibility | Fit |
|---|---|---|---|---|---|
| **Plain DOM + SVG + CSS** | — | **0 KB** | the browser | full: real text, focus, ARIA, CSS reduced motion | ✅ best fit |
| + Motion `motion/mini` (only if needed) | 14.2.0 | 3.3 KB | Web Animations API | same as DOM | ✅ optional |
| **+ Preact 10 + signals** | 10.29.8 + 2.11.3 | **about 8 KB** | DOM | same as DOM | ✅ **chosen** |
| + React 19 | 19.3.1 | 67.6 KB | DOM | same as DOM | ⚠️ 8× Preact for the same code style |
| + Svelte 5 / SolidJS | 5.57.2 / 1.9.17 | 16.5 / 4.8 KB | DOM | same as DOM | ✅ possible, different style from Saba's React work |
| Kaplay | 3001.0.19 | 68.0 KB | WebGL canvas | none built in | ❌ canvas text; needs a second, text version |
| PixiJS | 8.22.0 | 177.6 KB | WebGL / WebGPU | a plugin, off by default | ❌ big; tables still need DOM |
| Phaser | 4.2.1 | 362.1 KB | WebGL canvas | none built in | ❌ an action-game engine |

Notes: none of the canvas engines handle `prefers-reduced-motion` themselves. **Preact 11** (2026-09-30) is not yet accepted by `@astrojs/preact` 6.0.6, so we pin **Preact 10**. Preact code reads like ordinary React.

### 10.3 Decision
**Plain HTML + SVG + CSS inside Astro pages, with small Preact islands (`client:visible`).** No game engine. Target: under 60 KB gzip of JavaScript per station page. Animations with CSS and the Web Animations API; `motion/mini` only if needed. Same stack family as the portfolio (Astro 7 on Cloudflare Workers) [TS][MO].

### 10.4 How the parts fit together

```
lab.sabajanelidze.com  (one Cloudflare Worker; static pages are free and unlimited)
│
├── Static pages (Astro)
│     /                 the shift (progress strip + incident list)
│     /day/<incident>   each incident: full text article + the game island
│
├── /api/*  (only for the live parts)
│     session    Turnstile once → short-lived signed session token (in memory, no cookies)
│     deposits   the visitor's deposit address, deposit status
│     sandbox    the live payments sandbox (later)
│     bank       the fake bank, reached by a real fetch() (so live races are real)
│     ai         the AI incident (later), through Cloudflare AI Gateway
│
├── Durable Object "Session"  (one per visitor): ledger + events in its own SQLite,
│       pushes events over a WebSocket that can sleep, deletes itself after ~60 min
├── Durable Object "Watcher"  (one): polls Sepolia by alarm, only while someone watches;
│       keeps a cursor and the address→owner map beyond sessions; rescans an overlap after downtime
├── Durable Object "Faucet"   (one): owns the faucet key (a Worker secret), the nonce, a gas cap,
│       the daily count; sends one small real transaction per minute to whoever is waiting
├── D1: shared counters (server events only), hashed-IP daily limits
└── Cron (nightly): resets shared tables
```

**One core, used everywhere.** All money logic lives in one plain TypeScript package: the ledger with holds, the payout and webhook state machines, the KYC case machine, field validation and name matching, the deposit watcher and crediting policy. It talks to the world only through **ports**: `store`, `bank`, `chain`, `clock`, `random`. Each await point is one visible line of the game.
- **In the browser,** the game's scheduler resolves each await when the visitor taps, so the visitor really controls the order.
- **On the server,** real storage and a real `fetch()` resolve them. A Durable Object only lets another request in at an await on outside I/O; the storage itself is synchronous. That is exactly why the naive code races on the server (the bank call is a real network hop) and why the reserve is safe (one synchronous statement with no await inside) [RV, backend; Cloudflare].
- **In the tests,** fakes resolve them; time and randomness are passed in, so every run can be replayed.
- A test counts the await points per operation, so the browser game and the server never drift apart.

### 10.5 Deposits: network, watcher, faucet

- **Sepolia**, checked 2026-10-14: "the recommended default testnet for application development" ([ethereum.org](https://ethereum.org/developers/docs/networks/)); a block every 12 s; "safe" was about 11 minutes and "finalized" about 17 minutes behind the newest block in a live check. Retirement is planned "eventually" with an overlap, no date ([EtherWorld](https://etherworld.co/2025/09/19/sepolias-sunset-ethereum-plots-testnet-replacement-with-parallel-run/)). The network sits behind the `chain` port.
- **Why not Bitcoin:** testnet4 blocks come about every 10 minutes, mostly empty, with small reorgs from its 20-minute rule ([BIP94](https://bips.dev/94/)); signet is steadier but still about 10 minutes per block. Maybe later as a "slow lane".
- **Real reorgs on Sepolia are rare and shallow** ([Etherscan](https://sepolia.etherscan.io/blocks_forked)), so the reorg puzzle runs on the simulated chain.
- **Reading the chain:** a free **Alchemy** account (30M compute units a month; polling only while someone watches stays far under) ([Alchemy](https://support.alchemy.com/articles/5827006872-what-is-included-in-the-free-tier)); PublicNode (no key; its terms ban "data mining, robots, scraping") only as a fallback ([terms](https://www.publicnode.com/terms)).
- **The Watcher:** alarms, never a resident loop or an outgoing WebSocket (those can't sleep and would use most of the free daily allowance [Cloudflare](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)). It fetches **every** block since the last poll, checks each parent hash, keeps its cursor, and rescans an overlapping window after downtime. Credit-once key: `(txHash, kind, index)` with kind = plain transfer, token log, or contract trace.
- **Addresses without private keys:** Saba makes a seed on his own machine and exports only the extended public key at `m/44'/60'/0'/0` ([BIP44](https://bips.dev/44/)); the lab makes address *n* from it, which BIP32 describes as making fresh addresses "without giving the webserver access to the corresponding private keys" ([BIP32](https://bips.dev/32/)). Index *n* comes from an atomic counter in the Watcher. **Known catch, on the card:** an xpub plus one leaked child private key reveals all keys under it, so the faucet uses a separate key from a separate seed. The card also says where a real exchange's sweep signer lives and why the lab has none.
- **The Faucet:** one Durable Object, so sends are serialised and the nonce is never reused [RV, backend]. **One real transaction per minute**, whatever the traffic, of a tiny fixed amount (about 0.00001 test ETH) to the address of whoever is waiting; everyone waiting in that minute watches the same real transaction. A `maxFeePerGas` cap pauses it during gas spikes. A daily cap. A low-balance alert to Saba. Test coins come from the browser "proof of work" faucet (no mainnet balance needed; 0.05–2.5 test ETH per session) ([pk910](https://sepolia-faucet.pk910.de/)); one session lasts months at this rate.
- **CPU:** Durable Objects get **30 s of CPU per request, also on the free plan** ([Cloudflare DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/), checked 2026-10-14), so key maths ("10+ ms" on first use, [noble-curves](https://github.com/paulmillr/noble-curves)) runs inside the Watcher and the Faucet, not in the plain Worker (10 ms). Libraries: `@scure/bip32` (audited) and `viem` (only the parts needed), server side only.
- **Explorer links:** `sepolia.etherscan.io/tx/<hash>` and `/address/<address>`, each labelled "View on Etherscan", as Etherscan's terms ask ([terms](https://etherscan.io/terms)).

### 10.6 The money model in detail
- **Ledger:** accounts per customer: `available`, `held`; exchange accounts: `bank`, `chain wallet`, `fees`. Every movement is a set of rows summing to zero. A withdrawal: reserve (available → held), pay (bank call), settle (held → paid out) or release (held → available).
- **Payout states:** `reserved → sent → paid | failed | unknown`; `unknown` leaves only through a status check or reconciliation.
- **Idempotency:** the key row is stored as `processing` with a hash of the request body *before* the bank call. Duplicate while processing → "in progress"; same key with a different body → refused; after completion → the stored answer; keys per customer; 24-hour expiry. The same key is passed to the fake bank.
- **Provider events (payments and KYC):** signature checked first, with a time window; each event stored once by its ID; applied in version order; early events parked; allowed transitions include "approved → re-check".
- **Deposits:** pending at 3 confirmations, available at finality; larger amounts can wait longer; withdrawals only from `available`.

### 10.7 Tests and checks (CI gates)
- **Unit tests** (Vitest) for every rule and defence.
- **Property-based tests** (fast-check: the computer invents thousands of cases): the ledger always sums to zero; no balance below zero with defences on; no payout beyond the crediting policy, and a reorg deeper than the policy is reported as an accepted risk, not hidden; each provider event is applied once, in version order.
- **Defence switches:** each defence is a named flag in the core. CI runs each defence's test with its flag off and expects a failure. The same flags drive "build v0.1" in the game and the "defences off" switch in the sandbox. No extra tooling.
- **Every order:** the incident grids (70 orders and so on) also run as tests, with the numbers in this document as expected values.
- **A real database test:** CI starts a Postgres container, implements the `store` port with the reserve statement from 7.1, fires 20 concurrent withdrawals, and checks that nothing goes below zero and nothing is paid twice. This is the test the payments card links to.
- **End-to-end** (Playwright): each incident on phone and desktop, normal and reduced motion, keyboard only. **Accessibility** (axe). **Bot view:** full text without JavaScript. **JavaScript budget** per page and Lighthouse on a mobile profile.
- **Code excerpts** are cut from the real files at build time between markers; the build fails if a marker is missing.

### 10.8 The build chain (how the AI pitch is proved)
- The lab is built **by AI agents under automatic checks, from the first commit**, and the history is kept (private now, public at launch, never squashed).
- **Who wrote it:** the git author of each commit (an agent identity for agent-written code, Saba for his own).
- **Which checks ran and which refused:** the GitHub Actions records for each commit (pass or fail, linked), plus a small log file that the local check hook appends to on every run (date, check, result). Nothing is typed in by hand.
- **Who approved:** Saba's OK on each commit (the repo's rule), recorded in the log.
- **Second opinion:** Codex reviews the money-logic changes; the review is saved with a link.
- **At build time**, the proof card's build-chain line is generated from these records for the files that card links to. No pull requests are needed (the workspace rule is "no pull requests").

---

## 11. Safety rules

**Money and data**
- Test networks and fake data only. No real money, ever. **No card fields on any page, ever.** The bank and the payment provider are fakes inside the lab.
- A fixed **"TEST MODE, no real money"** label on every screen.
- **No real ID documents, no uploads, no camera, no selfies.**
- No emails or messages to addresses typed by visitors. No personal data stored.

**Abuse and cost**
- Static incidents need no protection and cost nothing (static assets are free and unlimited on Workers).
- Live parts: **Turnstile** once per session, then a short-lived signed token in memory (no cookies).
- **Caps that count:** per session and global, counted atomically in a Durable Object or D1. The Workers rate-limit binding is only a loose first filter: it is approximate and per location ([Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)), and many homes can share one IP.
- **Faucet:** one transaction per minute, fixed tiny amount, gas cap, daily cap.
- **Sessions clean themselves** after about 60 minutes; a nightly job resets shared tables.
- **Worst case on the free plan:** live parts pause until 00:00 UTC. No bill. Static incidents keep working.

**AI (later)**
- Through **Cloudflare AI Gateway** with a spending limit, plus a hard daily cap in our own code (the Gateway's limit is eventually consistent).
- **Payload logging off** (`cf-aig-collect-log-payload: false`): AI Gateway stores prompts and responses by default ([Cloudflare](https://developers.cloudflare.com/ai-gateway/observability/logging/), checked 2026-10-14). One privacy line says what is kept.
- Recorded runs are the default; live tries are scarce, with a visible daily counter.
- AI disclosure before the first message (EU AI Act Article 50).

**Secrets and deploys**
- **Saba creates every account and every API key.** Keys only as Worker secrets (`wrangler secret put`), never in a file or in git.
- The faucet key and the deposit seed are made by Saba on his own machine; only the faucet key (as a secret) and the public xpub reach the lab.
- `wrangler` only with `--config`, a dry run first, only public folders uploaded.

**Public text:** every visible text passes the publish gate; Georgian only through the Georgian chain.

---

## 12. Art direction, motion, phones and accessibility

### 12.1 Look: A, "exchange back office" (chosen)
A calm, precise operations console: the incident ticket, code lines with plain labels, a ledger panel, an event log, the result grid. Small flat avatars for customers. Colours, fonts and timings come from the portfolio's design tokens once they exist.

**The minimum "game feel"** (so it doesn't ship as a dashboard) [RV, designer]:
1. a **money counter** that moves on every step;
2. a full-panel **"money lost" moment** with the number and a one-second replay of the order that caused it;
3. the naive code as a named opponent: **"build v0.1"** vs **"build v1 (Saba)"**;
4. the **result grid** filling square by square after "guess, then reveal";
5. a clear **win screen** per incident with "Copy result".
Sound stays off.

### 12.2 Motion (follows the portfolio's rules [MO §7.2])
- Motion only where it explains: the step that lost money, a hold moving from available to on hold, a block dropping in a reorg, the grid filling.
- CSS transitions and the Web Animations API; only `transform` and `opacity`; 100–300 ms for feedback; visitor-paced steps for puzzles.
- **Nothing moves by itself for more than 5 seconds without a pause control.**
- **Reduced motion is designed:** the same game; states change with a short fade; the grid appears at once.

### 12.3 Phones
- One column. The two requests are **stacked**, each showing only its current line, highlighted; the whole snippet is one tap away.
- ID cards use the 3 × 30-character format; the failing check digit is highlighted with the arithmetic below.
- Touch targets at least 44 × 44 px; nothing depends on hover; tested at 360 px wide and on a mid-range phone profile.

### 12.4 Accessibility and the text version
- Every action is a real button; focus moves to what changed.
- The event log is a polite live region; the grid announces **only its summary** ("36 of 70 orders lost money"), not 70 updates.
- Colour is never the only signal: red **and** an icon **and** the word "lost".
- **Text version:** each incident page is a real article in the HTML (ticket, steps, the losing order, the patches and their results, the clean-up choices, code links). One script file per incident feeds both the game and the article.

### 12.5 Languages
English first. Georgian later, per incident, only through the Georgian chain.

---

## 13. Effort, launch plan and running cost

### 13.1 Effort (agent days; S = 1–2, M = 3–5, L = 6–10)

| Part | Effort | Needs from Saba |
|---|---|---|
| **Foundation:** Astro + Preact, the core with ports and defence switches, the incident shell (ticket → reproduce → fix → clean up → proof card), progress strip, text-version pattern, build-time excerpts, CI gates incl. the Postgres test, the build-chain recorder | M (2–3 days) | a scoped OK for commits to the private repo (section 14) |
| **Incident 1, Payments** (cut + clean-up + retry + webhooks) | M (3–4 days) | — |
| **Incident 2, KYC** | M (3–4 days) | — |
| **Incident 3, Deposits**, simulated | M (2–3 days) | — |
| **Live backend + real Sepolia** (Worker, Session/Watcher/Faucet objects, Turnstile, caps) | M (3–4 days) | OK for the Worker and the subdomain; an Alchemy account; test coins; faucet key and xpub |
| **End of shift**, small / full | S / S–M | — |
| **Payments live sandbox** | M (3 days) | — |
| **Incident 4, AI** | L (5–7 days) | an API key with its own cap; an AI Gateway |
| Georgian version | S per incident | Georgian chain + Saba's yes |
| **Concept B "Hack my exchange"** | M–L, later | — |

### 13.2 Launch plan (decided)
1. **With the portfolio:** foundation + **Incident 1, Payments**, static, $0 (about 5–7 agent days). The portfolio's teaser "Can you make this account go negative?" points to `/day/payments`.
2. **Next:** Incident 2, KYC (static, $0).
3. **Then:** Incident 3, Deposits: simulated first, then the live backend and real Sepolia.
4. **Then:** the AI incident, the full end of shift, the live payments sandbox. Each new station waits for the success numbers in section 4.

After each incident: desktop and phone screenshots, a reduced-motion check, a 10–20 s screen recording for Saba to judge the feel [MO §7.5], and a `STATUS` message to the portfolio session.

### 13.3 Running cost

| Item | Cost |
|---|---|
| Static incidents, Workers free plan, Durable Objects (free, SQLite) | $0 |
| GitHub Actions on the private repo | $0 within the free monthly minutes |
| Sepolia data (Alchemy free) and test coins | $0 |
| AI incident (later) | a few dollars a month under a hard cap Saba chooses |
| Worst case if bots flood it | the live parts pause until 00:00 UTC; no bill |

---

## 14. Decisions

**Made (2026-10-14):** launch payments first; art A; repo private now, public at launch; core "One day on call"; build chain on every card; keep the theme, careful wording.

**Approved before building (2026-10-14):** a scoped OK: until launch, the lab session may commit and push to the private repo without asking each time. No deploys, no public changes, no change of visibility, no other repos.

**Open, not blocking:** a few facts only Saba knows (kept in the private notes); the design works either way.

**Later, when live parts are built:** the Worker and `lab.sabajanelidze.com`; an Alchemy account; test coins, the faucet key and the xpub (a step-by-step guide will come); for the AI incident, an Anthropic API key with its own monthly cap and an AI Gateway.

---

## 15. Later

- **Concept B, "Hack my exchange":** puzzle levels, one system to break per level; reuses the core with one defence switched off per level.
- **Other lab demos** (separate approvals): the live sandbox, "Sneak a bug past my agents" (an honest replay of real CI runs), "Agent flight recorder" (partly delivered by the build chain), "Agent checkout with a spending mandate".
- **Videos:** Remotion videos from the same components [MO §5].

---

## 16. Sources

**Portfolio research (private, not in this repo, read 2026-10-14):** the brief for this session, the portfolio plan, the brand split, and research reports on creative features and games, the tech stack, motion design, recent AI capabilities, and demo best practices.

**The six reviews [RV]:** `private/reviews/2026-10-14-design-attack.md` (summary) and `2026-10-14-codex-review.md` (raw Codex text).

**Checked fresh (2026-10-14):**
- Library versions and sizes: npm registry, esbuild bundles, Bundlephobia ([pixi.js](https://www.npmjs.com/package/pixi.js), [phaser](https://www.npmjs.com/package/phaser), [kaplay](https://www.npmjs.com/package/kaplay), [motion](https://motion.dev/docs/animate), [preact](https://www.npmjs.com/package/preact), [@astrojs/preact](https://docs.astro.build/en/guides/integrations-guide/preact/)); [PixiJS accessibility](https://pixijs.com/8.x/guides/components/accessibility); [Phaser 4 rendering](https://phaser.io/news/2026/04/phaser-4-renderer-faster-cleaner-and-built-for-modern-games); [Astro islands](https://docs.astro.build/en/guides/framework-components/).
- Chains and providers: [ethereum.org networks](https://ethereum.org/developers/docs/networks/), [BIP94](https://bips.dev/94/), [Chainstack testnets](https://docs.chainstack.com/docs/bitcoin-testnets), [Sepolia forked blocks](https://sepolia.etherscan.io/blocks_forked), [Alchemy free tier](https://support.alchemy.com/articles/5827006872-what-is-included-in-the-free-tier), [PublicNode terms](https://www.publicnode.com/terms), [BIP32](https://bips.dev/32/), [BIP44](https://bips.dev/44/), [scure-bip32](https://github.com/paulmillr/scure-bip32), [noble-curves](https://github.com/paulmillr/noble-curves), [Sepolia PoW faucet](https://sepolia-faucet.pk910.de/), [Etherscan terms](https://etherscan.io/terms); live checks of Sepolia, testnet4 and signet timing.
- Cloudflare: [DO WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), [DO limits (30 s CPU, free plan too)](https://developers.cloudflare.com/durable-objects/platform/limits/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [rate-limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [AI Gateway logging](https://developers.cloudflare.com/ai-gateway/observability/logging/), [input gates](https://blog.cloudflare.com/durable-objects-easy-fast-correct-choose-three/).
- Incidents cited by the reviewers: [Kraken, June 2024: deposits credited "before asset deposits fully cleared", nearly $3M](https://www.theblock.co/post/300888/kraken-discloses-bug-exploited-for-nearly-3-million) (checked); Revolut's 2022 payment flaw, about $20M ([Help Net Security](https://www.helpnetsecurity.com/2023/07/10/flaw-in-revolut-payment-systems-exploited-to-steal-20-million/), via the CTO review, not re-checked).
- Agent security: the "Design Patterns for Securing LLM Agents" paper ([arXiv 2506.08837](https://arxiv.org/abs/2506.08837v3)) via the AI engineer's review, not re-checked.
- The "Utopia / UTO" specimen (ICAO Doc 9303 examples) via secondary sources ([mrz-parser](https://docs.rs/crate/mrz-parser/0.3.1), [PyPI mrz](https://pypi.org/project/mrz)); tests will use the official Part 4 examples.
- **Race numbers** (from the real code in `packages/core`, pinned by `packages/core/test/race.test.ts`): v1's naive code 68 of 70 orders lose (an earlier script); build v0.1 36 of 70; "check twice" 120 of 252; "lock only the read" 100 of 224 possible; "lock around read and save" 0 of 74 possible; "reserve, then settle" 0 of 70. Pause points: build v0.1 loses only after line 2.

**Not verified yet:** Alchemy WebSockets on the free plan (not needed); the exact faucet amount after the first live test; Sepolia's end date (none announced).
