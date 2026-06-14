// Ref: Proakis & Salehi §9.6 (Cyclic Codes). GF(2) polynomials as LSB-first coefficient
// arrays: poly[i] = coefficient of p^i. All sums are mod 2.

/** Highest set index (degree); -1 for the zero polynomial. */
export function polyDeg(a: number[]): number {
  for (let i = a.length - 1; i >= 0; i--) if (a[i] & 1) return i;
  return -1;
}

/** Coefficientwise XOR (GF(2) addition). */
export function polyAdd(a: number[], b: number[]): number[] {
  const n = Math.max(a.length, b.length);
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) out[i] = ((a[i] ?? 0) ^ (b[i] ?? 0)) & 1;
  return out;
}

/** GF(2) polynomial multiplication (convolution mod 2). */
export function polyMul(a: number[], b: number[]): number[] {
  if (polyDeg(a) < 0 || polyDeg(b) < 0) return [0];
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    if (!(a[i] & 1)) continue;
    for (let j = 0; j < b.length; j++) out[i + j] ^= b[j] & 1;
  }
  return out;
}

/** GF(2) remainder a mod g (length deg g). §9.6.1. */
export function polyMod(a: number[], g: number[]): number[] {
  const dg = polyDeg(g);
  if (dg < 0) return a.slice();
  const r = a.slice();
  let d = polyDeg(r);
  while (d >= dg) {
    for (let j = 0; j <= dg; j++) r[d - dg + j] ^= g[j] & 1;
    d = polyDeg(r);
  }
  return r.slice(0, dg);
}

const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const sup = (n: number): string =>
  String(n)
    .split('')
    .map((d) => SUP[+d])
    .join('');

/** Render a polynomial as a descending string, e.g. "p³+p²+1". */
export function polyToString(a: number[]): string {
  const terms: string[] = [];
  for (let i = polyDeg(a); i >= 0; i--) {
    if (!(a[i] & 1)) continue;
    terms.push(i === 0 ? '1' : i === 1 ? 'p' : `p${sup(i)}`);
  }
  return terms.length ? terms.join('+') : '0';
}
