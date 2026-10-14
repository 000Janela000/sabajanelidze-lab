import { describe, expect, test } from 'vitest'
import {
  FakeBank,
  MemoryPaymentsStore,
  moneyPicture,
  type PaymentPorts,
  reconcile,
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

  test('keeps the money on hold when the bank says "not found": that answer is not final', async () => {
    const { ports, picture, bank } = setUp()
    bank.failNext('timeout-before-paying')
    await withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })
    await expect(resolveUnknownPayout(ports, 'p1')).resolves.toBe('still unknown')
    expect(picture()).toMatchObject({ available: 2000, held: 8000, paidOut: 0, lost: 0 })
  })

  test('releases the money when the bank refused the payout', async () => {
    const { ports, picture, bank, store } = setUp()
    bank.failNext('refuse')
    await store.reserve(customerId, 8000, 'p1')
    await bank.pay('p1', customerId, 8000)
    await expect(resolveUnknownPayout(ports, 'p1')).resolves.toBe('released')
    expect(picture()).toMatchObject({ available: 10000, held: 0, paidOut: 0, lost: 0 })
  })

  test('a repeated payout ID gets the first answer, and no money moves twice', async () => {
    const { ports, picture, bank } = setUp(20000)
    const request = { customerId, amount: 8000, payoutId: 'same' }
    await withdraw(ports, request)
    await expect(withdraw(ports, request)).resolves.toEqual({ status: 'paid' })
    expect(picture()).toMatchObject({ available: 12000, held: 0, paidOut: 8000, lost: 0 })
    expect(bank.payouts).toHaveLength(1)
  })

  test('the same payout ID with a different amount is refused and changes nothing', async () => {
    const { ports, picture } = setUp(20000)
    await withdraw(ports, { customerId, amount: 8000, payoutId: 'same' })
    await expect(withdraw(ports, { customerId, amount: 5000, payoutId: 'same' })).resolves.toMatchObject({
      status: 'refused',
      reason: 'this payout ID was already used for a different withdrawal',
    })
    expect(picture()).toMatchObject({ available: 12000, paidOut: 8000, lost: 0 })
  })

  test.each([0, -8000, 0.5])('refuses an amount of %s and changes nothing', async (amount) => {
    const { ports, picture } = setUp()
    await expect(withdraw(ports, { customerId, amount, payoutId: 'p1' })).resolves.toMatchObject({
      status: 'refused',
      reason: 'the amount must be more than zero',
    })
    expect(picture()).toMatchObject({ available: 10000, paidOut: 0, lost: 0 })
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

describe('reconcile (the end-of-day job)', () => {
  test('settles a payout the bank paid, and leaves one the bank has not seen yet on hold', async () => {
    const store = new MemoryPaymentsStore({ [customerId]: 30000 })
    const bank = new FakeBank()
    const ports = { store, bank }
    bank.failNext('timeout-after-paying')
    await withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })
    bank.failNext('timeout-before-paying')
    await withdraw(ports, { customerId, amount: 5000, payoutId: 'p2' })

    await expect(reconcile(store, bank)).resolves.toEqual([
      { payoutId: 'p1', amount: 8000, bank: 'paid', action: 'settled' },
      { payoutId: 'p2', amount: 5000, bank: 'not found', action: 'left on hold' },
    ])
    expect(moneyPicture(store, bank, customerId, 30000)).toMatchObject({ held: 5000, paidOut: 8000, lost: 0 })
  })

  test('releases what is still missing once the statement is final', async () => {
    const store = new MemoryPaymentsStore({ [customerId]: 30000 })
    const bank = new FakeBank()
    bank.failNext('timeout-before-paying')
    await withdraw({ store, bank }, { customerId, amount: 5000, payoutId: 'p2' })
    await expect(reconcile(store, bank, { statementIsFinal: true })).resolves.toEqual([
      { payoutId: 'p2', amount: 5000, bank: 'not found', action: 'released' },
    ])
    expect(moneyPicture(store, bank, customerId, 30000)).toMatchObject({ available: 30000, held: 0, lost: 0 })
  })

  test('flags the double payout of build v0.1: two bank payouts our books cannot explain', async () => {
    const store = new MemoryPaymentsStore({ [customerId]: 10000 })
    const bank = new FakeBank()
    const ports = { store, bank }
    // Both requests read 100 before either saves.
    await Promise.all([
      withdrawV01(ports, { customerId, amount: 8000, payoutId: 'a' }),
      withdrawV01(ports, { customerId, amount: 8000, payoutId: 'b' }),
    ])
    const lines = await reconcile(store, bank)
    expect(lines.map((line) => [line.payoutId, line.action, line.note])).toEqual([
      ['a', 'flagged', 'paid by the bank, but not in our books'],
      ['b', 'flagged', 'paid by the bank, but not in our books'],
    ])
  })

  test('flags a payout the bank paid twice', async () => {
    const store = new MemoryPaymentsStore({ [customerId]: 20000 })
    const bank = new FakeBank({ idempotent: false })
    await withdraw({ store, bank }, { customerId, amount: 8000, payoutId: 'p1' })
    await bank.pay('p1', customerId, 8000)
    await expect(reconcile(store, bank)).resolves.toEqual([
      {
        payoutId: 'p1',
        amount: 8000,
        bank: 'paid more than once',
        action: 'flagged',
        note: 'the bank paid this payout more than once',
      },
    ])
  })
})
