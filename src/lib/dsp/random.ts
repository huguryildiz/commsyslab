// Random-process DSP (Proakis & Salehi §4.2–4.4). Pure, framework-free.

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
 *  Verify exact scaling against Proakis §4.4 when wiring absolute PSD readouts. */
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

/** Random ±A NRZ with a uniform start delay so the process is WSS (Proakis §4.2). */
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
