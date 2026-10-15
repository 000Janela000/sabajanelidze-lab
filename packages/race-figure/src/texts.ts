/* Every word the figure shows. Drafts: Saba approves public text before launch. */
export const TEXTS = {
  label: 'Two withdrawals of 80 from a balance of 100, running at the same time',
  steps: ['load the customer', 'read the balance, check 80 ≤ balance', 'save the new balance', 'pay out'],
  paid: 'paid 80',
  refused: 'refused',
  balance: 'Balance',
  paidOut: 'Paid out',
  short80: 'Exchange short',
  order: (n: number, of: number) => `Order ${n} of ${of}.`,
  lost: (balance: string, paidOut: string) =>
    `Both passed the check. Balance ${balance}, paid out ${paidOut}.`,
  safe: (name: string, read: string, balance: string, paidOut: string) =>
    `${name} read ${read} and was refused. Balance ${balance}, paid out ${paidOut}.`,
  another: 'Run another order',
  pause: 'Pause',
  play: 'Play',
  find: 'Reproduce it yourself →',
  note: "Each run is a recorded trace of the game's real code, checked by a test on every build.",
}
