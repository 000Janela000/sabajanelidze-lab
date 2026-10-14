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
  short: 'Exchange is short',
  lost: 'Money lost',
  none: 'none',
}

export const PAGE = {
  title: 'Incident 1: the bank paid out twice · On call',
  description:
    'A puzzle on real code: find how two withdrawals of 80 from a balance of 100 make the bank pay out 160, then pick the fix that survives every way they can run. Test mode, fake money.',
  margin: 'incident 1',
  marginSub: '09:30 · payments',
  ticketNumber: 'ticket #1041',
  ticketMeta: '· 09:30 · Customer #42',
  heading: 'The bank paid out twice',
  ticket:
    'I had 100. I tapped Withdraw 80 twice by accident. The bank paid me 160, and my balance still shows 20.',
  ticketFrom: 'Customer #42 · via support chat',
  proofMargin: 'proof',
  proofMarginSub: 'code · tests · build',
  textMargin: 'text',
  textMarginSub: 'no JavaScript needed',
}

export const BRIEFING = {
  margin: 'your shift',
  stamp: 'YOUR SHIFT · INCIDENT 1',
  duration: 'about 2 min',
  situation:
    'Two withdrawals of 80 ran at the same moment on a balance of 100. Find how the bank ended up paying 160, then pick the fix that survives every way they can run.',
  steps: [
    { name: 'Reproduce', rest: 'the loss' },
    { name: 'Count', rest: 'how often it happens' },
    { name: 'Fix', rest: 'it; the machine attacks your fix' },
  ],
  start: 'Start',
  skip: 'Skip to the code →',
}

export const STEPS_STRIP_LABEL = 'Steps of this incident'

export const REPRODUCE = {
  heading: 'Reproduce it',
  goal: 'Two copies of this withdrawal of 80 run at the same moment. Tap the line after which request A gets slow (a network lag). Then B runs, then A finishes. Find where the slowness makes the bank pay out 160.',
  hintLabel: 'Hint:',
  hintFirst: 'tap a numbered line. Request A gets slow right after it.',
  hintAfterSafe: (line: number) =>
    `no money lost after line ${line}. Where is the gap between reading and saving?`,
  requestTitle: (name: string) => `Request ${name}`,
  tagA: 'build v0.1 · withdraw 80',
  tagB: 'same code',
  compactNote: 'Runs the same code. Here: where it is.',
  stepState: { DONE: 'done', NOW: 'now', TODO: '' },
  pause: 'A got slow here',
  pickLabel: (name: string, line: number, step: string) =>
    `Make request ${name} slow after line ${line}: ${step}`,
  lostLead: (tries: number) => `Reproduced on try ${tries}.`,
  lost: (line: number, paidOut: number, available: number, short: number) =>
    `With request A slow after line ${line}, the bank paid out ${formatCents(paidOut)} and the balance still shows ${formatCents(available)}. The exchange is ${formatCents(short)} short.`,
  safeLead: 'No money lost.',
  safe: (line: number) => `With request A slow after line ${line}, both requests behaved. Try another line.`,
  next: 'Next: how often does this happen? →',
  replay: 'Replay the losing order',
}

export const COUNT = {
  heading: 'How often does it happen?',
  receipt: (tries: number, line: number, paidOut: number, available: number, short: number) =>
    `Reproduced on try ${tries}: A slow after line ${line} → bank paid ${formatCents(paidOut)} · balance ${formatCents(available)} · ${formatCents(short)} short`,
  question: (runs: number) =>
    `The two requests can run in ${runs} different ways (different orders of their steps). How many of them lose money? Guess first, then let the machine run them all.`,
  guessLabel: 'Your guess',
  run: (runs: number) => `Run all ${runs}`,
  of: (runs: number) => `of ${runs} ways to run`,
  loseMoney: 'lose money',
  yourGuess: (guess: string) => `· your guess: ${guess}`,
  legendSafe: (count: number) => `safe · ${count}`,
  legendLost: (count: number) => `lost money · ${count}`,
  figure: 'fig. 2',
  figureTitle: 'Every way the two requests can run.',
  figureText: (runs: number) =>
    `Build v0.1 loses money whenever both requests read the balance before either one saves. Each square is one order of the eight steps; the machine ran all ${runs} and checked the books after each.`,
  result: (losing: number, runs: number, guess: string) =>
    `${losing} of ${runs} ways to run lose money${guess ? ` (your guess: ${guess})` : ''}. Build v0.1 loses money whenever both requests read the balance before either one saves.`,
  next: 'Next: fix it →',
}

export const FIX = {
  heading: 'Fix it',
  receipt: (losing: number, runs: number, guess: string) =>
    `${losing} of ${runs} ways to run lose money${guess ? ` · you guessed ${guess}` : ''}`,
  goal: 'Pick a patch. The machine will attack it with every way the two requests can run.',
  patchesLegend: 'Patches',
  showCode: 'show the code',
  attack: 'Attack this patch',
  stillLoses: (losing: number, runs: number, line: number | null) =>
    `Still loses money in ${losing} of ${runs} ways to run${line ? `, for example when A gets slow after line ${line}` : ''}.`,
  stillLosesWhy: 'The gap between reading and saving is still open. Try another patch.',
  figure: 'fig. 3',
  patches: {
    CHECK_TWICE: {
      name: 'Check the balance twice',
      summary: 'Read and check the balance again, just before saving.',
    },
    RESERVE: {
      name: 'Reserve, then settle',
      summary: 'One atomic step moves the 80 to "on hold", only if it is there. Then pay. Then settle.',
    },
    LOCK_READ: { name: 'Lock only the read', summary: 'Put a lock around reading the balance.' },
  },
}

export const SOLVED = {
  heading: (runs: number) => `Fixed: it holds in all ${runs} ways to run`,
  grid: (runs: number) => `"Reserve, then settle" loses money in 0 of ${runs} ways to run.`,
  figure: 'fig. 4',
  why: 'The check and the move are now one atomic step: "move 80 from available to on hold, only if 80 is there". A second request can never reserve money the first one already holds.',
  readCode: 'Read the code and the tests',
  book: 'Book a call',
  copyResult: 'Copy result',
  copied: 'Copied ✓',
  sendToCto: 'Send this to your CTO',
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
  heading: 'Clean up: the bank timed out',
  situation:
    'Build v1 is live. A customer withdraws 80. Your code reserves it and calls the bank, and the bank never answers. Did it pay? Your code kept the 80 on hold and marked the payout "unknown". What do you do?',
  choices: {
    SEND_AGAIN: 'Send the payout again',
    ASK_BANK: 'Ask the bank what happened to this payout',
    RECONCILE: "Leave it on hold for tonight's reconciliation",
  },
  sendAgain: (paid: number, amount: number) =>
    `The bank had already paid. Now it has paid twice: ${formatCents(paid)} for one withdrawal of ${formatCents(amount)}.`,
  askBank: {
    PAID: 'The bank says payout-1 was paid. The hold is settled, nothing was paid twice, and the customer sees "paid" a moment later.',
    RELEASED: 'The bank says payout-1 was refused. The hold is released and the money is available again.',
    STILL_UNKNOWN: 'The bank has no record of payout-1 yet. That is not final, so the money stays on hold.',
  } satisfies Record<Resolution, string>,
  reconcile: (settled: string[]) =>
    `Tonight's job found ${settled.join(', ')} on the bank's statement and settled it. Nothing lost; the customer saw "pending" until then. This is the safety net under the faster answer.`,
}

export const PROOF = {
  mark: 'fig. P',
  summary: 'How it works: the code, the tests, and how it was built',
  whatHappenedHeading: 'What happened, and the fix',
  whatHappened:
    'Build v0.1 reads the balance, checks it, and later saves a new number. When two requests overlap, both can read 100 before either saves, so both pass the check and the bank pays twice. Build v1 makes the check and the move one atomic step: "move 80 from available to on hold, only if 80 is available". The second request finds only 20 available and is refused.',
  v01Title: 'Build v0.1 (naive)',
  v1Title: 'Build v1 (reserve, then settle)',
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
  },
  tradeOffHeading: 'The trade-off',
  tradeOff: (losing: number, runs: number) =>
    `A lock around both the read and the save also holds (${losing} of ${runs} ways to run lose money). The reserve is still the better step, for two reasons. It is one statement, so there is no lock to forget to release on an early return (look at the extra unlock the lock version needs). And money in flight gets its own state, "on hold", so a timeout or a refused payout can be settled or released later from the books.`,
  lockBothTitle: 'Lock around the read and the save (also safe)',
  postgresIntro:
    'On a real database the reserve is one statement: a conditional update, and the payout record in the same statement. The CHECK (available >= 0) on the table is a backstop, not the fix.',
  postgresTitle: 'The reserve on Postgres',
  realDatabase: 'The real-database race',
  realDatabaseText:
    ': in CI, 20 withdrawals of 80 hit a real Postgres server at once, each waiting 20 ms after its read like a slow network. Build v1 pays out exactly once. Build v0.1, on the same database, pays out more than once.',
  deadlock:
    "That test also caught a bug the in-memory model can't show: a deadlock. A request repeating a payout ID held the balance row and waited for the payout row, while the settle of the first request held the payout row and waited for the balance row. The fix is the usual one: every statement takes the balance row first.",
  lockOrderTitle: 'The lock order (found by the real-database test)',
  cleanUpHeading: 'The clean-up code',
  resolveTitle: 'Resolve an unknown payout',
  reconcileTitle: "Tonight's reconciliation",
  chainHeading: 'How this code was built',
  chain: (commits: number, agentCommits: number, checksRun: number, refusals: number) =>
    `${commits} ${commits === 1 ? 'commit' : 'commits'}, ${agentCommits} of them written by an AI agent (Claude) under automatic checks. The checks ran ${checksRun} ${checksRun === 1 ? 'time' : 'times'} before commits on these files and refused ${refusals}. Codex (another company's AI) reviewed the money code and found seven problems; all were fixed with tests. Last change:`,
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
    `Pick the line after which request A gets slow; B then runs to the end, then A finishes. Only ${losing.length === 1 ? 'one' : losing.length} of the ${places} places loses money: after line ${losing.join(', ')}. A has read 100; B reads 100 too, saves 20 and pays 80; A saves 20 and pays 80.`,
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
    'With build v1 live, a payout of 80 times out at the bank. The money stays on hold and the payout is marked "unknown". Sending the payout again pays twice if the bank had already paid. Asking the bank about this payout settles the hold at once if the bank paid; "not found" is not final, so the money stays on hold. Tonight\'s reconciliation checks every open hold with the bank, and every payout on the bank\'s statement against our own records, so it also catches a payout our books can\'t explain.',
}
