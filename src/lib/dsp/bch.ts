// Ref: Proakis & Salehi §9.6 (Cyclic Codes — BCH), Eq. 9.6.17–9.6.19, Table 9.1.
// Binary BCH: generator g(p) = lcm of the minimal polynomials of α, α², …, α^{2t} over GF(2);
// n = 2^m − 1, k = n − deg g, d_min = 2t + 1. Systematic encoding reuses the GF(2) division in
// cyclic.ts (the generator is a binary polynomial).
import { type GF, makeField, minimalPoly, cyclotomicCoset, gfPolyEval } from './gf2m';
import { polyMul, polyDeg, encodeCyclic } from './cyclic';

export interface BchCode {
  m: number;
  n: number;
  k: number;
  t: number;
  dmin: number;
  g: number[]; // generator, GF(2) LSB-first
  field: GF;
}

/** Generator g(p) = lcm of minimal polys of α^1..α^{2t}; dedup by cyclotomic coset. Eq. 9.6.17–19 */
export function bchGenerator(m: number, t: number): number[] {
  const f = makeField(m);
  const used = new Set<number>();
  let g: number[] = [1];
  for (let i = 1; i <= 2 * t; i++) {
    const key = Math.min(...cyclotomicCoset(f.n, i));
    if (used.has(key)) continue;
    used.add(key);
    g = polyMul(g, minimalPoly(f, i));
  }
  return g;
}

export function bchParams(m: number, t: number): BchCode {
  const f = makeField(m);
  const g = bchGenerator(m, t);
  const deg = polyDeg(g);
  return { m, n: f.n, k: f.n - deg, t, dmin: 2 * t + 1, g, field: f };
}

/** Systematic BCH encode (GF(2) division in cyclic.ts). Codeword length n. */
export function bchEncode(msg: number[], m: number, t: number): number[] {
  return encodeCyclic(msg, bchGenerator(m, t));
}

/** BCH syndromes S_i = r(α^i), i = 1..2t, over GF(2^m). All-zero ⇒ no detected error. §9.6 */
export function bchSyndromes(received: number[], m: number, t: number): number[] {
  const f = makeField(m);
  const s: number[] = [];
  for (let i = 1; i <= 2 * t; i++) s.push(gfPolyEval(f, received, f.exp[i]));
  return s;
}

/** Render a binary generator (LSB-first) as an octal string (MSB-first bit grouping). Table 9.1 */
export function genToOctal(g: number[]): string {
  const deg = polyDeg(g);
  let bin = '';
  for (let i = deg; i >= 0; i--) bin += g[i] & 1 ? '1' : '0';
  while (bin.length % 3 !== 0) bin = '0' + bin;
  let oct = '';
  for (let i = 0; i < bin.length; i += 3) oct += parseInt(bin.slice(i, i + 3), 2).toString();
  return oct.replace(/^0+(?=\d)/, '');
}
