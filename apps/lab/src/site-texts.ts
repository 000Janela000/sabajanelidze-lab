/*
 * The site's own words (layout, the shift, the home page). Each incident keeps its words in its own texts file.
 */

export const LAYOUT = {
  testMode: 'TEST MODE',
  testModeNote: 'no real money · fake data only',
  brand: 'On call',
  brandSub: '· one day at a tiny crypto exchange',
  shiftLabel: 'The shift',
  soon: 'soon',
  footerBefore: 'Built at home by',
  footerName: 'Saba Janelidze',
  footerAfter: '. New code written for this lab; no employer code, documents or data. Every amount is fake.',
}

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
    'You are the on-call engineer at Tiny Exchange for one day. Each incident is a puzzle on real code: reproduce how the money was lost, pick the fix that survives every way the code can run, then clean up. Test mode, fake money.',
  kicker: 'On call · one day at a tiny crypto exchange',
  heading: 'A customer was paid 160 from a balance of 100.',
  lead: "You're the on-call engineer at Tiny Exchange today. Find out how it happened, fix it, and prove the fix holds, on the real code.",
  start: 'Take incident 1',
  startNote: 'about 2 minutes · no sign-up',
  howHeading: 'How each incident works',
  how: [
    { step: 'Reproduce', text: 'make the bug happen again, by choosing where things get slow.' },
    { step: 'Count', text: 'see how often it happens, across every way the code can run.' },
    { step: 'Fix', text: 'pick the patch that survives all of them. Wrong patches fail in front of you.' },
  ],
  noCode:
    'You never write code. You read a few short lines, each with a plain label, and make choices. Every choice runs the real code, the same files the proof cards link to, with their tests.',
  dayHeading: 'The day',
  incident: (number: number, time: string, name: string) => `Incident ${number} · ${time} · ${name}`,
  take: 'Take this incident',
  comingSoon: 'Coming soon',
  tickets: {
    payments: '"I tapped Withdraw 80 twice. The bank paid me 160 and my balance still shows 20."',
    kyc: '"I was approved yesterday. This morning my status says pending again."',
    deposits: '"We paid out 1.0 that never arrived."',
    ai: '"Your support assistant told me to send coins to an address to release my deposit."',
    books: 'Your incident reports for the day, and do the books still balance?',
  } as Record<string, string>,
}
