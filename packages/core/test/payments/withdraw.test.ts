import { describe, expect, test } from 'vitest'
import { BANK_FAULT, PAID, REFUSAL, refused, UNKNOWN, withdraw, withdrawV01 } from '../../src/index.ts'
import { customerId, setUp } from './setup.ts'

describe('withdraw (build v1: reserve, then settle)', () => {
  test('pays out and settles the hold', async () => {
    const { ports, picture, store } = setUp()
    await expect(withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })).resolves.toEqual(PAID)
    expect(picture()).toMatchObject({ available: 2000, held: 0, paidOut: 8000, lost: 0 })
    expect(store.ledger.problems()).toEqual([])
  })

  test('refuses when the money is not there', async () => {
    const { ports, picture } = setUp(5000)
    await expect(withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })).resolves.toEqual(
      refused(REFUSAL.INSUFFICIENT_FUNDS),
    )
    expect(picture()).toMatchObject({ available: 5000, paidOut: 0, lost: 0 })
  })

  test('releases the hold when the bank refuses', async () => {
    const { ports, picture, bank } = setUp()
    bank.failNext(BANK_FAULT.REFUSE)
    await expect(withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })).resolves.toEqual(
      refused(REFUSAL.BANK_REFUSED),
    )
    expect(picture()).toMatchObject({ available: 10000, held: 0, paidOut: 0, lost: 0 })
  })

  test('keeps the money on hold when the bank times out', async () => {
    const { ports, picture, bank } = setUp()
    bank.failNext(BANK_FAULT.TIMEOUT_AFTER_PAYING)
    await expect(withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })).resolves.toEqual(UNKNOWN)
    expect(picture()).toMatchObject({ available: 2000, held: 8000, paidOut: 8000 })
  })

  test('a repeated payout ID gets the first answer, and no money moves twice', async () => {
    const { ports, picture, bank } = setUp(20000)
    const request = { customerId, amount: 8000, payoutId: 'same' }
    await withdraw(ports, request)
    await expect(withdraw(ports, request)).resolves.toEqual(PAID)
    expect(picture()).toMatchObject({ available: 12000, held: 0, paidOut: 8000, lost: 0 })
    expect(bank.payouts).toHaveLength(1)
  })

  test('the same payout ID with a different amount is refused and changes nothing', async () => {
    const { ports, picture } = setUp(20000)
    await withdraw(ports, { customerId, amount: 8000, payoutId: 'same' })
    await expect(withdraw(ports, { customerId, amount: 5000, payoutId: 'same' })).resolves.toEqual(
      refused(REFUSAL.PAYOUT_ID_REUSED),
    )
    expect(picture()).toMatchObject({ available: 12000, paidOut: 8000, lost: 0 })
  })

  test.each([0, -8000, 0.5])('refuses an amount of %s and changes nothing', async (amount) => {
    const { ports, picture } = setUp()
    await expect(withdraw(ports, { customerId, amount, payoutId: 'p1' })).resolves.toEqual(
      refused(REFUSAL.INVALID_AMOUNT),
    )
    expect(picture()).toMatchObject({ available: 10000, paidOut: 0, lost: 0 })
  })
})

describe('withdrawV01 (build v0.1, naive)', () => {
  test('works when requests do not overlap', async () => {
    const { ports, picture } = setUp()
    await withdrawV01(ports, { customerId, amount: 8000, payoutId: 'p1' })
    await expect(withdrawV01(ports, { customerId, amount: 8000, payoutId: 'p2' })).resolves.toEqual(
      refused(REFUSAL.INSUFFICIENT_FUNDS),
    )
    expect(picture()).toMatchObject({ available: 2000, paidOut: 8000, lost: 0 })
  })
})
