// Symbol synchronization — early-late gate timing recovery.
// Proakis & Salehi, Fundamentals of Communication Systems, §8.9.

/**
 * Normalised matched-filter autocorrelation (symbol period = 1): a smooth, even
 * peak R(0)=1 used as the timing discriminator's signal. Raised-cosine bump.
 */
export function raisedCosineAutocorr(t: number): number {
  if (Math.abs(t) >= 1) return 0;
  return (1 + Math.cos(Math.PI * t)) / 2;
}

/**
 * Early-late gate timing error (Proakis §8.9.1): sample the matched-filter output
 * early (τ−δ) and late (τ+δ); the difference of magnitudes is the discriminator.
 * Zero at perfect timing, odd-symmetric around the lock point.
 */
export function earlyLateError(tau: number, delta: number): number {
  return Math.abs(raisedCosineAutocorr(tau - delta)) - Math.abs(raisedCosineAutocorr(tau + delta));
}

/** Discriminator S-curve: timing error vs offset τ over [−0.5, 0.5], `n` (odd) samples. */
export function timingSCurve(delta: number, n: number): { tau: number; error: number }[] {
  const out: { tau: number; error: number }[] = [];
  const lo = -0.5;
  const hi = 0.5;
  for (let i = 0; i < n; i++) {
    const tau = lo + ((hi - lo) * i) / (n - 1);
    out.push({ tau, error: earlyLateError(tau, delta) });
  }
  return out;
}
