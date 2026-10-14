import { describe, expect, test } from 'vitest'
import {
  BANK_FAULT,
  BANK_STATUS,
  FakeBank,
  MemoryPaymentsStore,
  moneyPicture,
  RECONCILE_ACTION,
  RECONCILE_FLAG,
  RESOLUTION,
  reconcile,
  resolveUnknownPayout,
  withdraw,
  withdrawV01,
} from '../../src/index.ts'
import { customerId, setUp } from './setup.ts'

describe('resolveUnknownPayout (after a bank timeout)', () => {
  test('settles the hold when the bank says it paid, and never pays again', async () => {
    const { ports, picture, bank } = setUp()
    bank.failNext(BANK_FAULT.TIMEOUT_AFTER_PAYING)
    await withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })
    await expect(resolveUnknownPayout(ports, 'p1')).resolves.toBe(RESOLUTION.PAID)
    expect(picture()).toMatchObject({ available: 2000, held: 0, paidOut: 8000, lost: 0 })
    expect(bank.payouts).toHaveLength(1)
  })

  test('keeps the money on hold when the bank says NOT_FOUND: that answer is not final', async () => {
    const { ports, picture, bank } = setUp()
    bank.failNext(BANK_FAULT.TIMEOUT_BEFORE_PAYING)
    await withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })
    await expect(resolveUnknownPayout(ports, 'p1')).resolves.toBe(RESOLUTION.STILL_UNKNOWN)
    expect(picture()).toMatchObject({ available: 2000, held: 8000, paidOut: 0, lost: 0 })
  })

  test('releases the money when the bank refused the payout', async () => {
    const { ports, picture, bank, store } = setUp()
    bank.failNext(BANK_FAULT.REFUSE)
    await store.reserve(customerId, 8000, 'p1')
    await bank.pay('p1', customerId, 8000)
    await expect(resolveUnknownPayout(ports, 'p1')).resolves.toBe(RESOLUTION.RELEASED)
    expect(picture()).toMatchObject({ available: 10000, held: 0, paidOut: 0, lost: 0 })
  })

  test('a blind retry after a timeout would pay twice at a bank without idempotency', async () => {
    const store = new MemoryPaymentsStore({ [customerId]: 20000 })
    const bank = new FakeBank({ idempotent: false })
    bank.failNext(BANK_FAULT.TIMEOUT_AFTER_PAYING)
    await withdraw({ store, bank }, { customerId, amount: 8000, payoutId: 'p1' })
    // The wrong clean-up: pay the same payout again instead of asking the bank.
    await bank.pay('p1', customerId, 8000)
    expect(bank.paidOut(customerId)).toBe(16000)
  })
})

describe('reconcile (the end-of-day job)', () => {
  test('settles a payout the bank paid, and leaves one the bank has not seen yet on hold', async () => {
    const store = new MemoryPaymentsStore({ [customerId]: 30000 })
    const bank = new FakeBank()
    const ports = { store, bank }
    bank.failNext(BANK_FAULT.TIMEOUT_AFTER_PAYING)
    await withdraw(ports, { customerId, amount: 8000, payoutId: 'p1' })
    bank.failNext(BANK_FAULT.TIMEOUT_BEFORE_PAYING)
    await withdraw(ports, { customerId, amount: 5000, payoutId: 'p2' })

    await expect(reconcile(store, bank)).resolves.toEqual([
      { payoutId: 'p1', amount: 8000, bank: BANK_STATUS.PAID, action: RECONCILE_ACTION.SETTLED },
      { payoutId: 'p2', amount: 5000, bank: BANK_STATUS.NOT_FOUND, action: RECONCILE_ACTION.LEFT_ON_HOLD },
    ])
    expect(moneyPicture(store, bank, customerId, 30000)).toMatchObject({ held: 5000, paidOut: 8000, lost: 0 })
  })

  test('releases what is still missing once the statement is final', async () => {
    const store = new MemoryPaymentsStore({ [customerId]: 30000 })
    const bank = new FakeBank()
    bank.failNext(BANK_FAULT.TIMEOUT_BEFORE_PAYING)
    await withdraw({ store, bank }, { customerId, amount: 5000, payoutId: 'p2' })
    await expect(reconcile(store, bank, { statementIsFinal: true })).resolves.toEqual([
      { payoutId: 'p2', amount: 5000, bank: BANK_STATUS.NOT_FOUND, action: RECONCILE_ACTION.RELEASED },
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
    expect(lines.map((line) => [line.payoutId, line.action, line.flag])).toEqual([
      ['a', RECONCILE_ACTION.FLAGGED, RECONCILE_FLAG.NOT_IN_OUR_BOOKS],
      ['b', RECONCILE_ACTION.FLAGGED, RECONCILE_FLAG.NOT_IN_OUR_BOOKS],
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
        bank: BANK_STATUS.PAID,
        action: RECONCILE_ACTION.FLAGGED,
        flag: RECONCILE_FLAG.PAID_MORE_THAN_ONCE,
      },
    ])
  })
})
