import { FakeBank, MemoryPaymentsStore, moneyPicture, type PaymentPorts } from '../../src/index.ts'

export const customerId = '42'

/** A store with one customer, a fake bank, and the customer's money picture. */
export function setUp(opening = 10000) {
  const store = new MemoryPaymentsStore({ [customerId]: opening })
  const bank = new FakeBank()
  const ports: PaymentPorts = { store, bank }
  const picture = () => moneyPicture(store, bank, customerId, opening)
  return { store, bank, ports, picture }
}
