import type { Withdraw } from './withdraw.ts'

/*
 * Plausible-looking patches for build v0.1 that the game offers next to the real fix.
 * Two of them still lose money; the game proves it by running every order of events.
 */

// #region patch-check-twice
/** "Check the balance twice": the gap between reading and saving moves, but it does not close. */
export const withdrawCheckTwice: Withdraw = async ({ store, bank }, request) => {
  await store.loadCustomer(request.customerId)
  const first = await store.readAvailable(request.customerId)
  if (first < request.amount) return { status: 'refused', reason: 'not enough money' }
  const second = await store.readAvailable(request.customerId)
  if (second < request.amount) return { status: 'refused', reason: 'not enough money' }
  await store.writeAvailable(request.customerId, second - request.amount)
  await bank.pay(request.payoutId, request.customerId, request.amount)
  return { status: 'paid' }
}
// #endregion patch-check-twice

// #region patch-lock-read
/** "Lock only the read": the lock is released before the save, so the race is still open. */
export const withdrawLockRead: Withdraw = async ({ store, bank }, request) => {
  await store.loadCustomer(request.customerId)
  await store.lock(request.customerId)
  const available = await store.readAvailable(request.customerId)
  await store.unlock(request.customerId)
  if (available < request.amount) return { status: 'refused', reason: 'not enough money' }
  await store.writeAvailable(request.customerId, available - request.amount)
  await bank.pay(request.payoutId, request.customerId, request.amount)
  return { status: 'paid' }
}
// #endregion patch-lock-read

// #region patch-lock-read-and-save
/** "Lock around the read and the save": safe, but simpler only on one server (see the trade-off). */
export const withdrawLockReadAndSave: Withdraw = async ({ store, bank }, request) => {
  await store.loadCustomer(request.customerId)
  await store.lock(request.customerId)
  const available = await store.readAvailable(request.customerId)
  if (available < request.amount) {
    await store.unlock(request.customerId)
    return { status: 'refused', reason: 'not enough money' }
  }
  await store.writeAvailable(request.customerId, available - request.amount)
  await store.unlock(request.customerId)
  await bank.pay(request.payoutId, request.customerId, request.amount)
  return { status: 'paid' }
}
// #endregion patch-lock-read-and-save
