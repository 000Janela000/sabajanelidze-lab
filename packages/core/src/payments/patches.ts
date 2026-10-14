import type { Withdraw } from './withdraw.ts'

/*
 * Plausible-looking patches for build v0.1 that the game offers next to the real fix.
 * Two of them still lose money; the game proves it by running every order of events.
 */

// #region patch-check-twice
/** "Check the balance twice": the gap between reading and saving moves, but it does not close. */
export const withdrawCheckTwice: Withdraw = async ({ store, bank }, { customerId, amount, payoutId }) => {
  await store.loadCustomer(customerId)
  const first = await store.readAvailable(customerId)
  if (first < amount) return { status: 'refused', reason: 'not enough money' }
  const second = await store.readAvailable(customerId)
  if (second < amount) return { status: 'refused', reason: 'not enough money' }
  await store.writeAvailable(customerId, second - amount)
  await bank.pay(payoutId, customerId, amount)
  return { status: 'paid' }
}
// #endregion patch-check-twice

// #region patch-lock-read
/** "Lock only the read": the lock is released before the save, so the race is still open. */
export const withdrawLockRead: Withdraw = async ({ store, bank }, { customerId, amount, payoutId }) => {
  await store.loadCustomer(customerId)
  await store.lock(customerId)
  const available = await store.readAvailable(customerId)
  await store.unlock(customerId)
  if (available < amount) return { status: 'refused', reason: 'not enough money' }
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
  await store.loadCustomer(customerId)
  await store.lock(customerId)
  const available = await store.readAvailable(customerId)
  if (available < amount) {
    await store.unlock(customerId)
    return { status: 'refused', reason: 'not enough money' }
  }
  await store.writeAvailable(customerId, available - amount)
  await store.unlock(customerId)
  await bank.pay(payoutId, customerId, amount)
  return { status: 'paid' }
}
// #endregion patch-lock-read-and-save
