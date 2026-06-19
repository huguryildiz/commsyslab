// Proakis §7.4.1 — companding (non-uniform PCM).
// μ-law ref: CCSM mulaw.m / invmulaw.m (Eq. 7.4.8). A-law: Book Eq. 7.4.9.

export type CompandingLaw = 'mu' | 'A' | 'none';

/** μ-law compressor g(x) = sgn(x)·ln(1+μ|x|)/ln(1+μ), domain x ∈ [-1, 1]. Eq. 7.4.8. */
export function muLawCompress(x: number, mu = 255): number {
  return (Math.sign(x) * Math.log(1 + mu * Math.abs(x))) / Math.log(1 + mu);
}

/** Inverse μ-law expander (Eq. 7.4.8 solved for x). CCSM invmulaw.m. */
export function muLawExpand(y: number, mu = 255): number {
  return (Math.sign(y) * ((1 + mu) ** Math.abs(y) - 1)) / mu;
}

/** A-law compressor (Eq. 7.4.9), domain x ∈ [-1, 1]; A = 87.56 standard.
 *  Linear for |x| < 1/A, logarithmic above; continuous at |x| = 1/A. */
export function aLawCompress(x: number, A = 87.56): number {
  const s = Math.sign(x);
  const ax = Math.abs(x);
  const denom = 1 + Math.log(A);
  if (ax < 1 / A) return (s * A * ax) / denom;
  return (s * (1 + Math.log(A * ax))) / denom;
}

/** Inverse A-law expander. */
export function aLawExpand(y: number, A = 87.56): number {
  const s = Math.sign(y);
  const ay = Math.abs(y);
  const denom = 1 + Math.log(A);
  const thr = 1 / denom; // |y| value at the |x| = 1/A breakpoint
  if (ay < thr) return (s * ay * denom) / A;
  return (s * Math.exp(ay * denom - 1)) / A;
}
