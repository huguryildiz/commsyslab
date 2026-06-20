/**
 * PN-sequence generation: m-sequences (via LFSR), their balance/autocorrelation
 * properties, and Gold codes from preferred pairs.
 * Proakis & Salehi §15.4 "Generation of PN Sequences", p.840.
 *
 * m-sequences have an ideal two-valued "thumbtack" autocorrelation but very few
 * exist for a given length, and pairwise cross-correlations can be large. Gold
 * codes trade a slightly worse autocorrelation for a *bounded* three-valued
 * cross-correlation across a large family — the property that lets many CDMA
 * users share a band. Reuses {@link mSequence}/{@link pnAutocorrelation} from
 * `spread.ts`; this module adds the Gold-code construction.
 */

// Preferred-pair feedback polynomials (tap = exponent of each non-constant term),
// one maximal-length pair per register length. Each polynomial is primitive and
// the pair is a documented Gold "preferred pair" yielding three-valued cross-
// correlation. Octal forms in comments.
const PREFERRED_PAIRS: Record<number, { a: number[]; b: number[] }> = {
  5: { a: [5, 2], b: [5, 4, 3, 2] }, // 45 & 75
  6: { a: [6, 1], b: [6, 5, 2, 1] }, // 103 & 147
  7: { a: [7, 3], b: [7, 3, 2, 1] }, // 211 & 217
};

/**
 * Fibonacci LFSR m-sequence of period 2^n−1 from an explicit tap list (exponents
 * of the feedback polynomial), returned as ±1 chips. Mirrors the convention in
 * `spread.ts`: output is the last stage, feedback is the XOR of the tapped stages.
 */
export function lfsr(taps: number[], n: number): number[] {
  const N = (1 << n) - 1;
  const reg = new Array<number>(n).fill(0);
  reg[0] = 1; // any nonzero initial state
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    out.push(reg[n - 1] === 1 ? 1 : -1);
    let fb = 0;
    for (const tp of taps) fb ^= reg[tp - 1];
    for (let j = n - 1; j > 0; j--) reg[j] = reg[j - 1];
    reg[0] = fb;
  }
  return out;
}

// m-sequence feedback polynomials (match `spread.ts` so displayed states and
// sequence agree), one primitive polynomial per register length.
const M_TAPS: Record<number, number[]> = {
  5: [5, 2],
  6: [6, 1],
  7: [7, 1],
};

/**
 * m-sequence together with the register snapshot taken just before each output
 * chip — used to animate the LFSR. `states[i]` is the n-bit register at step i.
 */
export function mSequenceStates(n: number): { seq: number[]; states: number[][] } {
  const taps = M_TAPS[n];
  if (!taps) throw new Error(`mSequenceStates: unsupported n=${n} (use 5..7)`);
  const N = (1 << n) - 1;
  const reg = new Array<number>(n).fill(0);
  reg[0] = 1;
  const seq: number[] = [];
  const states: number[][] = [];
  for (let i = 0; i < N; i++) {
    states.push([...reg]);
    seq.push(reg[n - 1] === 1 ? 1 : -1);
    let fb = 0;
    for (const tp of taps) fb ^= reg[tp - 1];
    for (let j = n - 1; j > 0; j--) reg[j] = reg[j - 1];
    reg[0] = fb;
  }
  return { seq, states };
}

/** The m-sequence feedback taps used for register length n (for display). */
export function mSequenceTaps(n: number): number[] {
  const taps = M_TAPS[n];
  if (!taps) throw new Error(`mSequenceTaps: unsupported n=${n} (use 5..7)`);
  return [...taps];
}

/** Count of +1 vs −1 chips. An m-sequence has exactly one more +1 than −1. */
export function balance(seq: number[]): { ones: number; zeros: number } {
  let ones = 0;
  for (const c of seq) if (c > 0) ones++;
  return { ones, zeros: seq.length - ones };
}

/** The preferred pair of m-sequences (as ±1) for register length n (5, 6, 7). */
export function goldPair(n: number): { a: number[]; b: number[] } {
  const p = PREFERRED_PAIRS[n];
  if (!p) throw new Error(`goldPair: no preferred pair for n=${n} (use 5..7)`);
  return { a: lfsr(p.a, n), b: lfsr(p.b, n) };
}

/** Cyclically left-shift a sequence by `k`. */
function cyclicShift(seq: number[], k: number): number[] {
  const N = seq.length;
  const s = ((k % N) + N) % N;
  return seq.map((_, i) => seq[(i + s) % N]);
}

/** Multiply two ±1 chips as a logical XOR (−1·−1 = +1, etc.). */
function xorPm(a: number, b: number): number {
  return a * b;
}

/**
 * A Gold code from the preferred pair for register length n: a ⊕ T^shift(b),
 * returned as ±1, period 2^n−1. shift = 0 … 2^n−2 selects a family member;
 * the pair members themselves (a, b) complete the family of 2^n+1 codes.
 * Proakis §15.4.
 */
export function goldCode(n: number, shift: number): number[] {
  const { a, b } = goldPair(n);
  const bShift = cyclicShift(b, shift);
  return a.map((ai, i) => xorPm(ai, bShift[i]));
}

/** Periodic cross-correlation R(k) = Σ_i a_i · b_{(i+k) mod N}, length N. */
export function crossCorrelation(a: number[], b: number[]): number[] {
  const N = a.length;
  const out = new Array<number>(N).fill(0);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let i = 0; i < N; i++) sum += a[i] * b[(i + k) % N];
    out[k] = sum;
  }
  return out;
}

/**
 * The three values the Gold cross-correlation can take: {−1, −t(n), t(n)−2},
 * with t(n) = 1 + 2^⌊(n+2)/2⌋. e.g. n=5 → {−9, −1, 7}. Proakis §15.4.
 */
export function goldThreeValuedSet(n: number): number[] {
  const t = 1 + 2 ** Math.floor((n + 2) / 2);
  return [-1, -t, t - 2];
}
