import { withdrawV01 } from './teaching/build-v01.ts'
import { type Withdraw, withdraw } from './withdraw.ts'

/** Named defences. The game's "build v0.1" and the CI defence check both switch these off. */
export interface PaymentDefences {
  readonly atomicReserve: boolean
}

export const ALL_DEFENCES: PaymentDefences = { atomicReserve: true }

export function withdrawWith(defences: PaymentDefences): Withdraw {
  return defences.atomicReserve ? withdraw : withdrawV01
}
