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

/** The game's name, at the start of the first line on every page. */
export const GAME_NAME = 'On call'

/** Who made the lab and what he offers: after the game's hook and its first action, never before. */
export const MAKER = {
  text: 'Made by Saba Janelidze, principal engineer. I build payment and ledger systems for fintech and crypto teams. Hiring, or need help with payments?',
  book: 'Book a call →',
}

export const TEST_MODE = 'TEST MODE, no real money'

export const STATION_NAME: Record<string, string> = {
  payments: 'Payments',
  kyc: 'New customers',
  deposits: 'Deposits',
  ai: 'AI support',
  books: 'End of shift',
}

/** The page for an address that does not exist. */
export const NOT_FOUND = {
  title: 'Page not found · On call',
  description: "This page does not exist. The lab's incidents are on its home page.",
  heading: 'This page does not exist.',
  text: "Maybe the link is old, or it has a typo. The incidents are on the lab's home page.",
  home: 'Go to the incidents →',
}

export const HOME = {
  title: 'On call: one day at a tiny crypto exchange',
  description:
    'You are on call at a made-up crypto exchange. Each incident is a 2-minute puzzle on real code by Saba Janelidze: reproduce the loss, count how often it happens, pick the fix that holds in every order. Test mode, fake money.',
  meta: 'a 2-minute puzzle at a made-up crypto exchange',
  heading: 'A customer was paid 160 from a balance of 100.',
  lead: 'Two taps on Withdraw 80 at the same moment, and the bank paid twice. Find how on the real code, then pick the fix that holds in every order.',
  start: 'Play incident 1',
  startNote: 'no sign-up',
  howHeading: 'How each incident works',
  how: [
    {
      step: 'Reproduce',
      text: 'break it on purpose (make one request slow, or lose an answer) and watch the real code fail.',
    },
    { step: 'Count', text: 'guess, then see how many of all the possible orders go wrong.' },
    {
      step: 'Fix',
      text: 'pick a patch. The machine tries it in every order; wrong patches fail in front of you.',
    },
  ],
  noCode:
    'You never write code. You tap steps with plain labels, and each one runs the real code in your browser: the same files the incident\'s "How it works" card links to, with their tests.',
  incidentsHeading: 'Incidents',
  incident: (number: number, name: string) => `Incident ${number} · ${name}`,
  take: 'Play this incident',
  next: 'Next: incident 3, deposits on a test network ("we paid out 1.0 that never arrived"). Later: a support AI that must not be tricked, and the end-of-shift books.',
  tickets: {
    payments: '"I tapped Withdraw 80 twice. The bank paid me 160 and my balance still shows 20."',
    kyc: '"I was approved yesterday. This morning my status says pending again."',
    deposits: '"We paid out 1.0 that never arrived."',
    ai: '"Your support assistant told me to send coins to an address to release my deposit."',
    books: 'Your incident reports for the day, and do the books still balance?',
  } as Record<string, string>,
}
