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
