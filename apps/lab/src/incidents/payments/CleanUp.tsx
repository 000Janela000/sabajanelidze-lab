import {
  BANK_FAULT,
  FakeBank,
  MemoryPaymentsStore,
  type MoneyPicture,
  moneyPicture,
  RECONCILE_ACTION,
  reconcile,
  resolveUnknownPayout,
  withdraw,
} from '@lab/core'
import { useState } from 'preact/hooks'
import { MoneyPanel } from '../../game/MoneyPanel.tsx'
import { AMOUNT, CUSTOMER, OPENING } from './setup.ts'
import { CLEAN_UP, MONEY_TEXT } from './texts.ts'

const CHOICE = { SEND_AGAIN: 'SEND_AGAIN', ASK_BANK: 'ASK_BANK', RECONCILE: 'RECONCILE' } as const
type Choice = (typeof CHOICE)[keyof typeof CHOICE]

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
    bank.failNext(BANK_FAULT.TIMEOUT_AFTER_PAYING)
    await withdraw(ports, { customerId: CUSTOMER, amount: AMOUNT, payoutId: 'payout-1' })

    let text: string
    let good: boolean
    if (choice === CHOICE.SEND_AGAIN) {
      // A new payout is sent, and the case is closed as if this one had paid.
      await bank.pay('payout-1-again', CUSTOMER, AMOUNT)
      await store.settle('payout-1')
      text = CLEAN_UP.sendAgain(2 * AMOUNT, AMOUNT)
      good = false
    } else if (choice === CHOICE.ASK_BANK) {
      text = CLEAN_UP.askBank[await resolveUnknownPayout(ports, 'payout-1')]
      good = true
    } else {
      const lines = await reconcile(store, bank)
      text = CLEAN_UP.reconcile(
        lines.filter((line) => line.action === RECONCILE_ACTION.SETTLED).map((line) => line.payoutId),
      )
      good = true
    }
    setResult({ choice, picture: moneyPicture(store, bank, CUSTOMER, OPENING), text, good })
  }

  if (!open) {
    return (
      <div class="go-deeper">
        <button type="button" class="button" onClick={() => setOpen(true)}>
          {CLEAN_UP.open}
        </button>
      </div>
    )
  }

  return (
    <section class="cleanup" aria-labelledby="cleanup-heading">
      <h3 id="cleanup-heading">{CLEAN_UP.heading}</h3>
      <p>{CLEAN_UP.situation}</p>
      <div class="actions">
        {Object.values(CHOICE).map((choice) => (
          <button
            key={choice}
            type="button"
            class={`button${result?.choice === choice ? ' primary' : ''}`}
            onClick={() => play(choice)}
          >
            {CLEAN_UP.choices[choice]}
          </button>
        ))}
      </div>
      {result ? (
        <div class="cleanup-result" aria-live="polite">
          <p class={result.good ? 'verdict-good' : 'verdict-bad'}>
            <span aria-hidden="true">{result.good ? '✓ ' : '✗ '}</span>
            {result.text}
          </p>
          <MoneyPanel picture={result.picture} final texts={MONEY_TEXT} />
        </div>
      ) : null}
    </section>
  )
}
