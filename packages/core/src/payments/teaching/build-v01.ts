import { REFUSAL } from '../codes.ts'
import { isValidAmount } from '../ports.ts'
import { PAID, refused, type Withdraw } from '../withdraw.ts'

/*
 * Teaching code: the naive withdrawal the game attacks first. Never used outside the game and its tests.
 */

// #region build-v0.1
/**
 * Build v0.1, the naive withdrawal. It checks the balance, so it looks safe.
 * But two copies running at once can both read the old balance before either saves.
 */
export const withdrawV01: Withdraw = async ({ store, bank }, { customerId, amount, payoutId }) => {
  const amountIsValid = isValidAmount(amount)
  if (!amountIsValid) return refused(REFUSAL.INVALID_AMOUNT)
  await store.loadCustomer(customerId)
  const available = await store.readAvailable(customerId)
  if (available < amount) return refused(REFUSAL.INSUFFICIENT_FUNDS)
  await store.writeAvailable(customerId, available - amount)
  await bank.pay(payoutId, customerId, amount)
  return PAID
}
// #endregion build-v0.1
