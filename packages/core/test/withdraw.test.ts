import { describe, expect, test } from 'vitest'
import {
  FakeBank,
  MemoryPaymentsStore,
  moneyPicture,
  type PaymentPorts,
  resolveUnknownPayout,
  withdraw,
  withdrawV01,
} from '../src/index.ts'

const customerId = '42'

function setUp(opening = 10000) {
  const store = new MemoryPaymentsStore({ [customerId]: opening })
  const bank = new FakeBank()
  const ports: PaymentPorts = { store, bank }
  const picture = () => moneyPicture(store, bank, customerId, opening)
  return { store, bank, ports, picture }
}

describe('withdraw (build v1: reserve, then settle)', () => {
  test('pays out and settles the hold', async () => {
    const { ports, picture, store } = setUp()
    await expect(withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })).resolves.toEqual({
      status: 'paid',
    })
    expect(picture()).toMatchObject({ available: 2000, held: 0, paidOut: 8000, lost: 0 })
    expect(store.ledger.problems()).toEqual([])
  })

  test('refuses when the money is not there', async () => {
    const { ports, picture } = setUp(5000)
    await expect(withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })).resolves.toMatchObject({
      status: 'refused',
    })
    expect(picture()).toMatchObject({ available: 5000, paidOut: 0, lost: 0 })
  })

  test('releases the hold when the bank refuses', async () => {
    const { ports, picture, bank } = setUp()
    bank.failNext('refuse')
    await expect(withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })).resolves.toMatchObject({
      status: 'refused',
    })
    expect(picture()).toMatchObject({ available: 10000, held: 0, paidOut: 0, lost: 0 })
  })

  test('keeps the hold when the bank times out, and resolves it by asking, not by paying again', async () => {
    const { ports, picture, bank } = setUp()
    bank.failNext('timeout-after-paying')
    await expect(withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })).resolves.toEqual({
      status: 'unknown',
    })
    expect(picture()).toMatchObject({ available: 2000, held: 8000, paidOut: 8000 })

    await expect(resolveUnknownPayout(ports, 'p1')).resolves.toBe('paid')
    expect(picture()).toMatchObject({ available: 2000, held: 0, paidOut: 8000, lost: 0 })
    expect(bank.payouts).toHaveLength(1)
  })

  test('gives the money back when the bank timed out before paying', async () => {
    const { ports, picture, bank } = setUp()
    bank.failNext('timeout-before-paying')
    await withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })
    await expect(resolveUnknownPayout(ports, 'p1')).resolves.toBe('released')
    expect(picture()).toMatchObject({ available: 10000, held: 0, paidOut: 0, lost: 0 })
  })

  test('a blind retry after a timeout would pay twice at a bank without idempotency', async () => {
    const store = new MemoryPaymentsStore({ [customerId]: 20000 })
    const bank = new FakeBank({ idempotent: false })
    bank.failNext('timeout-after-paying')
    await withdraw({ store, bank }, { customerId, amount: 8000, payoutId: 'p1' })
    // The wrong clean-up: pay the same payout again instead of asking the bank.
    await bank.pay('p1', customerId, 8000)
    expect(bank.paidOut(customerId)).toBe(16000)
  })
})

describe('withdrawV01 (build v0.1, naive)', () => {
  test('works when requests do not overlap', async () => {
    const { ports, picture } = setUp()
    await withdrawV01(ports, { customerId, amount: 8000, payoutId: 'p1' })
    await expect(withdrawV01(ports, { customerId, amount: 8000, payoutId: 'p2' })).resolves.toMatchObject({
      status: 'refused',
    })
    expect(picture()).toMatchObject({ available: 2000, paidOut: 8000, lost: 0 })
  })
})
