// Random-process DSP (Proakis & Salehi §5.2–5.3). Pure, framework-free.

import { gaussian, sigmaFromN0 } from './awgn';
import { fft, ifft } from './fft';

/** Deterministic small PRNG (mulberry32). Returns a function yielding [0,1). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ProcessKind = 'randphase-sine' | 'white-gaussian' | 'colored' | 'binary-nrz';

export interface ProcessParams {
  kind: ProcessKind;
  amplitude: number; // A
  f0: number; // Hz — sine carrier / NRZ symbol rate basis (T = 1/f0)
  n0: number; // white-noise PSD level N0 (white & colored input)
  fs: number; // Hz — sample rate of the discrete realization
  M: number; // ensemble size
  N: number; // samples per realization
  seed: number; // RNG seed
  filterKind: 'rc' | 'ideal-lpf'; // colored only
  cutoff: number; // Hz — filter cutoff fc (colored only)
}

/** σ for the discrete white process from N0 (continuous PSD N0/2 sampled at fs).
 *  Verify exact scaling against Proakis §5.3 when wiring absolute PSD readouts. */
function whiteSigma(p: ProcessParams): number {
  return sigmaFromN0(p.n0); // σ = sqrt(N0/2)
}

function genSine(p: ProcessParams, rng: () => number): Float64Array[] {
  const out: Float64Array[] = [];
  for (let m = 0; m < p.M; m++) {
    const theta = 2 * Math.PI * rng(); // Θ ~ U[0,2π)
    const x = new Float64Array(p.N);
    for (let n = 0; n < p.N; n++) {
      x[n] = p.amplitude * Math.cos((2 * Math.PI * p.f0 * n) / p.fs + theta);
    }
    out.push(x);
  }
  return out;
}

function genWhite(p: ProcessParams, rng: () => number): Float64Array[] {
  const sigma = whiteSigma(p);
  const out: Float64Array[] = [];
  for (let m = 0; m < p.M; m++) {
    const x = new Float64Array(p.N);
    for (let n = 0; n < p.N; n++) x[n] = sigma * gaussian(rng);
    out.push(x);
  }
  return out;
}

/** Build the ensemble of M sample functions, each length N. */
export function generateEnsemble(p: ProcessParams): Float64Array[] {
  const rng = makeRng(p.seed);
  switch (p.kind) {
    case 'randphase-sine':
      return genSine(p, rng);
    case 'white-gaussian':
      return genWhite(p, rng);
    case 'colored':
      return genColored(p, rng);
    case 'binary-nrz':
      return genNrz(p, rng);
  }
}

/** One-pole RC low-pass applied sample-by-sample: y[n] = α x[n] + (1-α) y[n-1]. */
function rcSmooth(x: Float64Array, fc: number, fs: number): Float64Array {
  const dt = 1 / fs;
  const rc = 1 / (2 * Math.PI * fc);
  const alpha = dt / (rc + dt);
  const y = new Float64Array(x.length);
  let prev = 0;
  for (let n = 0; n < x.length; n++) {
    prev = prev + alpha * (x[n] - prev);
    y[n] = prev;
  }
  return y;
}

/** Ideal LPF via FFT brick-wall mask at ±fc. */
function idealLpf(x: Float64Array, fc: number, fs: number): Float64Array {
  const N = x.length;
  const X = fft(Array.from(x));
  const out = X.map((c, k) => {
    const f = k <= N / 2 ? (k * fs) / N : ((k - N) * fs) / N;
    return Math.abs(f) <= fc ? c : { re: 0, im: 0 };
  });
  return Float64Array.from(ifft(out).map((c) => c.re));
}

function genColored(p: ProcessParams, rng: () => number): Float64Array[] {
  const white = genWhite(p, rng);
  return white.map((x) =>
    p.filterKind === 'ideal-lpf' ? idealLpf(x, p.cutoff, p.fs) : rcSmooth(x, p.cutoff, p.fs),
  );
}

/** Random ±A NRZ with a uniform start delay so the process is WSS (Proakis §5.2). */
function genNrz(p: ProcessParams, rng: () => number): Float64Array[] {
  const samplesPerSymbol = Math.max(1, Math.round(p.fs / p.f0)); // T = 1/f0
  const out: Float64Array[] = [];
  for (let m = 0; m < p.M; m++) {
    const x = new Float64Array(p.N);
    const delay = Math.floor(rng() * samplesPerSymbol); // D ~ U[0,T)
    let level = rng() < 0.5 ? p.amplitude : -p.amplitude;
    let count = delay;
    for (let n = 0; n < p.N; n++) {
      if (count >= samplesPerSymbol) {
        level = rng() < 0.5 ? p.amplitude : -p.amplitude;
        count = 0;
      }
      x[n] = level;
      count++;
    }
    out.push(x);
  }
  return out;
}

/** Ensemble average at each time index: m_X[n] = (1/M) Σ_m x_m[n]. */
export function ensembleMean(ensemble: Float64Array[]): Float64Array {
  const N = ensemble[0].length;
  const m = new Float64Array(N);
  for (const x of ensemble) for (let n = 0; n < N; n++) m[n] += x[n];
  for (let n = 0; n < N; n++) m[n] /= ensemble.length;
  return m;
}

/** Biased autocovariance of a single realization for lags 0..maxLag. */
export function timeAutocorr(x: Float64Array, maxLag: number): Float64Array {
  const N = x.length;
  const mean = x.reduce((s, v) => s + v, 0) / N;
  const r = new Float64Array(maxLag + 1);
  for (let k = 0; k <= maxLag; k++) {
    let acc = 0;
    for (let n = 0; n < N - k; n++) acc += (x[n] - mean) * (x[n + k] - mean);
    r[k] = acc / N;
  }
  return r;
}

/** Autocorrelation averaged across the ensemble (lags 0..maxLag). */
export function ensembleAutocorr(ensemble: Float64Array[], maxLag: number): Float64Array {
  const r = new Float64Array(maxLag + 1);
  for (const x of ensemble) {
    const rk = timeAutocorr(x, maxLag);
    for (let k = 0; k <= maxLag; k++) r[k] += rk[k];
  }
  for (let k = 0; k <= maxLag; k++) r[k] /= ensemble.length;
  return r;
}

/** One-sided averaged periodogram (bins 0..N/2). Magnitude-squared of the FFT,
 *  averaged over the ensemble. Absolute scaling verified vs Proakis §5.2.5 later. */
export function periodogram(ensemble: Float64Array[]): Float64Array {
  const N = ensemble[0].length;
  const half = Math.floor(N / 2);
  const acc = new Float64Array(half + 1);
  for (const x of ensemble) {
    const X = fft(Array.from(x));
    for (let k = 0; k <= half; k++) acc[k] += (X[k].re * X[k].re + X[k].im * X[k].im) / N;
  }
  for (let k = 0; k <= half; k++) acc[k] /= ensemble.length;
  return acc;
}

/** Theoretical autocorrelation R_X(τ) per process kind, evaluated at given lags (seconds). */
export function theoreticalAutocorr(p: ProcessParams, taus: Float64Array): Float64Array {
  const r = new Float64Array(taus.length);
  const T = 1 / p.f0;
  for (let i = 0; i < taus.length; i++) {
    const tau = taus[i];
    switch (p.kind) {
      case 'randphase-sine':
        r[i] = (p.amplitude ** 2 / 2) * Math.cos(2 * Math.PI * p.f0 * tau);
        break;
      case 'binary-nrz':
        r[i] = Math.abs(tau) < T ? p.amplitude ** 2 * (1 - Math.abs(tau) / T) : 0;
        break;
      case 'white-gaussian':
      case 'colored':
        r[i] = tau === 0 ? p.n0 / 2 : 0; // white spike: variance N0/2 at zero lag (matches the generated process)
        break;
    }
  }
  return r;
}

/** |H(f)|^2 of the colored-process filter at given frequencies (Hz). */
export function filterMagSq(p: ProcessParams, freqs: Float64Array): Float64Array {
  const h = new Float64Array(freqs.length);
  for (let i = 0; i < freqs.length; i++) {
    const f = Math.abs(freqs[i]);
    h[i] = p.filterKind === 'ideal-lpf' ? (f <= p.cutoff ? 1 : 0) : 1 / (1 + (f / p.cutoff) ** 2);
  }
  return h;
}

/** Theoretical PSD S_X(f) per kind at given frequencies (Hz).
 *  Sine returns a sparse two-line approximation (impulse mass placed at the nearest bin). */
export function theoreticalPsd(p: ProcessParams, freqs: Float64Array): Float64Array {
  const s = new Float64Array(freqs.length);
  const T = 1 / p.f0;
  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i];
    switch (p.kind) {
      case 'white-gaussian':
        s[i] = p.n0 / 2;
        break;
      case 'colored':
        s[i] = (p.n0 / 2) * filterMagSq(p, Float64Array.from([f]))[0];
        break;
      case 'binary-nrz': {
        const x = Math.PI * f * T;
        const sinc = x === 0 ? 1 : Math.sin(x) / x;
        s[i] = p.amplitude ** 2 * T * sinc * sinc;
        break;
      }
      case 'randphase-sine':
        s[i] = 0; // line spectrum — drawn as stems by the section, not a continuous curve
        break;
    }
  }
  return s;
}
