// Ref: Proakis & Salehi §9.6 (Cyclic Codes — Reed-Solomon), Eq. 9.6.20–9.6.23, Fig. 9.23.
// Nonbinary RS over GF(2^m): symbols are field ints. N = 2^m − 1, D_min = N − K + 1 (MDS),
// R_c = K/N. Generator g(x) = ∏_{i=1}^{N−K} (x − α^i). Systematic symbol-wise encoding.
import { type GF, gfAdd, gfPolyMul, gfPolyMod, gfPolyEval } from './gf2m';

export interface RsCode {
  m: number;
  N: number;
  K: number;
  parity: number; // N − K
  dmin: number; // N − K + 1 (MDS)
  t: number; // ⌊(N−K)/2⌋
  rate: number; // K / N
}

export function rsParams(m: number, K: number): RsCode {
  const N = (1 << m) - 1;
  const parity = N - K;
  return { m, N, K, parity, dmin: parity + 1, t: Math.floor(parity / 2), rate: K / N };
}

/** g(x) = ∏_{i=1}^{parity} (x − α^i) over GF(2^m); LSB-first symbol coeffs, leading coeff 1. */
export function rsGenerator(f: GF, parity: number): number[] {
  let g: number[] = [1];
  for (let i = 1; i <= parity; i++) g = gfPolyMul(f, g, [f.exp[i], 1]);
  return g;
}

/** Systematic encode: parity = (msg·x^parity) mod g; codeword [parity (low) | msg (high)], N symbols. */
export function rsEncode(f: GF, msg: number[], K: number): number[] {
  const parity = f.n - K;
  const g = rsGenerator(f, parity);
  const shifted = new Array<number>(parity).fill(0).concat(msg);
  const rem = gfPolyMod(f, shifted, g);
  const par = new Array<number>(parity).fill(0);
  for (let i = 0; i < parity; i++) par[i] = rem[i] ?? 0;
  return par.concat(msg);
}

/** Syndromes S_i = r(α^i), i = 1..parity; all-zero ⇒ no detected error. §9.6 */
export function rsSyndromes(f: GF, received: number[], parity: number): number[] {
  const s: number[] = [];
  for (let i = 1; i <= parity; i++) s.push(gfPolyEval(f, received, f.exp[i]));
  return s;
}

/** Group LSB-first bits into m-bit symbols (bit j of a symbol = coeff of p^j). */
export function bitsToSymbols(bits: number[], m: number): number[] {
  const syms: number[] = [];
  for (let i = 0; i < bits.length; i += m) {
    let v = 0;
    for (let j = 0; j < m; j++) v |= (bits[i + j] ?? 0) << j;
    syms.push(v);
  }
  return syms;
}

/** Expand symbols to LSB-first bits (inverse of bitsToSymbols). */
export function symbolsToBits(syms: number[], m: number): number[] {
  const bits: number[] = [];
  for (const s of syms) for (let j = 0; j < m; j++) bits.push((s >> j) & 1);
  return bits;
}

/** Sum of two field elements — re-exported for callers that only import this module. */
export const rsAdd = gfAdd;
