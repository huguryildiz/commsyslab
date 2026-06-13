/** Full linear convolution; length = x.length + h.length − 1. */
export function convolve(x: number[], h: number[]): number[] {
  if (x.length === 0 || h.length === 0) return [];
  const out = new Array(x.length + h.length - 1).fill(0);
  for (let i = 0; i < x.length; i++) {
    for (let j = 0; j < h.length; j++) out[i + j] += x[i] * h[j];
  }
  return out;
}

/** Matched filter for a pulse: time-reversed, h[n] = p[N−1−n] (Proakis §7.5.2). */
export function matchedFilter(pulse: number[]): number[] {
  return [...pulse].reverse();
}

/** Energy of a (real) pulse, E = Σ p². */
export function pulseEnergy(pulse: number[]): number {
  return pulse.reduce((s, v) => s + v * v, 0);
}

/** Output of the matched filter: convolve(received, matchedFilter(pulse)). Peaks to E at full overlap. */
export function matchedFilterOutput(received: number[], pulse: number[]): number[] {
  return convolve(received, matchedFilter(pulse));
}

/** Correlation-receiver decision statistic, Σ r[n]·p[n] over the overlap (Proakis §7.5.1). */
export function correlate(received: number[], pulse: number[]): number {
  const n = Math.min(received.length, pulse.length);
  let acc = 0;
  for (let i = 0; i < n; i++) acc += received[i] * pulse[i];
  return acc;
}

/** Peak SNR of the matched-filter output, 2E/N₀ (Proakis §7.5.2). */
export function peakSnr(pulseEnergyValue: number, n0: number): number {
  return (2 * pulseEnergyValue) / n0;
}
