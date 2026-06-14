// Ref: Proakis & Salehi §9.4.2 ("The Promise of Coding") + §9.5.1/§9.6 BER bounds + §9.2.1 Shannon
// limit. Aggregates analytic BER-vs-Eb/N0 bounds for the module's codes to quantify coding gain and
// the gap to capacity. Pure; reuses existing bounds (block, convolutional, capacity).
import { uncodedBerBpsk } from './blockcodes';
import { convBerSoftBound, BOOK_CODE } from './convcodes';
import { shannonLimitEbN0MinDb } from './capacity';
import { qfunc } from './math';

/** C(n,k) via a numerically gentle product. */
function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

/**
 * Hard-decision t-error-correcting (n,k) block code BER (bounded-distance decoding):
 * p = Q(√(2·R_c·Eb/N0)), R_c=k/n; P_b ≈ (1/n)·Σ_{i=t+1}^{n} i·C(n,i)·pⁱ(1−p)^{n−i}. §9.5.1
 */
export function blockBerHardBound(n: number, k: number, t: number, ebN0Db: number): number {
  const Rc = k / n;
  const p = qfunc(Math.sqrt(2 * Rc * 10 ** (ebN0Db / 10)));
  let pb = 0;
  for (let i = t + 1; i <= n; i++) pb += (i / n) * binom(n, i) * p ** i * (1 - p) ** (n - i);
  return pb;
}

/**
 * Reed-Solomon (N,K) over GF(2^m) hard-decision BER. Channel bit error p=Q(√(2·R_c·Eb/N0)),
 * R_c=K/N; symbol error P_s=1−(1−p)^m; decoder corrects t=⌊(N−K)/2⌋ symbols; output symbol error
 * P_se ≈ (1/N)·Σ_{i=t+1}^{N} i·C(N,i)·P_sⁱ(1−P_s)^{N−i}; bit error ≈ P_se·2^{m−1}/(2^m−1). §9.6
 */
export function rsBerBound(N: number, K: number, m: number, ebN0Db: number): number {
  const Rc = K / N;
  const p = qfunc(Math.sqrt(2 * Rc * 10 ** (ebN0Db / 10)));
  const Ps = 1 - (1 - p) ** m;
  const t = Math.floor((N - K) / 2);
  let pse = 0;
  for (let i = t + 1; i <= N; i++) pse += (i / N) * binom(N, i) * Ps ** i * (1 - Ps) ** (N - i);
  return pse * (2 ** (m - 1) / (2 ** m - 1));
}

/**
 * Binary search for the Eb/N0 (dB) at which `berFn` hits `targetBer`. Assumes `berFn` is
 * monotone-decreasing in dB. Returns `hi` if unreachable in [lo,hi], `lo` if already met at lo.
 */
export function requiredEbN0ForBer(
  berFn: (ebN0Db: number) => number,
  targetBer: number,
  lo = -2,
  hi = 12,
): number {
  if (berFn(hi) > targetBer) return hi; // never reaches target in range
  if (berFn(lo) <= targetBer) return lo; // already met at the low end
  for (let it = 0; it < 60; it++) {
    const mid = (lo + hi) / 2;
    if (berFn(mid) > targetBer) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** A curve in the comparison: a labelled code with its rate, CHART color key, and BER bound. */
export interface ComparisonCode {
  id: string;
  label: string;
  rate: number;
  color: 'green' | 'orange' | 'blue' | 'pink' | 'red';
  ber: (ebN0Db: number) => number;
}

/** Fixed representative set (§9.4.2). uncoded first (the reference). */
export const COMPARISON_CODES: ComparisonCode[] = [
  { id: 'uncoded', label: 'Uncoded BPSK', rate: 1, color: 'green', ber: uncodedBerBpsk },
  {
    id: 'hamming74',
    label: 'Hamming (7,4) hard',
    rate: 4 / 7,
    color: 'orange',
    ber: (db) => blockBerHardBound(7, 4, 1, db),
  },
  {
    id: 'conv_soft',
    label: 'Convolutional (2,1,3) soft',
    rate: 1 / 2,
    color: 'blue',
    ber: (db) => convBerSoftBound(BOOK_CODE, db),
  },
  {
    id: 'bch155',
    label: 'BCH (15,5) hard',
    rate: 5 / 15,
    color: 'pink',
    ber: (db) => blockBerHardBound(15, 5, 3, db),
  },
  {
    id: 'rs1511',
    label: 'Reed-Solomon (15,11) hard',
    rate: 11 / 15,
    color: 'red',
    ber: (db) => rsBerBound(15, 11, 4, db),
  },
];

/** Coding gain (dB) vs uncoded BPSK at the target BER. §9.4.2 */
export function codingGainDb(code: ComparisonCode, targetBer: number): number {
  const uncoded = COMPARISON_CODES[0];
  return requiredEbN0ForBer(uncoded.ber, targetBer) - requiredEbN0ForBer(code.ber, targetBer);
}

/** Gap (dB) between a code's required Eb/N0 and the Shannon limit at its rate. §9.2.1 */
export function shannonGapDb(code: ComparisonCode, targetBer: number): number {
  return requiredEbN0ForBer(code.ber, targetBer) - shannonLimitEbN0MinDb(code.rate);
}
