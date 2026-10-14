/** Money is always a whole number of minor units (cents), never a floating-point number. */
export type Cents = number

/** Checks that a value is a safe whole number of cents. */
export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) throw new RangeError(`Not a whole number of cents: ${value}`)
  return value
}

/** 10000 → "100.00", -2550 → "-25.50". */
export function formatCents(value: Cents): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(cents(value))
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}
