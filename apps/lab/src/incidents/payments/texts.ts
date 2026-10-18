/*
 * Every sentence of incident 1, in one place. Code compares codes; this file turns them into words.
 * This is also the list Saba approves before anything goes public, and the file a Georgian version copies.
 */
import { formatCents, type Refusal, type Resolution, type Step } from '@lab/core'
import type { RequestState } from '../../game/request-state.ts'

export const STEP_TEXT: Record<Step, string> = {
  LOAD_CUSTOMER: 'load the customer',
  READ_BALANCE: 'read the balance',
  SAVE_BALANCE: 'save the new balance',
  RESERVE: 'reserve, if the money is there',
  LOOK_UP_PAYOUT: 'look up the earlier payout',
  SETTLE: 'settle the payout',
  RELEASE: 'release the hold',
  LOCK: 'lock the account',
  UNLOCK: 'unlock the account',
  PAY_OUT: 'pay out',
  ASK_BANK: 'ask the bank what happened',
}

/** One word per step, for the race figure on small screens. */
export const STEP_SHORT: Partial<Record<Step, string>> = {
  LOAD_CUSTOMER: 'load',
  READ_BALANCE: 'read',
  SAVE_BALANCE: 'save',
  PAY_OUT: 'pay',
}

export const REQUEST_STATE_TEXT: Record<RequestState, string> = {
  READY: 'ready',
  RUNNING: 'running',
  SLOW: 'slow network…',
  PAID: 'paid out',
  REFUSED: 'refused',
  UNKNOWN: 'unknown',
}

export const REFUSAL_TEXT: Record<Refusal, string> = {
  INVALID_AMOUNT: 'The amount must be more than zero.',
  INSUFFICIENT_FUNDS: 'Not enough money.',
  BANK_REFUSED: 'The bank refused the payout.',
  PAYOUT_ID_REUSED: 'This payout ID was already used for a different withdrawal.',
}

export const MONEY_TEXT = {
  title: 'The books',
  subtitle: 'our ledger vs the bank',
  stamp: 'MONEY LOST',
  had: 'Customer had',
  balance: 'Balance shows',
  held: 'On hold',
  paidOut: 'Bank paid out',
  lost: 'Money lost',
  none: 'none',
  pending: '…',
}

export const PAGE = {
  title: 'Incident 1: the bank paid out twice · On call',
  description:
    'Two withdrawals of 80 from a balance of 100, and the bank paid 160. Find how on real code, then pick the fix that holds in every order. A 2-minute puzzle by Saba Janelidze. Test mode, fake money.',
  meta: 'Incident 1 · Payments · about 2 minutes',
  heading: 'The bank paid out twice',
  ticket:
    'I had 100. I tapped Withdraw 80 twice by accident. The bank paid me 160, and my balance still shows 20.',
  ticketFrom: 'Customer #42 · support chat · a made-up ticket',
  /** Under the ticket: what is real, what is simulated, and what the two builds are. */
  note: 'The code is real and runs in your browser; the customer and the bank are simulated. Build v0.1 is the withdrawal code as it ran this morning; build v1 is the fix you will pick.',
  findTheBug: 'Find the bug',
  readCode: 'Read the code and the tests',
  textFold: 'Full text version (contains the answers)',
}

/** The console: the dark panel where the game runs. */
export const CONSOLE = {
  label: 'The console',
  steps: ['Reproduce', 'Count', 'Fix'],
  progressLabel: 'Steps of this incident',
  pause: 'Pause',
  resume: 'Resume',
  /** The light in the header that is lit while the machine runs something. */
  running: 'RUN',
  /** What the screen shows, per stage: long on wide screens, short on phones. */
  screen: {
    REPRODUCE: {
      long: 'build v0.1 · withdraw 80 · real code · simulated timing',
      short: 'v0.1 · real code · simulated timing',
    },
    COUNT: {
      long: 'build v0.1 · two requests · every order · real code',
      short: 'v0.1 · every order · real code',
    },
    FIX: { long: 'three patches · real code', short: 'three patches · real code' },
    SOLVED: { long: 'build v1 · reserve, then settle · real code', short: 'v1 · reserve, then settle' },
    DEEPER: {
      long: 'build v1 · real code · a simulated bank that stops answering',
      short: 'v1 · simulated bank timeout',
    },
  },
  viewsLabel: 'What the screen shows',
  views: { RACE: 'Race', CODE: 'Code', PATCH: 'Patch', RESULT: 'Result' },
  /** Shown at the foot of a code box that has more lines below. */
  more: 'more below ↓',
}

/** The strip of five numbers under the screen: the books, or what each step found so far. */
export const READOUT = {
  unknown: '?',
  empty: '—',
  count: {
    title: 'The count',
    subtitle: 'what you found so far',
    reproduced: 'Reproduced',
    tries: (tries: number) => `try ${tries}`,
    lost: 'Money lost',
    guess: 'Your guess',
    lose: 'Lose money',
    runs: 'Ways to run',
  },
  fix: {
    title: 'The attack',
    subtitle: 'the patch, every way to run',
    before: 'v0.1 loses',
    of: (losing: number, runs: number) => `${losing} of ${runs}`,
    ofUnknown: (runs: number) => `? of ${runs}`,
    /** The same, for a narrow console. */
    ofShort: (losing: number | string, runs: number) => `${losing}/${runs}`,
    patch: 'Patch',
    lose: 'Patch loses',
    tries: 'Tries',
  },
  solved: {
    title: 'The result',
    subtitle: 'before and after the fix',
    fix: 'The fix',
    lose: 'Fix loses',
  },
}

export const REPRODUCE = {
  heading: 'Reproduce it',
  goal: "Make the bank pay twice. A and B are the customer's two taps, at the same time. Tap a step on lane A: A gets slow there, B runs past, A finishes.",
  demoLead: 'Watch one run first.',
  demoDone:
    'That one was fine: A got slow after step 1, then read 20 and was refused. Your turn: tap a step on lane A.',
  hintAfterSafe: (step: number) =>
    `No money lost after step ${step}. Where is the gap between reading the balance and saving it?`,
  lane: (name: string) => `Request ${name}`,
  laneFigure: 'Two requests racing through the same four steps',
  pickLabel: (step: number, label: string) => `Make request A slow after step ${step}: ${label}`,
  slowHere: 'slow here',
  result: { PAID: 'paid 80', REFUSED: 'refused', UNKNOWN: 'unknown' } as Record<string, string>,
  running: (step: number) => `Request A gets slow after step ${step}…`,
  requestTitle: (name: string) => `Request ${name}`,
  tagA: 'build v0.1 · withdraw 80',
  stepState: { DONE: 'done', NOW: 'now', TODO: '' },
  pause: 'A got slow here',
  codePickLabel: (name: string, line: number, step: string) =>
    `Make request ${name} slow after step ${line}: ${step}`,
  compactNote: '',
  lostLead: (tries: number) => `Reproduced on try ${tries}.`,
  lost: (line: number, paidOut: number, available: number, short: number) =>
    `With request A slow after step ${line}, the bank paid out ${formatCents(paidOut)} and the balance still shows ${formatCents(available)}. The exchange is ${formatCents(short)} short.`,
  next: 'Next: how often does this happen? →',
  nextLocked: 'Next: reproduce it first',
  replay: 'Replay the losing order',
}

export const COUNT = {
  heading: 'How often does it happen?',
  question: (runs: number) =>
    `The two requests can run in ${runs} different ways (orders of their steps). How many lose money? Guess first, then let the machine run them all.`,
  prompt: (runs: number) => `Your guess first: how many of the ${runs} lose money?`,
  guessLabel: 'Your guess',
  run: (runs: number) => `Run all ${runs}`,
  of: (runs: number) => `of ${runs} ways to run`,
  loseMoney: 'lose money',
  legendSafe: (count: number | string) => `safe · ${count}`,
  legendLost: (count: number | string) => `lost money · ${count}`,
  notRun: (runs: number) => `Not run yet: ${runs} ways to run, each one a square.`,
  figureTitle: 'Every way the two requests can run.',
  figureText: (runs: number) =>
    `Each square is one distinct order of their steps (4 each). The machine runs all ${runs} and checks the books after each.`,
  result: (losing: number, runs: number, guess: string) =>
    `${losing} of ${runs} ways to run lose money${guess ? ` (your guess: ${guess})` : ''}. Build v0.1 loses money whenever both requests read the balance before either one saves.`,
  next: 'Next: fix it →',
  nextLocked: (runs: number) => `Next: run all ${runs} first`,
}

export const FIX = {
  heading: 'Fix it',
  goal: 'Pick a patch. The machine will attack it with every way the two requests can run.',
  prompt: 'Pick a patch, then attack it.',
  ready: (name: string) => `Ready: attack "${name}" with every way the two requests can run.`,
  patchesLegend: 'Patches',
  none: 'Pick a patch to read its code. Lines that are not in build v0.1 are marked. Then attack it.',
  changed: 'changed',
  codeLabel: (name: string) => `The code of "${name}"`,
  attack: 'Attack this patch',
  tryAnother: 'Try another patch',
  stillLoses: (losing: number, runs: number, line: number | null) =>
    `Still loses money in ${losing} of ${runs} ways to run${line ? `, for example when A gets slow after step ${line}` : ''}.`,
  stillLosesWhy: 'The gap between reading and saving is still open. Try another patch.',
  patches: {
    CHECK_TWICE: {
      name: 'Check the balance twice',
      short: 'Check twice',
      summary: 'Read and check the balance again, just before saving.',
    },
    RESERVE: {
      name: 'Reserve, then settle',
      short: 'Reserve',
      summary: 'One atomic step moves the 80 to "on hold", only if it is there. Then pay. Then settle.',
    },
    LOCK_READ: {
      name: 'Lock the read',
      short: 'Lock the read',
      summary: 'Put a lock around reading the balance.',
    },
  },
}

export const SOLVED = {
  heading: (runs: number) => `Fixed: it holds in all ${runs} ways to run`,
  goal: 'The machine attacked the fix with every way the two requests can run. None loses money.',
  grid: (runs: number) => `"Reserve, then settle" loses money in 0 of ${runs} ways to run.`,
  why: 'The check and the move are now one atomic step: "move 80 from available to on hold, only if 80 is there". A second request can never reserve money the first one already holds.',
  readCode: 'Read the code and the tests',
  book: 'Book a call',
  copyResult: 'Copy result',
  copied: 'Copied ✓',
  sendToCto: 'Copy the link',
  linkCopied: 'Link copied ✓',
  copyFailed: (url: string) => `Copying didn't work here. The link: ${url}`,
  share: (tries: number, guess: string, losing: number, runs: number, patchTries: number) => [
    'On call · Incident 1: the bank paid out twice',
    `Reproduced the race on try ${tries}`,
    `Guessed ${guess || '?'} · ${losing} of ${runs} ways to run lose money`,
    `Fixed with "reserve, then settle" after ${patchTries} ${patchTries === 1 ? 'try' : 'tries'}`,
  ],
}

export const CLEAN_UP = {
  open: 'Go deeper: the bank stops answering',
  back: '← Back to the result',
  prompt: 'Pick what you would do. The books show what happens.',
  /** The screen: one payout, sent, with no answer. */
  payout: 'payout-1',
  sent: 'sent to the bank',
  noAnswer: 'no answer',
  held: (amount: number) => `${formatCents(amount)} on hold`,
  choicesLabel: 'What do you do?',
  heading: 'Clean up: the bank timed out',
  situation:
    'Build v1 is live. Your code reserved 80 and sent the payout. The bank never answered. Did it pay? What do you do?',
  choices: {
    SEND_AGAIN: 'Send a new payout',
    ASK_BANK: 'Ask the bank what happened to this payout',
    RECONCILE: "Leave it on hold for tonight's reconciliation",
  },
  sendAgain: (paid: number, amount: number) =>
    `The bank had already paid. A new payout ID is a new payment: it paid twice, ${formatCents(paid)} for one withdrawal of ${formatCents(amount)}.`,
  askBank: {
    PAID: 'The bank says payout-1 was paid. The hold is settled, and nothing was paid twice.',
    RELEASED: 'The bank says payout-1 was refused. The hold is released and the money is available again.',
    STILL_UNKNOWN: 'The bank has no record of payout-1 yet. That is not final, so the money stays on hold.',
  } satisfies Record<Resolution, string>,
  reconcile: (settled: string[]) =>
    `Tonight's job asked the bank about ${settled.join(', ')}, heard "paid" and settled the hold. Nothing lost; until then it showed "unknown". The safety net under the faster answer.`,
}

export const PROOF = {
  summary: 'How it works: the code, the tests, and how it was built',
  results: {
    label: 'The results',
    v01: 'Build v0.1 (naive)',
    v1: 'Build v1 (the fix)',
    lose: (losing: number, runs: number) => `${losing} of ${runs} ways to run lose money`,
    postgres: 'Real Postgres database, 20 withdrawals at once',
    paidOnce: 'build v1 pays out once',
    ci: 'Automatic checks (CI) on this build',
    ciLink: 'see the result',
    note: 'Each build has its own steps, so its own number of orders. The first two numbers are computed from the code when the site is built; the third is what the real-database test checks on every push.',
  },
  run: {
    intro: 'Run the tests yourself:',
    repo: 'the code on GitHub',
    commands: ['pnpm install', 'pnpm --filter @lab/core test', 'cd go && go test -race ./...'],
    needs: 'Needs Node 24 with pnpm, and Go 1.25 for the last line.',
    note: 'The real-database tests also run when DATABASE_URL points at a Postgres server.',
  },
  showCode: (lines: number) => `Show the code (${lines} lines)`,
  whatHappenedHeading: 'What happened, and the fix',
  whatHappened:
    'Build v0.1 reads, checks and saves the balance in separate steps, so two requests can both pass the check. Build v1 makes the check and the move one atomic step: it happens whole or not at all, so no second request can slip in between.',
  langNote: 'The game runs the TypeScript version. The Go tab shows the same fix in Go.',
  v01Title: 'Build v0.1 (naive)',
  v1Title: 'Build v1 (reserve, then settle)',
  answerTitle: 'The stored answer for a repeated payout ID',
  langLabel: 'Code language',
  langs: { TS: 'TypeScript', GO: 'Go' },
  testsHeading: 'The tests',
  tests: {
    everyRun: 'Every run, counted',
    everyRunText: (runs: number, losing: number) =>
      `: all ${runs} ways build v0.1 can run (${losing} lose money), and every patch on this page. The numbers in the game are the numbers in this test.`,
    randomSchedules: 'Random schedules',
    randomSchedulesText:
      ': 2 to 5 withdrawals of random amounts, run in hundreds of random orders. With build v1, none loses money.',
    defenceCheck: 'The defence check',
    defenceCheckText: ': the same test runs with the atomic reserve switched off, and it must fail.',
    defenceBadge: 'fails when the defence is off ✓',
    unknownOutcome: 'The unknown outcome',
    unknownOutcomeText:
      ': a timeout keeps the money on hold; it is resolved by asking the bank, never by paying again.',
    goRace: 'The Go version',
    goRaceText:
      ": the same fix in Go, with the same codes and the same reserve SQL. Its tests send 20 withdrawals at once, in memory and on a real Postgres server, under Go's race detector. (That tool fails a test when two parts of the program touch the same memory at the same time with nothing keeping them in order.) Build v1 pays out once; build v0.1 pays out more than once.",
  },
  tradeOffHeading: 'The trade-off',
  tradeOff: (losing: number, runs: number, naiveRuns: number) =>
    `A lock around both the read and the save also holds: ${losing} of its ${runs} ways to run lose money (its steps differ from build v0.1, so it has ${runs} ways to run, not ${naiveRuns}). The reserve is still the better step, for two reasons. It is one statement, so there is no lock to forget to release on an early return (look at the extra unlock the lock version needs). And money in flight gets its own state, "on hold" (it has left the balance but not yet the exchange), so a timeout or a refused payout can be settled or released later from the books.`,
  lockBothTitle: 'Lock around the read and the save (also safe)',
  realDatabaseHeading: 'On a real database',
  postgresIntro:
    'On a real database the reserve is one SQL statement: it moves the 80 to "on hold" only if the balance covers it, and writes the payout record in the same statement. The CHECK (available >= 0) on the table is a backstop (a last line of defence), not the fix.',
  postgresTitle: 'The reserve on Postgres',
  realDatabase: 'The real-database race',
  realDatabaseText:
    ": in CI, 20 withdrawals of 80 hit a real Postgres server at once. Build v0.1's requests each wait 20 ms after reading the balance, like a slow network, so its gap is always hit: it pays out more than once. Build v1 has no separate read; it pays out exactly once.",
  deadlock:
    "That test also caught a bug the in-memory model can't show: a deadlock. A request repeating a payout ID held the balance row and waited for the payout row, while the settle of the first request held the payout row and waited for the balance row. The fix is the usual one: settle and release now lock the balance row first, in the same order as the reserve.",
  lockOrderTitle: 'The lock order (found by the real-database test)',
  cleanUpHeading: 'The clean-up code',
  cleanUpIntro:
    "When the bank doesn't answer, the money stays on hold, and two pieces of code settle it later. One asks the bank about a single payout. The end-of-day job checks every open hold and the bank's statement for the day. Both work on either store, and the end-of-day job has a Postgres test of its own.",
  resolveTitle: 'Resolve an unknown payout',
  reconcileTitle: 'The end-of-day reconciliation',
  chainHeading: 'How this code was built',
  chain: (commits: number, agentCommits: number, checksRun: number, refusals: number) =>
    `${commits} ${commits === 1 ? 'commit' : 'commits'} on this code, ${agentCommits === commits ? 'all' : agentCommits} written by an AI agent (Claude). The local checks before a commit ran ${checksRun} ${checksRun === 1 ? 'time' : 'times'} on this code and refused ${refusals}; on every push, CI runs the tests, the real-database race and Go's race detector. Codex (another company's AI) reviewed this incident twice: eight findings on the TypeScript and its page, four on the Go version. All were fixed, with tests for the money cases.`,
  ciLink: 'Result of the automatic checks (CI) for this build',
  lastChange: 'Last change:',
  reviewsLead: 'The reviews, word for word:',
  reviewIncident: 'incident 1',
  reviewGo: 'the Go version',
  approval: 'Saba approves each incident before it goes live.',
  book: 'I build this for teams that handle money.',
  bookButton: 'Book a call',
}

export const TEXT_VERSION = {
  heading: 'The whole incident, as text',
  codeHeading: 'The code: build v0.1',
  codeIntro: 'Two copies of this withdrawal run at the same moment, each for 80, on a balance of 100:',
  checkSuffix: ' and check it is at least 80',
  reproduceHeading: '1. Reproduce',
  reproduce: (places: number, losing: number[]) =>
    `Pick the step after which request A gets slow; B then runs to the end, then A finishes. Only ${losing.length === 1 ? 'one' : losing.length} of the ${places} places loses money: after step ${losing.join(', ')}. A has read 100; B reads 100 too, saves 20 and pays 80; A saves 20 and pays 80.`,
  loss: (paidOut: number, available: number, short: number) =>
    ` The bank paid out ${formatCents(paidOut)}, the balance shows ${formatCents(available)}, and the exchange is ${formatCents(short)} short.`,
  countHeading: '2. Count',
  count: (runs: number, losing: number, percent: string) =>
    `The two requests can run in ${runs} different ways (different orders of their steps). ${losing} of them (${percent}) lose money: build v0.1 loses whenever both requests read the balance before either one saves.`,
  fixHeading: '3. Fix',
  fix: {
    checkTwice: (losing: number, runs: number, percent: string) =>
      `still loses in ${losing} of ${runs} ways to run (${percent}). The gap moves; it doesn't close.`,
    lockRead: (losing: number, runs: number, percent: string) =>
      `still loses in ${losing} of ${runs} ways to run (${percent}). The lock is released before the save.`,
    reserve: (losing: number, runs: number) => `loses in ${losing} of ${runs} ways to run. This is build v1.`,
  },
  cleanUpHeading: 'Go deeper: the bank stops answering',
  cleanUp:
    'With build v1 live, a payout of 80 times out at the bank. The money stays on hold and the payout is marked "unknown". Sending a new payout (a new payout ID) pays twice if the bank had already paid. Asking the bank about this payout settles the hold at once if the bank paid; "not found" is not final, so the money stays on hold. Tonight\'s reconciliation checks every open hold with the bank, and every payout on the bank\'s statement against our own records, so it also catches a payout our books can\'t explain.',
}
