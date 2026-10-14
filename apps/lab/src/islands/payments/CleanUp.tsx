import {
  FakeBank,
  formatCents,
  MemoryPaymentsStore,
  type MoneyPicture,
  moneyPicture,
  reconcile,
  resolveUnknownPayout,
  withdraw,
} from '@lab/core'
import { useState } from 'preact/hooks'
import { MoneyPanel } from './parts.tsx'

const CUSTOMER = '42'
const OPENING = 10000
const AMOUNT = 8000

type Choice = 'again' | 'ask' | 'reconcile'

const CHOICES: ReadonlyArray<{ id: Choice; label: string }> = [
  { id: 'again', label: 'Send the payout again' },
  { id: 'ask', label: 'Ask the bank what happened to this payout' },
  { id: 'reconcile', label: "Leave it on hold for tonight's reconciliation" },
]

/** Go deeper: the senior part. The fix is live, and now the bank does not answer. */
export function CleanUp() {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<{
    choice: Choice
    picture: MoneyPicture
    text: string
    good: boolean
  } | null>(null)

  async function play(choice: Choice) {
    const store = new MemoryPaymentsStore({ [CUSTOMER]: OPENING })
    const bank = new FakeBank()
    const ports = { store, bank }
    // The bank pays, but its answer never arrives.
    bank.failNext('timeout-after-paying')
    await withdraw(ports, { customerId: CUSTOMER, amount: AMOUNT, payoutId: 'payout-1' })

    let text: string
    let good: boolean
    if (choice === 'again') {
      // A new payout is sent, and the case is closed as if this one had paid.
      await bank.pay('payout-1-again', CUSTOMER, AMOUNT)
      await store.settle('payout-1')
      text = `The bank had already paid. Now it has paid twice: ${formatCents(2 * AMOUNT)} for one withdrawal of ${formatCents(AMOUNT)}.`
      good = false
    } else if (choice === 'ask') {
      const outcome = await resolveUnknownPayout(ports, 'payout-1')
      text = `The bank says payout-1 was ${outcome}. The hold is settled, nothing was paid twice, and the customer sees "paid" a moment later.`
      good = true
    } else {
      const lines = await reconcile(store, bank)
      text = `Tonight's job found ${lines
        .filter((line) => line.action === 'settled')
        .map((line) => line.payoutId)
        .join(
          ', ',
        )} on the bank's statement and settled it. Nothing lost; the customer saw "pending" until then. This is the safety net under the faster answer.`
      good = true
    }
    setResult({ choice, picture: moneyPicture(store, bank, CUSTOMER, OPENING), text, good })
  }

  if (!open) {
    return (
      <div class="go-deeper">
        <button type="button" class="button" onClick={() => setOpen(true)}>
          Go deeper: the bank stops answering
        </button>
      </div>
    )
  }

  return (
    <section class="cleanup" aria-labelledby="cleanup-heading">
      <h3 id="cleanup-heading">Clean up: the bank timed out</h3>
      <p>
        Build v1 is live. A customer withdraws 80. Your code reserves it and calls the bank, and the bank
        never answers. Did it pay? Your code kept the 80 <strong>on hold</strong> and marked the payout
        "unknown". What do you do?
      </p>
      <div class="actions">
        {CHOICES.map((choice) => (
          <button
            key={choice.id}
            type="button"
            class={`button${result?.choice === choice.id ? ' primary' : ''}`}
            onClick={() => play(choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>
      {result ? (
        <div class="cleanup-result" aria-live="polite">
          <p class={result.good ? 'verdict-good' : 'verdict-bad'}>
            <span aria-hidden="true">{result.good ? '✓ ' : '✗ '}</span>
            {result.text}
          </p>
          <MoneyPanel picture={result.picture} final />
        </div>
      ) : null}
    </section>
  )
}
