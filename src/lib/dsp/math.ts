/** Error function (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7). */
export function erf(x: number): number {
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Complementary error function. */
export function erfc(x: number): number {
  return 1 - erf(x);
}

/** Gaussian tail probability Q(x) = P(X > x) for X ~ N(0,1). */
export function qfunc(x: number): number {
  return 0.5 * erfc(x / Math.SQRT2);
}

/**
 * Inverse Q-function: returns x such that qfunc(x) = p, for 0 < p < 1.
 * Q is strictly decreasing, so a bisection on the existing qfunc is robust and
 * accurate. Used for log-normal shadowing fade margins. Proakis §7.7.
 */
export function qfuncInv(p: number): number {
  if (p <= 0) return Infinity;
  if (p >= 1) return -Infinity;
  let lo = -40; // qfunc(-40) ≈ 1
  let hi = 40; // qfunc(40) ≈ 0
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (qfunc(mid) > p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Constrain x to [lo, hi]. */
export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** n evenly spaced values from a to b inclusive (n>=1). */
export function linspace(a: number, b: number, n: number): number[] {
  if (n <= 1) return [a];
  const out = new Array<number>(n);
  const step = (b - a) / (n - 1);
  for (let i = 0; i < n; i++) out[i] = a + step * i;
  return out;
}

/** Normalized sinc: sin(pi*x)/(pi*x), with sinc(0) = 1. */
export function sinc(x: number): number {
  if (x === 0) return 1;
  const px = Math.PI * x;
  return Math.sin(px) / px;
}
