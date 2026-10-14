import { isValidAmount } from './ports.ts'
import type { Withdraw, WithdrawResult } from './withdraw.ts'

const INVALID: WithdrawResult = { status: 'refused', reason: 'the amount must be more than zero' }
const NOT_ENOUGH: WithdrawResult = { status: 'refused', reason: 'not enough money' }

/*
 * Plausible-looking patches for build v0.1 that the game offers next to the real fix.
 * Two of them still lose money; the game proves it by running every order of events.
 */

// #region patch-check-twice
/** "Check the balance twice": the gap between reading and saving moves, but it does not close. */
export const withdrawCheckTwice: Withdraw = async ({ store, bank }, { customerId, amount, payoutId }) => {
  if (!isValidAmount(amount)) return INVALID
  await store.loadCustomer(customerId)
  const first = await store.readAvailable(customerId)
  if (first < amount) return NOT_ENOUGH
  const second = await store.readAvailable(customerId)
  if (second < amount) return NOT_ENOUGH
  await store.writeAvailable(customerId, second - amount)
  await bank.pay(payoutId, customerId, amount)
  return { status: 'paid' }
}
// #endregion patch-check-twice

// #region patch-lock-read
/** "Lock only the read": the lock is released before the save, so the race is still open. */
export const withdrawLockRead: Withdraw = async ({ store, bank }, { customerId, amount, payoutId }) => {
  if (!isValidAmount(amount)) return INVALID
  await store.loadCustomer(customerId)
  await store.lock(customerId)
  const available = await store.readAvailable(customerId)
  await store.unlock(customerId)
  if (available < amount) return NOT_ENOUGH
  await store.writeAvailable(customerId, available - amount)
  await bank.pay(payoutId, customerId, amount)
  return { status: 'paid' }
}
// #endregion patch-lock-read

// #region patch-lock-read-and-save
/** "Lock around the read and the save": safe too. The trade-off on the proof card says why the reserve still wins. */
export const withdrawLockReadAndSave: Withdraw = async (
  { store, bank },
  { customerId, amount, payoutId },
) => {
  if (!isValidAmount(amount)) return INVALID
  await store.loadCustomer(customerId)
  await store.lock(customerId)
  const available = await store.readAvailable(customerId)
  if (available < amount) {
    await store.unlock(customerId)
    return NOT_ENOUGH
  }
  await store.writeAvailable(customerId, available - amount)
  await store.unlock(customerId)
  await bank.pay(payoutId, customerId, amount)
  return { status: 'paid' }
}
// #endregion patch-lock-read-and-save
