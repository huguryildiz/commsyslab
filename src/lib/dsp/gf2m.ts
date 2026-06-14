// Ref: Proakis & Salehi §9.6 (Cyclic Codes) — the finite field GF(2^m) underlying BCH/RS.
// Field elements are ints whose bits are polynomial-basis coefficients (bit j = coeff of p^j).
// exp[i] = α^i (as an int); log[x] = i such that α^i = x. Arithmetic via these tables.

export interface GF {
  m: number;
  n: number; // 2^m − 1 (number of nonzero elements; α has order n)
  prim: number; // primitive polynomial as an int
  exp: number[]; // exp[i] = α^i, i = 0..n−1
  log: number[]; // log[x] = i, x = 1..n  (log[0] unused)
}

/** Primitive polynomials (int form). m=3: p³+p+1 (0b1011); m=4: p⁴+p+1 (0b10011). §9.6 */
export const PRIMITIVE: Record<number, number> = { 3: 0b1011, 4: 0b10011 };

/** Build GF(2^m) exp/log tables by stepping α through the LFSR defined by the primitive poly. */
export function makeField(m: number): GF {
  const prim = PRIMITIVE[m];
  if (prim === undefined) throw new Error(`unsupported field GF(2^${m})`);
  const n = (1 << m) - 1;
  const exp = new Array<number>(n);
  const log = new Array<number>(n + 1).fill(0);
  let x = 1;
  for (let i = 0; i < n; i++) {
    exp[i] = x;
    log[x] = i;
    x <<= 1;
    if (x & (1 << m)) x ^= prim; // reduce mod the primitive polynomial
  }
  return { m, n, prim, exp, log };
}

/** GF(2^m) addition = bitwise XOR (characteristic 2). */
export const gfAdd = (a: number, b: number): number => a ^ b;

/** GF(2^m) multiplication via log/antilog tables. */
export function gfMul(f: GF, a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return f.exp[(f.log[a] + f.log[b]) % f.n];
}

/** a^e in GF(2^m). */
export function gfPow(f: GF, a: number, e: number): number {
  if (e === 0) return 1;
  if (a === 0) return 0;
  return f.exp[(f.log[a] * e) % f.n];
}

/** Multiplicative inverse in GF(2^m). */
export function gfInv(f: GF, a: number): number {
  if (a === 0) throw new Error('no inverse of 0 in GF(2^m)');
  return f.exp[(f.n - f.log[a]) % f.n];
}

/** Element int → LSB-first polynomial-coefficient bits (length m). */
export function elemToBits(x: number, m: number): number[] {
  return Array.from({ length: m }, (_, j) => (x >> j) & 1);
}

/** Polynomial multiply over GF(2^m) (coeff arrays LSB-first; coeffs are field elements). */
export function gfPolyMul(f: GF, a: number[], b: number[]): number[] {
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) out[i + j] = gfAdd(out[i + j], gfMul(f, a[i], b[j]));
  return out;
}

/** Polynomial remainder a(x) mod g(x) over GF(2^m); returns length deg(g) (low coeffs). */
export function gfPolyMod(f: GF, a: number[], g: number[]): number[] {
  const r = a.slice();
  const dg = g.length - 1;
  const lead = g[dg];
  for (let i = r.length - 1; i >= dg; i--) {
    const c = r[i];
    if (c !== 0) {
      const factor = gfMul(f, c, gfInv(f, lead));
      for (let j = 0; j <= dg; j++) r[i - dg + j] = gfAdd(r[i - dg + j], gfMul(f, factor, g[j]));
    }
  }
  return r.slice(0, dg);
}

/** Horner evaluation of a(x) at x over GF(2^m) (a is LSB-first). */
export function gfPolyEval(f: GF, a: number[], x: number): number {
  let acc = 0;
  for (let k = a.length - 1; k >= 0; k--) acc = gfAdd(gfMul(f, acc, x), a[k]);
  return acc;
}

/** Cyclotomic coset of i mod n: {i, 2i, 4i, …} (mod n) until it cycles. */
export function cyclotomicCoset(n: number, i: number): number[] {
  const start = ((i % n) + n) % n;
  const s: number[] = [];
  let c = start;
  do {
    s.push(c);
    c = (c * 2) % n;
  } while (c !== start);
  return s;
}

/**
 * Minimal polynomial of α^i over GF(2): ∏_{j ∈ coset(i)} (x − α^j). The product has binary
 * coefficients; returned as a GF(2) LSB-first coeff array. §9.6
 */
export function minimalPoly(f: GF, i: number): number[] {
  let poly: number[] = [1];
  for (const j of cyclotomicCoset(f.n, i)) {
    poly = gfPolyMul(f, poly, [f.exp[j], 1]); // (x − α^j) = α^j + x  (char 2)
  }
  return poly.map((c) => c & 1);
}
