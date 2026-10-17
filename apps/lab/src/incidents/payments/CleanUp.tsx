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
import { type Said, TONE } from '../../game/Message.tsx'
import { AMOUNT, CUSTOMER, OPENING } from './setup.ts'
import { CLEAN_UP, REQUEST_STATE_TEXT } from './texts.ts'

const CHOICE = { SEND_AGAIN: 'SEND_AGAIN', ASK_BANK: 'ASK_BANK', RECONCILE: 'RECONCILE' } as const
type Choice = (typeof CHOICE)[keyof typeof CHOICE]

/** Everything the clean-up can say, so the message keeps one height whichever answer comes back. */
export const CLEAN_UP_SIZERS: readonly Said[] = [
  { tone: TONE.LOST, text: CLEAN_UP.sendAgain(2 * AMOUNT, AMOUNT) },
  ...Object.values(CLEAN_UP.askBank).map((text) => ({ tone: TONE.OK, text })),
  { tone: TONE.OK, text: CLEAN_UP.reconcile(['payout-1']) },
  { tone: TONE.NONE, text: CLEAN_UP.prompt },
]

export interface CleanUpGame {
  readonly result: { choice: Choice; picture: MoneyPicture; text: string; good: boolean } | null
  readonly said: Said
  play(choice: Choice): Promise<void>
}

/** Go deeper: the senior part. The fix is live, and now the bank does not answer. */
export function useCleanUp(): CleanUpGame {
  const [result, setResult] = useState<CleanUpGame['result']>(null)

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
      const resolution = await resolveUnknownPayout(ports, 'payout-1')
      text = CLEAN_UP.askBank[resolution]
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

  const said: Said = result
    ? { tone: result.good ? TONE.OK : TONE.LOST, text: result.text }
    : { tone: TONE.NONE, text: CLEAN_UP.prompt }

  return { result, said, play }
}

/** The payout nobody answered, and the three things you could do about it. */
export function BankScreen(props: { game: CleanUpGame }) {
  const { game } = props
  return (
    <div class="v-bank">
      <p class="m-bankline">
        <span class="chip">{CLEAN_UP.payout}</span> {CLEAN_UP.sent} · <strong>{CLEAN_UP.noAnswer}</strong> ·{' '}
        <span class="chip chip-unknown">{REQUEST_STATE_TEXT.UNKNOWN}</span> · {CLEAN_UP.held(AMOUNT)}
      </p>
      <fieldset class="m-choices">
        <legend class="visually-hidden">{CLEAN_UP.choicesLabel}</legend>
        {Object.values(CHOICE).map((choice) => (
          <button
            key={choice}
            type="button"
            class="btn-2 m-choice"
            aria-pressed={game.result?.choice === choice}
            onClick={() => void game.play(choice)}
          >
            {CLEAN_UP.choices[choice]}
          </button>
        ))}
      </fieldset>
    </div>
  )
}
