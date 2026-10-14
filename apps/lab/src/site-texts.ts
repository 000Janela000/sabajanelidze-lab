/*
 * The site's own words (layout, the home page). Each incident keeps its words in its own texts file.
 * Drafts: Saba approves every public sentence before launch (publish gate).
 */

export const LAYOUT = {
  skip: 'Skip to content',
  name: 'Saba Janelidze',
  lab: 'lab',
  book: 'Book a call',
  footerBefore: 'Built at home by',
  footerName: 'Saba Janelidze',
  footerAfter: '. New code written for this lab, no employer code.',
  footerTestMode: 'Test mode: fake money and made-up customers. Nothing here moves real money.',
  theme: { label: 'Theme:', light: 'Light', dark: 'Dark', auto: 'Auto' },
}

/** Who made the lab and what it is: the first sentence on every page. */
export const FRAME =
  "A working demo by Saba Janelidze, Principal Engineer: payment and ledger systems for fintech and crypto teams. You're the on-call engineer. No code to write: you tap."

export const TEST_MODE = 'Test mode, fake money'

export const STATION_NAME: Record<string, string> = {
  payments: 'Payments',
  kyc: 'New customers',
  deposits: 'Deposits',
  ai: 'AI support',
  books: 'End of shift',
}

export const HOME = {
  title: 'On call: one day at a tiny crypto exchange',
  description:
    'A working demo by Saba Janelidze. You are the on-call engineer at a made-up crypto exchange. Each incident is a 2-minute puzzle on real code: reproduce how the money was lost, count how often it happens, pick the fix that survives every way the code can run. Test mode, fake money.',
  meta: (ready: number, total: number) => `${ready} of ${total} incidents ready · about 2 minutes each`,
  heading: 'A customer was paid 160 from a balance of 100.',
  lead: "You're on call at Tiny Exchange, a made-up crypto exchange. Find out how it happened, then pick the fix that holds in every way the code can run. Every result comes from the real code.",
  start: 'Play incident 1',
  startNote: 'about 2 minutes · no sign-up',
  howHeading: 'How each incident works',
  how: [
    { step: 'Reproduce', text: 'pick the step where one request gets slow, and watch two requests race.' },
    { step: 'Count', text: 'guess, then see how many of all the possible orders lose money.' },
    {
      step: 'Fix',
      text: 'pick a patch. The machine tries it in every order; wrong patches fail in front of you.',
    },
  ],
  noCode:
    'You never write code. You tap steps with plain labels. Every tap runs the real code, the same files the "How it works" card links to, with their tests.',
  dayHeading: 'The day',
  incident: (number: number, total: number, name: string) => `Incident ${number} of ${total} · ${name}`,
  take: 'Play this incident',
  notBuilt: 'Not built yet',
  tickets: {
    payments: '"I tapped Withdraw 80 twice. The bank paid me 160 and my balance still shows 20."',
    kyc: '"I was approved yesterday. This morning my status says pending again."',
    deposits: '"We paid out 1.0 that never arrived."',
    ai: '"Your support assistant told me to send coins to an address to release my deposit."',
    books: 'Your incident reports for the day, and do the books still balance?',
  } as Record<string, string>,
}
