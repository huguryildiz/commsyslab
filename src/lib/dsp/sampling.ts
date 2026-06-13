import { sinc } from './math';
import { evalSignal, signalBandwidth, type Tone } from './signals';

export interface Samples {
  times: number[];
  values: number[];
  Ts: number;
}

/** Sample a signal at rate fs over [tStart, tEnd] (inclusive of tEnd within Ts/2).
 *  Precondition: fs > 0. Callers (UI sliders) enforce this; with fs <= 0 the
 *  result is degenerate (empty or single sample), not an error. */
export function sample(tones: Tone[], fs: number, tStart: number, tEnd: number): Samples {
  const Ts = 1 / fs;
  const times: number[] = [];
  const values: number[] = [];
  const n = Math.floor((tEnd - tStart) / Ts + 1e-9);
  for (let i = 0; i <= n; i++) {
    const t = tStart + i * Ts;
    times.push(t);
    values.push(evalSignal(tones, t));
  }
  return { times, values, Ts };
}

/** Whittaker-Shannon ideal reconstruction at time t from samples.
 *  Precondition: s.Ts > 0 (guaranteed by sample() for fs > 0). */
export function sincReconstruct(s: Samples, t: number): number {
  let v = 0;
  for (let n = 0; n < s.times.length; n++) {
    v += s.values[n] * sinc((t - s.times[n]) / s.Ts);
  }
  return v;
}

/** Apparent (folded) frequency in [0, fs/2] for a tone of frequency f sampled at fs. */
export function aliasFrequency(f: number, fs: number): number {
  return Math.abs(f - fs * Math.round(f / fs));
}

/** Nyquist sampling rate = 2 * bandwidth. */
export function nyquistRate(tones: Tone[]): number {
  return 2 * signalBandwidth(tones);
}

export type SamplingRegime = 'oversampling' | 'nyquist' | 'undersampling';

/** Classify fs relative to the Nyquist rate 2W. */
export function samplingRegime(fs: number, bandwidth: number): SamplingRegime {
  const nyq = 2 * bandwidth;
  const tol = 1e-9 * Math.max(1, nyq);
  if (fs > nyq + tol) return 'oversampling';
  if (fs < nyq - tol) return 'undersampling';
  return 'nyquist';
}
