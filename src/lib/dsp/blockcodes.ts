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
