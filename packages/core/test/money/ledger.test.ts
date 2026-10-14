import { describe, expect, test } from 'vitest'
import { formatCents, Ledger } from '../../src/index.ts'

describe('Ledger', () => {
  test('a balanced transaction moves money between accounts', () => {
    const ledger = new Ledger()
    ledger.post({
      id: 't1',
      kind: 'RESERVE',
      entries: [
        { account: 'customer:42:available', amount: -8000 },
        { account: 'customer:42:held', amount: 8000 },
      ],
    })
    expect(ledger.balance('customer:42:available')).toBe(-8000)
    expect(ledger.balance('customer:42:held')).toBe(8000)
    expect(ledger.problems()).toEqual([])
  })

  test('refuses a transaction that does not sum to zero', () => {
    const ledger = new Ledger()
    expect(() =>
      ledger.post({
        id: 't1',
        kind: 'BROKEN',
        entries: [
          { account: 'a', amount: -100 },
          { account: 'b', amount: 99 },
        ],
      }),
    ).toThrow(/does not sum to zero/)
    expect(ledger.transactions()).toHaveLength(0)
  })

  test('refuses the same transaction twice', () => {
    const ledger = new Ledger()
    const transaction = {
      id: 't1',
      kind: 'ONCE',
      entries: [
        { account: 'a', amount: -1 },
        { account: 'b', amount: 1 },
      ],
    }
    ledger.post(transaction)
    expect(() => ledger.post(transaction)).toThrow(/already posted/)
  })

  test('refuses fractions of a cent', () => {
    const ledger = new Ledger()
    expect(() =>
      ledger.post({
        id: 't1',
        kind: 'FLOAT',
        entries: [
          { account: 'a', amount: -0.1 },
          { account: 'b', amount: 0.1 },
        ],
      }),
    ).toThrow(/whole number of cents/)
  })
})

test('formatCents shows two decimals', () => {
  expect(formatCents(10000)).toBe('100.00')
  expect(formatCents(-2550)).toBe('-25.50')
  expect(formatCents(5)).toBe('0.05')
})
