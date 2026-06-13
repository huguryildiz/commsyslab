// Ref: Proakis & Salehi §9.2 (Channel Capacity): BSC capacity C = 1 − H_b(ε) and the
// Shannon-Hartley AWGN capacity C = B·log2(1 + SNR). Bkz. docs/book-reference.md.
import { binaryEntropy } from './entropy';

/** Capacity of a binary symmetric channel with crossover probability ε: C = 1 − H_b(ε). */
export function bscCapacity(eps: number): number {
  return 1 - binaryEntropy(eps);
}

/** Shannon capacity of a band-limited AWGN channel: C = B·log2(1 + SNR), bits/s. */
export function shannonCapacity(bandwidthHz: number, snrLinear: number): number {
  return bandwidthHz * Math.log2(1 + snrLinear);
}

/** Capacity of the discrete-time AWGN channel: C = 0.5·log2(1 + P/Pn), bits/use. */
export function gaussianCapacity(P: number, Pn: number): number {
  return 0.5 * Math.log2(1 + P / Pn);
}

/** Convert an SNR in decibels to a linear power ratio. */
export function snrDbToLinear(db: number): number {
  return 10 ** (db / 10);
}
