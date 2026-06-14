// Ref: Proakis & Salehi §9.8.2 (Concatenated Codes, Fig. 9.36, Eq. 9.8.1) + §9.10.1 (deep-space).
// Serial concatenation: outer Reed-Solomon + inner convolutional (Viterbi). This module supplies
// the composition algebra, the interleaver burst-spreading model, and an illustrative composed
// BER bound; the inner/outer DSP itself is reused from convcodes/reedsolomon.
import { convBerSoftBound, BOOK_CODE } from './convcodes';

/** Concatenated code rate Rcc = Rc_outer · rc_inner. Eq. 9.8.1 */
export function concatRate(rcOuter: number, rcInner: number): number {
  return rcOuter * rcInner;
}

/** Concatenated minimum distance = product of the two codes' minimum distances. §9.8.2 */
export function concatDmin(dOuter: number, dInner: number): number {
  return dOuter * dInner;
}

/**
 * Symbol-error counts per RS codeword for a length-`burstLen` burst over a `depth × N` block.
 * Transmission position p → codeword: interleaved (column-major) p % depth; plain (row-major)
 * ⌊p/N⌋. A burst of consecutive transmitted symbols thus spreads to ≤⌈burstLen/depth⌉ per codeword
 * when interleaved, or piles into a single codeword when not. §9.8.2 (interleaving for bursts)
 */
export function burstErrorsPerCodeword(
  N: number,
  depth: number,
  burstStart: number,
  burstLen: number,
  interleaved: boolean,
): number[] {
  const counts = new Array<number>(depth).fill(0);
  for (let p = burstStart; p < burstStart + burstLen; p++) {
    if (p < 0 || p >= depth * N) continue;
    const cw = interleaved ? p % depth : Math.floor(p / N);
    if (cw < depth && counts[cw] < N) counts[cw]++;
  }
  return counts;
}

/** True iff every RS codeword's symbol-error count is within the correction radius t. §9.6 */
export function isCorrectable(errCounts: number[], t: number): boolean {
  return errCounts.every((c) => c <= t);
}

/** C(n,k) via a numerically gentle product. */
function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

/**
 * Illustrative composed output BER (assumes ideal interleaving → independent symbol errors):
 * inner decoded bit error p = convBerSoftBound(inner, Eb/N0); outer RS(N,K) over GF(2^m) sees
 * symbol error P_s=1−(1−p)^m and corrects t=⌊(N−K)/2⌋; output bit error from the RS symbol-error
 * union bound. Not an exact concatenated-system analysis — a teaching curve. §9.8.2
 */
export function concatOutputBer(ebN0Db: number, N: number, K: number, m: number): number {
  const p = convBerSoftBound(BOOK_CODE, ebN0Db);
  const Ps = 1 - (1 - p) ** m;
  const t = Math.floor((N - K) / 2);
  let pse = 0;
  for (let i = t + 1; i <= N; i++) pse += (i / N) * binom(N, i) * Ps ** i * (1 - Ps) ** (N - i);
  return pse * (2 ** (m - 1) / (2 ** m - 1));
}
