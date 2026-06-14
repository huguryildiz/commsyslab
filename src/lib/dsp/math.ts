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

/**
 * Bessel function of the first kind, order 0. Abramowitz & Stegun 9.4.1/9.4.3
 * rational approximations (|error| < 1e-7). Even function, so evaluate at |x|.
 * Used for the classical Doppler autocorrelation R(τ) = J₀(2π f_m τ).
 */
export function besselJ0(x: number): number {
  const ax = Math.abs(x);
  if (ax <= 3) {
    const y = (x / 3) ** 2;
    return (
      1 +
      y *
        (-2.2499997 +
          y *
            (1.2656208 +
              y * (-0.3163866 + y * (0.0444479 + y * (-0.0039444 + y * 0.00021)))))
    );
  }
  const z = 3 / ax;
  const f0 =
    0.79788456 +
    z *
      (-0.00000077 +
        z *
          (-0.0055274 + z * (-0.00009512 + z * (0.00137237 + z * (-0.00072805 + z * 0.00014476)))));
  const theta0 =
    ax -
    0.78539816 +
    z *
      (-0.04166397 +
        z *
          (-0.00003954 + z * (0.00262573 + z * (-0.00054125 + z * (-0.00029333 + z * 0.00013558)))));
  return (f0 / Math.sqrt(ax)) * Math.cos(theta0);
}
