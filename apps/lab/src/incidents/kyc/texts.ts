/*
 * Every sentence of incident 2, in one place. Code compares codes; this file turns them into words.
 * This is also the list Saba approves before anything goes public, and the file a Georgian version copies.
 */
import type { Comparison, EventResult, KycStatus } from '@lab/core'

export const STATUS_TEXT: Record<KycStatus, string> = {
  NOT_STARTED: 'not started',
  PENDING: 'pending',
  IN_REVIEW: 'in review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export const RESULT_TEXT: Record<EventResult, string> = {
  APPLIED: 'applied',
  DUPLICATE: 'already kept',
  STALE: 'out of date',
  PARKED: 'parked',
  BAD_SIGNATURE: 'bad signature',
  VERSION_CONFLICT: 'version conflict',
  OLDER_TIMESTAMP: 'older timestamp',
  MOVE_NOT_ALLOWED: 'move not allowed',
}

export const COMPARISON_TEXT: Record<Comparison, string> = {
  MATCHES: 'matches',
  BEHIND: 'behind',
  NOT_FROM_PROVIDER: 'not from the provider',
}

export const PAGE = {
  title: 'Incident 2: approved, then "pending" again · On call',
  description:
    'An approved customer was locked out overnight. Play the network between an identity provider and our server, on real code, then pick the fix that holds in every order. A 2-minute puzzle by Saba Janelidze. Test mode, made-up customers.',
  meta: 'Incident 2 · Identity checks · about 2 minutes',
  heading: 'Approved, then “pending” again',
  ticket: 'I was approved yesterday. This morning I can’t trade: my status says “pending” again.',
  ticketFrom: 'Anna · support chat · a made-up ticket',
  /** Under the ticket: what is real, what is simulated, and what the two builds are. */
  note: 'The code is real and runs in your browser; Anna, Boris (a second applicant), the identity provider and the network are simulated. The provider numbers each applicant’s messages: #1, #2, #3. Build v0.1 is the code that handled them last night; build v1 is the fix you will pick.',
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
  running: 'RUN',
  screen: {
    REPRODUCE: {
      long: 'build v0.1 · last message wins · real code · simulated network',
      short: 'v0.1 · real code',
    },
    COUNT: { long: 'build v0.1 · every delivery order · real code', short: 'v0.1 · every order' },
    FIX: { long: 'three patches · real code', short: 'three patches' },
    SOLVED: { long: 'build v1 · keep once, apply in order · real code', short: 'v1 · in order' },
    DEEPER: {
      long: 'last night, on build v0.1 · real code · simulated provider',
      short: 'last night · v0.1',
    },
  },
  viewsLabel: 'What the screen shows',
  views: { NIGHT: 'Night', CODE: 'Code', PATCH: 'Patch', RESULT: 'Result' },
  more: 'more below ↓',
  codeLabel: 'The code of build v0.1',
  /** Over the screen when a night ends with Anna locked out. */
  stamp: 'LOCKED OUT',
}

export const REPRODUCE = {
  heading: 'Reproduce it',
  goal: 'Lock Anna out again. Make the network lose one of our answers: the provider then sends that message again.',
  provider: 'Identity provider',
  server: 'Our server · v0.1',
  demoLead: 'A normal night first: two messages, two answers.',
  demoDone: 'Anna ends up approved. Your move: lose one of our answers.',
  /** Before the three cuts, which finish the sentence: "…lose our answer to #1". */
  yourMove: 'Your move: lose our answer to',
  cutsLabel: 'Which of our answers the network loses',
  /** What each cut shows; its full name (`cut`, `cutBoth`) is what a screen reader says. */
  cutShort: { ONE: '#1', TWO: '#2', BOTH: 'both' },
  nightLabel: 'The night, in order',
  cut: (version: number) => `Lose our answer to #${version}`,
  cutBoth: 'Lose both answers',
  planned: (version: number, status: string) => `#${version} ${status} · will be sent`,
  answer: (version: number, again: boolean) => `200 OK · our answer to #${version}${again ? ' again' : ''}`,
  answerLost: '✂ our answer lost',
  arrival: (version: number, status: string, again: boolean) =>
    `#${version} ${status}${again ? ' · sent again' : ''}`,
  result: (result: string, status: string) => `${result} → ${status}`,
  pickLabel: (version: number, again: boolean) =>
    `Point at this arrival: message #${version}${again ? ', sent again' : ''}`,
  /** On the right arrival, once it is picked: why it did it. */
  reveal: 'same ID as #1 · version 1 < 2',
  safeTwo: {
    lead: 'Still approved.',
    text: 'The copy of #2 says what #2 said, so nothing changed. Try another cut.',
  },
  safeBoth: {
    lead: 'Still approved.',
    text: 'Both copies came in order, so #2 still came last. Try losing just one.',
  },
  diagnose: { lead: 'Anna is “pending” again.', text: 'Which arrival locked her out? Tap it.' },
  wrongFirst: 'That one came first: #2 approved her after it. Look further down.',
  wrongApproved: 'That one approved her. Something after it undid that.',
  lostLead: (tries: number) => `Reproduced on try ${tries}.`,
  lost: 'The copy of #1 is older (version 1), but it arrived last, and build v0.1 let the last message win.',
  running: 'The night plays: messages, our answers, copies.',
  next: 'Next: how often does this happen?\u00a0→',
  nextLocked: 'Next: reproduce it first',
  again: 'Start the night again',
}

export const COUNT = {
  heading: 'How often does it happen?',
  goal: 'Each message can arrive once or twice, in any order. How many orders lock Anna out? Guess first, then run them all.',
  prompt: (orders: number) => `Your guess first: how many of the ${orders} lock Anna out?`,
  running: (orders: number) => `Running all ${orders} orders…`,
  guessLabel: 'Your guess',
  run: (orders: number) => `Run all ${orders}`,
  of: (orders: number) => `of ${orders} delivery orders`,
  lockOut: 'lock Anna out',
  legendSafe: (count: number | string) => `approved · ${count}`,
  legendLost: (count: number | string) => `locked out · ${count}`,
  notRun: (orders: number) => `Not run yet: ${orders} delivery orders, each one a card.`,
  figureTitle: 'Every order the two messages can arrive in.',
  figureText: (orders: number) =>
    `A lost answer makes a copy; a slow network can also bring #2 before #1. ${orders} orders in this model; the machine delivers each one to build v0.1.`,
  result: (losing: number, orders: number, guess: string) =>
    `${losing} of ${orders} orders lock Anna out${guess ? ` (your guess: ${guess})` : ''}: every one where #1 arrives last.`,
  next: 'Next: fix it\u00a0→',
  nextLocked: (orders: number) => `Next: run all ${orders} first`,
}

export const FIX = {
  heading: 'Fix it',
  goal: (orders: number) =>
    `Pick a patch. The machine attacks it with all ${orders} orders, and with a forged “approved” for Boris.`,
  prompt: 'Pick a patch, then attack it.',
  ready: (name: string) => `Ready: attack “${name}” with every order, and the forgery.`,
  attacking: (name: string) => `Attacking “${name}” with every order, and the forgery…`,
  patchesLegend: 'Patches',
  none: 'Pick a patch to read its code. Every patch checks the signature first. Then attack it.',
  codeLabel: (name: string) => `The code of “${name}”`,
  attack: 'Attack this patch',
  tryAnother: 'Try another patch',
  stillLocks: (losing: number, orders: number) => `Still locks Anna out in ${losing} of ${orders} orders.`,
  why: {
    TIMESTAMP:
      'Both messages left the provider in the same second, so “older” can’t order them. Try another patch.',
    ALLOWED_MOVES:
      'In order 2 1, “approved” came before “pending”: not allowed yet, so it was thrown away, and never came back.',
  },
  patches: {
    TIMESTAMP: {
      name: 'Ignore older messages',
      short: 'Ignore older',
      summary: 'Refuse a message whose timestamp is older than the last one applied.',
    },
    VERSION_ORDER: {
      name: 'Keep once, apply in order',
      short: 'Apply in order',
      summary:
        'Keep each message once by its ID, apply them in version order, and park an early one until the one before it arrives.',
    },
    ALLOWED_MOVES: {
      name: 'Refuse moves that aren’t allowed',
      short: 'Refuse bad moves',
      summary: 'Refuse a change of status that is not on the list of allowed moves.',
    },
  },
}

export const SOLVED = {
  heading: (orders: number) => `Fixed: approved in all ${orders} orders`,
  goal: 'Every order, and a forged message: Anna ends approved, and the forgery never gets in. It holds whenever every message arrives at least once.',
  grid: (orders: number) => `“Keep once, apply in order” locks Anna out in 0 of ${orders} orders.`,
  why: 'Signature checked, each message kept once by its ID, applied in version order.',
  readCode: 'Read the code and the tests',
  book: 'Book a call',
  copyResult: 'Copy result',
  copied: 'Copied ✓',
  sendToCto: 'Copy the link',
  linkCopied: 'Link copied ✓',
  copyFailed: (url: string) => `Copying didn’t work here. The link: ${url}`,
  share: (tries: number, guess: string, losing: number, orders: number, patchTries: number) => [
    'On call · Incident 2: approved, then "pending" again',
    `Reproduced it on try ${tries}`,
    `Guessed ${guess || '?'} · ${losing} of ${orders} delivery orders lock the customer out`,
    `Fixed with "keep once, apply in order" after ${patchTries} ${patchTries === 1 ? 'try' : 'tries'}`,
  ],
}

export const CLEAN_UP = {
  open: 'Go deeper: the regulator asks',
  back: '← Back to the result',
  heading: 'Clean up: the regulator asks',
  situation:
    'Build v1 is live, but last night ran build v0.1. The regulator asks for Boris’s file: who approved him, when, on what evidence?',
  prompt: 'Pick what you do.',
  tableLabel: 'Last night’s records',
  who: 'Applicant',
  anna: 'Anna',
  boris: 'Boris',
  ours: 'Our record',
  provider: 'The provider’s record',
  notAsked: 'not asked yet',
  /** Our record: every field came from the last message build v0.1 applied, even the time it says it was sent. */
  oursLine: (status: string, version: number, time: string) => `${status} · v${version} · sent ${time}`,
  providerLine: (status: string, version: number) => `${status} · v${version}`,
  choicesLabel: 'What do you do?',
  choices: {
    ANSWER: 'Answer from our record',
    LOGS: 'Search our logs',
    ASK: 'Ask the provider',
  },
  answer: 'You told a regulator something you can’t back: our record only repeats what that message said.',
  /** `kept`: how many of Boris's messages build v0.1 kept (it keeps none: only the latest status). */
  logs: (kept: number) =>
    `Build v0.1 kept only the latest status: ${kept} of Boris’s messages are on file. There is nothing to search.`,
  ask: 'The provider never sent Boris a version 3: that approval did not come from the provider.',
  /** On the screen, once asked: what happens to each applicant. */
  outcome: {
    NOT_FROM_PROVIDER: 'held · kept as evidence',
    BEHIND: 'caught up · can trade',
    MATCHES: 'matches',
  } satisfies Record<Comparison, string>,
  afterAsk:
    'Next for Boris: review what he did while “approved”, and report it as a security incident. Build v1 keeps every message it accepts, and logs every one it refuses.',
}

/** The strip of five numbers under the screen, per step. */
export const READOUT = {
  unknown: '?',
  empty: '—',
  reproduce: {
    title: 'Anna’s record',
    subtitle: 'the provider vs our server',
    provider: 'Provider’s record',
    ours: 'Our record',
    canTrade: 'Can trade',
    yes: 'yes',
    no: 'no',
  },
  count: {
    title: 'The count',
    subtitle: 'what you found so far',
    reproduced: 'Reproduced',
    tries: (tries: number) => `try ${tries}`,
    guess: 'Your guess',
    lockOut: 'Locked out',
    orders: 'Orders',
  },
  fix: {
    title: 'The attack',
    subtitle: 'the patch, every order',
    v01: 'v0.1 locks out',
    patch: 'Patch',
    patchLocks: 'Patch locks out',
    forgery: 'Forgery',
    of: (losing: number | string, orders: number) => `${losing} of ${orders}`,
    refused: 'refused',
    letIn: 'let in',
  },
  solved: {
    title: 'The result',
    subtitle: 'before and after the fix',
    v01: 'v0.1 locks out',
    fix: 'The fix',
    fixLocks: 'Fix locks out',
    forgery: 'Forgery',
  },
  deeper: {
    title: 'Last night',
    subtitle: 'our records vs the provider’s',
    boris: 'Boris, ours',
    borisProvider: 'Boris, provider',
    trading: 'Boris trades',
    held: 'held',
    open: 'yes',
  },
}

/** The proof card under the console: what a CTO checks first, then the code. */
export const PROOF = {
  summary: 'How it works: the code, the tests, and how it was built',
  results: {
    label: 'The results',
    v01: 'Build v0.1 (last message wins)',
    v1: 'Build v1 (the fix)',
    lockOut: (wrong: number, orders: number) => `${wrong} of ${orders} delivery orders lock Anna out`,
    postgres: 'Real Postgres database, messages at once',
    approved: 'build v1 ends approved',
    ci: 'Automatic checks (CI) on this build',
    ciLink: 'see the result',
    note: 'The first two numbers are computed from the code when the site is built; the third is what the real-database test checks on every push.',
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
    'The identity provider tells us about each change as a signed message (it carries a code made with a key only the provider and we hold, so a forged message can be told apart), numbered per applicant: 1, 2, 3. When our answer to a message gets lost, it sends the same message again, so a message can arrive twice, and late. Build v0.1 let the last message to arrive win, so a late copy of “pending” undid “approved”. Build v1 checks the signature first, keeps each message once by its ID, and applies them in version order: an old version changes nothing, and an early one waits (it is parked) until the one before it arrives. Messages for one applicant are handled one at a time, under a lock on that applicant’s row.',
  langNote: 'The game runs the TypeScript version. The Go tab shows the same fix in Go.',
  v01Title: 'Build v0.1 (last message wins)',
  v1Title: 'Build v1 (keep once, apply in order)',
  langLabel: 'Code language',
  langs: { TS: 'TypeScript', GO: 'Go' },
  testsHeading: 'The tests',
  tests: {
    everyOrder: 'Every order, counted',
    everyOrderText: (orders: number, wrong: number) =>
      `: all ${orders} orders Anna’s two messages can arrive in, on build v0.1 (${wrong} lock her out) and on every patch on this page. The numbers in the game are the numbers in this test.`,
    randomOrders: 'Random orders',
    randomOrdersText:
      ': 2 to 5 messages, each arriving up to three times, delivered in 300 random orders. With build v1, the applicant always ends at the latest version.',
    defenceCheck: 'The defence check',
    defenceCheckText: ': the same test runs on build v0.1, without version order, and it must fail.',
    defenceBadge: 'fails when the defence is off ✓',
    lock: 'The lock',
    lockText: ': #2 arrives while #1 is still being saved. With the lock, Anna ends approved at version 2; ',
    lockOff: 'without it',
    lockOffText: ', the same two messages leave her stuck at #1.',
    forgedId: 'A forged message with a real ID',
    forgedIdText: ': it is refused before anything is kept, so it cannot use up the real message’s ID.',
    goLock: 'The Go version',
    goLockText:
      ': the same handler in Go, with the same codes and the same signature (a test checks it matches the TypeScript one). Its lock test runs under Go’s race detector. (That tool fails a test when two parts of the program touch the same memory at the same time with nothing keeping them in order.)',
  },
  tradeOffHeading: 'The trade-off',
  tradeOff:
    'Two ways hold. Where the provider numbers its messages (this one does), apply them in version order, as here. Where it does not, treat each message as a nudge: ask the provider’s API for the applicant’s current status and save that. Saba uses both, depending on the provider. Asking costs one call per message and needs the provider’s API to answer; version order needs no call, but an early message waits until the one before it arrives.',
  notFixes:
    'Not fixes: ignoring older timestamps (the provider stamps its messages to the second, so two can carry the same time), and refusing moves that are not allowed (it throws away a message that came early, and that message never comes back).',
  noRetry:
    'Why not answer with an error and let the provider send it again later? That leans on the provider’s retry schedule, whose waits grow to hours, and providers ask for a fast answer. Parking is the same idea, done on our side.',
  realDatabaseHeading: 'On a real database',
  postgresIntro:
    'On Postgres, each message first locks its applicant’s row (SELECT … FOR UPDATE), so two messages for one applicant are handled one after the other. Each message is kept once: its ID is the key, so a copy adds nothing (ON CONFLICT DO NOTHING). A message with a new ID that claims a version already kept, and says something else, is refused and logged, because each applicant can hold only one message per version (UNIQUE (applicant, version)); one that says the same is a copy.',
  lockTitle: 'The row lock on Postgres',
  recordTitle: 'Keeping each message once',
  realDatabase: 'The real-database race',
  realDatabaseText:
    ': in CI, on a real Postgres server, #2 arrives while #1 is being saved (each look for the next version waits 40 ms). With the row lock, Anna ends approved at version 2; without it, she is stuck at #1. Another test sends #1, #2 and their copies, 20 deliveries at once: approved at version 2, each message kept once.',
  cleanUpHeading: 'The clean-up code',
  cleanUpIntro:
    'After a night on build v0.1, ask the provider’s API for its own record of each applicant (a connection where we log in, so no one else can answer; simulated here) and compare. Behind: catch up to the provider’s latest, then apply any message we parked. A status the provider never sent: hold trading. The record is not rolled back: it stays as the night left it, as evidence, even the time it says it was sent, which only the message claimed. A person lifts the hold after the review, never a message. And if our record is newer than the provider’s answer (a real message can land while it answers), the provider is asked again before anything is called “not from the provider”.',
  cleanUpTest: 'Its test replays last night on build v0.1, then runs the clean-up',
  compareTitle: 'Our record against the provider’s',
  reconcileTitle: 'The clean-up',
  chainHeading: 'How this code was built',
  chain: (commits: number, agentCommits: number, checksRun: number, refusals: number) =>
    `Saba chose what to build, set the rules and approved every step. An AI agent (Claude) wrote ${agentCommits === commits ? 'all' : `${agentCommits} of the`} ${commits} ${commits === 1 ? 'commit' : 'commits'} on this code. The local checks before a commit ran ${checksRun} ${checksRun === 1 ? 'time' : 'times'} on this code and refused ${refusals}; on every push, CI runs the tests, the real-database race and Go’s race detector. Codex, OpenAI’s AI for code, reviewed this incident before it was published, as a second opinion: six findings. Five were fixed, three of them with a test that would fail without the fix; one is kept on purpose, with the reason.`,
  reviewLead: 'The review, word for word:',
  reviewIncident: 'incident 2',
  ciLink: 'Result of the automatic checks (CI) for this build',
  lastChange: 'Last change:',
  book: 'I build this for teams that onboard customers and handle their money.',
  bookButton: 'Book a call',
}

/** The whole incident as text, for screen readers, search engines and anyone who wants to read it. */
export const TEXT_VERSION = {
  heading: 'The whole incident, as text',
  setupHeading: 'The setup',
  setup:
    'The identity provider sends us two signed messages about Anna, in the same second: #1 “pending” (version 1), then #2 “approved” (version 2). Our server answers each one with 200 OK. When an answer gets lost, the provider sends that message again. Build v0.1 saves whatever message arrives, so the last one to arrive wins.',
  reproduceHeading: '1. Reproduce',
  reproduce: (one: string, two: string, both: string) =>
    `Lose our answer to #1: the provider sends #1 again after #2, and Anna ends “${one}”: locked out. Lose our answer to #2: the copy of #2 says the same as #2, and she ends “${two}”. Lose both: the copies come in their order, #2 last, and she ends “${both}”.`,
  countHeading: '2. Count',
  count: (orders: number, wrong: number, percent: string) =>
    `Each message can arrive once or twice, in any order: ${orders} delivery orders (both once: 2 orders; one of them twice: 3 + 3; both twice: 6). ${wrong} of them (${percent}) lock Anna out on build v0.1: every one where #1 arrives last. Every order, in the order the messages arrived:`,
  approved: 'approved',
  lockedOut: 'locked out',
  fixHeading: '3. Fix',
  fix: {
    timestamp: (wrong: number, orders: number) =>
      `still locks Anna out in ${wrong} of ${orders} orders. Both messages left the provider in the same second, so “older” can’t order them.`,
    allowedMoves: (wrong: number, orders: number) =>
      `still locks Anna out in ${wrong} of ${orders} orders. When #2 comes first, “approved” before “pending” is not an allowed move, so that arrival is thrown away. Unless a copy of #2 comes later, Anna stays “pending”.`,
    versionOrder: (wrong: number, orders: number) =>
      `locks Anna out in ${wrong} of ${orders} orders. This is build v1.`,
  },
  forgery: (refusedByAll: boolean) =>
    refusedByAll
      ? 'All three patches check the signature first, so a forged “approved” for Boris gets in with none of them; it gets in only with build v0.1.'
      : 'A forged “approved” for Boris gets in with at least one patch.',
  cleanUpHeading: 'Go deeper: the regulator asks',
  cleanUp:
    'Build v1 is live, but last night ran build v0.1, and the regulator asks for Boris’s file. Our record says “approved” at version 3, sent at 03:12; but that time, too, is only what the message said. Build v0.1 kept only the latest status, so our record only repeats what that message said, and no message is on file to search. Asking the provider for its record shows it never sent Boris a version 3: that approval did not come from the provider. So Boris’s trading is held until a person lifts it, his record is kept as evidence, what he did while “approved” is reviewed, and it is reported as a security incident. Anna, who was only behind, catches up to “approved” and can trade.',
}
