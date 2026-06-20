// Ref: Proakis & Salehi §9.5 (Linear Block Codes) & §9.5.1 (Decoding & Performance).
// GF(2): all entries are 0/1, all sums are modulo 2. Matrices are row-major number[][].
import { qfunc } from './math';

export interface LinearCode {
  id: string;
  label: string;
  n: number;
  k: number;
  G: number[][]; // k×n systematic [I_k | P]
  H: number[][]; // (n−k)×n systematic [Pᵀ | I_{n−k}]
  dmin: number;
}

/** Hamming weight (number of 1s). §9.5 Def. 9.5.4. */
export function weight(v: number[]): number {
  let w = 0;
  for (const b of v) w += b & 1;
  return w;
}

/** Hamming distance d(a,b) = weight(a ⊕ b). §9.5 Def. 9.5.2. */
export function hammingDistance(a: number[], b: number[]): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += (a[i] ^ b[i]) & 1;
  return d;
}

/** Encode message x (length k) → codeword c = xG mod 2 (length n). §9.5 Eq. 9.5.8. */
export function encode(x: number[], G: number[][]): number[] {
  const n = G[0].length;
  const c = new Array<number>(n).fill(0);
  for (let i = 0; i < x.length; i++) {
    if (x[i] & 1) for (let j = 0; j < n; j++) c[j] ^= G[i][j];
  }
  return c;
}

/** Syndrome s = rHᵀ mod 2 (length n−k). §9.5 Eq. 9.5.11. */
export function syndrome(r: number[], H: number[][]): number[] {
  return H.map((row) => {
    let s = 0;
    for (let j = 0; j < r.length; j++) s ^= row[j] & r[j];
    return s & 1;
  });
}

/** All 2^k codewords (rows over every length-k message). §9.5. */
export function allCodewords(G: number[][]): number[][] {
  const k = G.length;
  const out: number[][] = [];
  for (let m = 0; m < 1 << k; m++) {
    const x = new Array<number>(k);
    for (let i = 0; i < k; i++) x[i] = (m >> (k - 1 - i)) & 1;
    out.push(encode(x, G));
  }
  return out;
}

/** Minimum distance = minimum nonzero codeword weight (= d_min for linear codes, Thm 9.5.1). */
export function minDistance(G: number[][]): number {
  let dmin = Infinity;
  for (const c of allCodewords(G)) {
    const w = weight(c);
    if (w > 0 && w < dmin) dmin = w;
  }
  return dmin;
}

/** Error-correction capability t = ⌊(d_min − 1)/2⌋. §9.5.1. */
export function errorCorrectionT(dmin: number): number {
  return Math.floor((dmin - 1) / 2);
}

/** Error-detection capability e_d = d_min − 1 (no correction). Book §13.2.3 Eq. 13.2.40. */
export function errorDetectionD(dmin: number): number {
  return dmin - 1;
}

/**
 * Correct/detect trade-off boundary (Book §13.2.3 Fig. 13.6): for each correctable count
 * e_c = 0…⌊(d_min−1)/2⌋, the max simultaneously-detectable e_d = d_min − 1 − e_c, kept while
 * e_d ≥ e_c. Decoding can correct ≤ e_c and detect ≤ e_d errors when e_c + e_d ≤ d_min − 1.
 */
export function correctDetectPairs(dmin: number): { ec: number; ed: number }[] {
  const tMax = errorCorrectionT(dmin);
  const pairs: { ec: number; ed: number }[] = [];
  for (let ec = 0; ec <= tMax; ec++) {
    const ed = dmin - 1 - ec;
    if (ed >= ec) pairs.push({ ec, ed });
  }
  return pairs;
}

/**
 * Build a systematic (2^m−1, 2^m−m−1) Hamming code: H=[Pᵀ|I_m], G=[I_k|P]. §9.5 Eq. 9.5.15.
 * Pᵀ columns are the weight≥2 nonzero m-vectors (in value order); the last m columns are I_m.
 */
export function makeHamming(m: number): { G: number[][]; H: number[][]; n: number; k: number } {
  const n = (1 << m) - 1;
  const k = n - m;
  const heavy: number[][] = []; // weight ≥ 2 columns → Pᵀ
  for (let v = 1; v <= n; v++) {
    const col = new Array<number>(m);
    for (let i = 0; i < m; i++) col[i] = (v >> (m - 1 - i)) & 1;
    if (weight(col) >= 2) heavy.push(col);
  }
  const H: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row: number[] = [];
    for (const col of heavy) row.push(col[i]); // Pᵀ part
    for (let j = 0; j < m; j++) row.push(i === j ? 1 : 0); // I_m part
    H.push(row);
  }
  const G: number[][] = [];
  for (let i = 0; i < k; i++) {
    const row = new Array<number>(n).fill(0);
    row[i] = 1; // I_k
    for (let j = 0; j < m; j++) row[k + j] = heavy[i][j]; // P = (Pᵀ)ᵀ
    G.push(row);
  }
  return { G, H, n, k };
}

// (7,4) Hamming, systematic, matching Proakis §9.5 Example 9.5.4.
const hamming74: LinearCode = {
  id: 'hamming74',
  label: '(7,4) Hamming',
  n: 7,
  k: 4,
  dmin: 3,
  G: [
    [1, 0, 0, 0, 1, 1, 0],
    [0, 1, 0, 0, 0, 1, 1],
    [0, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 1, 1, 1, 1],
  ],
  H: [
    [1, 0, 1, 1, 1, 0, 0],
    [1, 1, 0, 1, 0, 1, 0],
    [0, 1, 1, 1, 0, 0, 1],
  ],
};

const h1511 = makeHamming(4);
const hamming1511: LinearCode = {
  id: 'hamming1511',
  label: '(15,11) Hamming',
  n: 15,
  k: 11,
  dmin: 3,
  G: h1511.G,
  H: h1511.H,
};

const rep31: LinearCode = {
  id: 'rep31',
  label: '(3,1) repetition',
  n: 3,
  k: 1,
  dmin: 3,
  G: [[1, 1, 1]],
  H: [
    [1, 1, 0],
    [1, 0, 1],
  ],
};

export const CODES: LinearCode[] = [hamming74, hamming1511, rep31];

/** Map each weight-1 error syndrome → its error position; zero syndrome → −1. §9.5.1. */
export function syndromeTable(H: number[][]): Map<string, number> {
  const n = H[0].length;
  const map = new Map<string, number>();
  map.set(syndrome(new Array<number>(n).fill(0), H).join(''), -1);
  for (let pos = 0; pos < n; pos++) {
    const e = new Array<number>(n).fill(0);
    e[pos] = 1;
    const key = syndrome(e, H).join('');
    if (!map.has(key)) map.set(key, pos);
  }
  return map;
}

export interface DecodeResult {
  syndrome: number[];
  errorPos: number; // −1 = no error; ≥0 = corrected position; −2 = syndrome not a known coset leader
  corrected: number[];
  message: number[];
}

/** Syndrome decode: locate the coset-leader error, flip it, return ĉ and the message (first k bits). */
export function decode(r: number[], code: LinearCode, table: Map<string, number>): DecodeResult {
  const s = syndrome(r, code.H);
  const key = s.join('');
  const errorPos = table.has(key) ? (table.get(key) as number) : -2;
  const corrected = r.slice();
  if (errorPos >= 0) corrected[errorPos] ^= 1;
  return { syndrome: s, errorPos, corrected, message: corrected.slice(0, code.k) };
}

/** C(n,k) via a numerically gentle product. */
function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

/** Uncoded BPSK BER P_b = Q(√(2·Eb/N0)). Ch. 7. */
export function uncodedBerBpsk(ebN0Db: number): number {
  return qfunc(Math.sqrt(2 * 10 ** (ebN0Db / 10)));
}

/**
 * Hard-decision coded BER, bounded-distance decoding. The code rate R_c=k/n lowers the
 * per-coded-bit energy, so the BSC crossover is p=Q(√(2·R_c·Eb/N0)); residual bit error
 * ≈ (1/n)·Σ_{i=t+1}^{n} i·C(n,i)·p^i·(1−p)^{n−i}. §9.5.1.
 */
export function codedBerHard(code: LinearCode, ebN0Db: number): number {
  const Rc = code.k / code.n;
  const p = qfunc(Math.sqrt(2 * Rc * 10 ** (ebN0Db / 10)));
  const t = errorCorrectionT(code.dmin);
  const n = code.n;
  let pb = 0;
  for (let i = t + 1; i <= n; i++) pb += (i / n) * binom(n, i) * p ** i * (1 - p) ** (n - i);
  return pb;
}

/**
 * Soft-decision union-bound reference (leading term): A_dmin·Q(√(2·R_c·d_min·Eb/N0)),
 * with A_dmin = number of minimum-weight codewords. §9.5.1 (union bound, Ch. 7).
 */
export function codedBerSoftRef(code: LinearCode, ebN0Db: number): number {
  const Rc = code.k / code.n;
  const aDmin = allCodewords(code.G).filter((c) => weight(c) === code.dmin).length;
  return aDmin * qfunc(Math.sqrt(2 * Rc * code.dmin * 10 ** (ebN0Db / 10)));
}
