/**
 * Energy and power of sampled signals.
 * Proakis & Salehi §2.5 / §2.2.3 (Parseval).
 */

/** Energy-type measure: E = Σ |x[n]|² · dt (approximates ∫|x(t)|² dt). */
export function signalEnergy(x: number[], dt: number): number {
  return x.reduce((s, v) => s + v * v, 0) * dt;
}

/** Power-type measure: P = (1/T) Σ |x[n]|² · dt over one period T. */
export function signalPowerRMS(x: number[], dt: number, T: number): number {
  return signalEnergy(x, dt) / T;
}

/** Parseval for Fourier series: average power = Σ |c_n|² over the given mags. */
export function parsevalSeries(mags: number[]): number {
  return mags.reduce((s, m) => s + m * m, 0);
}
