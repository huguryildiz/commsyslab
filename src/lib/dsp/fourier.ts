/**
 * Fourier analysis and synthesis — series, transforms, and analytical signals.
 * Proakis & Salehi §2.1–§2.5 (Fourier series, transform, and properties).
 */

import type { SpectralLine } from './spectrum';
import type { Periodic } from './signals';
import { fft, ifft, type Complex } from './fft';
import { linspace, sinc } from './math';

/**
 * Analytic Fourier-series coefficients cₙ for periodic waveforms.
 * Proakis §2.1, Table 2.1.
 * Returns magnitudes |cₙ| as SpectralLine with freq = n*f0, mag = |cₙ|.
 * Includes n = 0..N (DC if relevant, then harmonics 1..N).
 */
export function seriesCoeffs(
  kind: Periodic,
  f0: number,
  N: number,
  duty: number = 0.5,
): SpectralLine[] {
  const lines: SpectralLine[] = [];

  switch (kind) {
    case 'square': {
      // Proakis Table 2.1: x(t) = (4/π) Σ_{n odd} (1/n) sin(2πnf₀t)
      // DC = 0, odd harmonics = (4/π) * (1/n)
      for (let n = 1; n <= N; n++) {
        if (n % 2 === 1) {
          lines.push({ freq: n * f0, mag: (4 / Math.PI) * (1 / n) });
        } else {
          lines.push({ freq: n * f0, mag: 0 });
        }
      }
      break;
    }

    case 'sawtooth': {
      // Proakis Table 2.1: x(t) = 2 Σ_{n=1}^∞ (-1)^{n+1} (1/n) sin(2πnf₀t)
      // All harmonics, magnitude decreases as 1/n
      for (let n = 1; n <= N; n++) {
        lines.push({ freq: n * f0, mag: (2 / Math.PI) * (1 / n) });
      }
      break;
    }

    case 'triangle': {
      // Proakis Table 2.1: odd harmonics only, magnitude ∝ 1/n²
      // x(t) = (8/π²) Σ_{n odd} (1/n²) sin(2πnf₀t)
      for (let n = 1; n <= N; n++) {
        if (n % 2 === 1) {
          lines.push({ freq: n * f0, mag: (8 / (Math.PI * Math.PI)) * (1 / (n * n)) });
        } else {
          lines.push({ freq: n * f0, mag: 0 });
        }
      }
      break;
    }

    case 'pulse': {
      // Proakis §2.1: pulse train with duty cycle d
      // DC component = d (the average)
      // cₙ = sinc(n*d) * (2*sin(π*n*d)/(π*n)) for n ≠ 0
      // Simplification: cₙ ∝ sinc(n*d)
      lines.push({ freq: 0, mag: duty });
      for (let n = 1; n <= N; n++) {
        // cₙ = (2/π) * sinc(n*d) * sin(π*n*d) / n
        // Standard form: sinc envelope
        const c = ((2 / Math.PI) * sinc(n * duty) * Math.sin(Math.PI * n * duty)) / n;
        lines.push({ freq: n * f0, mag: Math.abs(c) });
      }
      break;
    }
  }

  return lines;
}

/**
 * N-harmonic partial sum at time t (finite Fourier series).
 * Exhibits Gibbs phenomenon (~9% overshoot) near discontinuities.
 * Proakis §2.1.
 */
export function seriesPartialSum(
  kind: Periodic,
  f0: number,
  N: number,
  t: number,
  duty: number = 0.5,
): number {
  const coeffs = seriesCoeffs(kind, f0, N, duty);
  let sum = 0;

  for (const line of coeffs) {
    if (line.freq === 0) {
      // DC term
      sum += line.mag;
    } else {
      // Harmonic: cₙ * sin(2πnf₀t) — square/sawtooth/triangle expand in sine form
      sum += line.mag * Math.sin(2 * Math.PI * line.freq * t);
    }
  }

  return sum;
}

export type FilterType = 'lpf' | 'hpf' | 'bpf' | 'bsf' | 'rc';

/**
 * Ideal and practical filter magnitude response |H(f)|.
 * Proakis §2.2.2.
 * - lpf: ideal lowpass at fc
 * - hpf: ideal highpass at fc
 * - bpf: ideal bandpass from fc to fc2
 * - bsf: ideal band-stop (complement of bpf) from fc to fc2
 * - rc: first-order RC lowpass, 1/√(1+(f/fc)²)
 */
export function transferMag(type: FilterType, f: number, fc: number, fc2?: number): number {
  const absF = Math.abs(f);
  switch (type) {
    case 'lpf':
      return absF <= fc ? 1 : 0;
    case 'hpf':
      return absF >= fc ? 1 : 0;
    case 'bpf': {
      if (!fc2) return 0;
      const f1 = Math.min(fc, fc2);
      const f2 = Math.max(fc, fc2);
      return absF >= f1 && absF <= f2 ? 1 : 0;
    }
    case 'bsf': {
      // Band-stop = complement of band-pass (Proakis §2.4).
      if (!fc2) return 1;
      const f1 = Math.min(fc, fc2);
      const f2 = Math.max(fc, fc2);
      return absF >= f1 && absF <= f2 ? 0 : 1;
    }
    case 'rc': {
      // One-pole RC: |H(f)| = 1 / √(1 + (f/fc)²)
      // Proakis §2.2.2
      const ratio = absF / fc;
      return 1 / Math.sqrt(1 + ratio * ratio);
    }
  }
}

/**
 * Known Fourier-transform pairs for display.
 * Proakis §2.2.2: rect ↔ sinc, tri ↔ sinc², gauss ↔ gauss.
 * Returns time-domain and frequency-domain samples.
 */
export function ftPair(
  kind: 'rect' | 'tri' | 'gauss',
  param: number, // width or scale
): { time: { t: number[]; x: number[] }; freq: { f: number[]; mag: number[] } } {
  const N = 512; // use power of 2 for better FFT
  const maxT = 10 / param; // wider time window
  const tVals = linspace(-maxT / 2, maxT / 2, N);

  let timeVals: number[];

  switch (kind) {
    case 'rect': {
      // rect(t/τ) = 1 for |t| ≤ τ/2, 0 otherwise
      // param = τ (width)
      const tau = param;
      timeVals = tVals.map((t) => (Math.abs(t) <= tau / 2 ? 1 : 0));
      break;
    }

    case 'tri': {
      // tri(t/τ) = 1 - 2|t|/τ for |t| ≤ τ/2, 0 otherwise
      const tau = param;
      timeVals = tVals.map((t) =>
        Math.abs(t) <= tau / 2 ? Math.max(0, 1 - (2 * Math.abs(t)) / tau) : 0,
      );
      break;
    }

    case 'gauss': {
      // exp(-(π*t²)/σ²)
      const sigma = param;
      timeVals = tVals.map((t) => Math.exp(-(Math.PI * t * t) / (sigma * sigma)));
      break;
    }
  }

  // Frequency domain: magnitude only (via FFT)
  const fs = N / maxT;
  const fftResult = fft(timeVals);

  // Map FFT bins to frequency values and compute magnitudes
  const freqs: number[] = [];
  const mags: number[] = [];

  for (let k = 0; k < N; k++) {
    // Map bin k to signed frequency
    const kSigned = k <= N / 2 ? k : k - N;
    const freq = (kSigned * fs) / N;
    const mag = Math.hypot(fftResult[k].re, fftResult[k].im) / N;
    freqs.push(freq);
    mags.push(mag);
  }

  // Sort by frequency for output
  const sorted = freqs.map((f, i) => ({ f, mag: mags[i] })).sort((a, b) => a.f - b.f);

  return {
    time: { t: tVals, x: timeVals },
    freq: {
      f: sorted.map((s) => s.f),
      mag: sorted.map((s) => s.mag),
    },
  };
}

/**
 * Hilbert transform via FFT.
 * Applies -j·sgn(f) filter in frequency domain: +j for f>0, -j for f<0, 0 at DC and Nyquist.
 * Proakis §2.5: x̂(t) = Hilbert{x(t)}.
 * Returns real part of ifft.
 */
export function hilbert(x: number[]): number[] {
  const N = x.length;
  if (N === 0) return [];

  // FFT
  const X = fft(x);

  // Apply filter: -j for positive frequencies, +j for negative
  const XFilt: Complex[] = X.map((c, k) => {
    if (k === 0 || (N % 2 === 0 && k === N / 2)) {
      // DC and Nyquist: zero out
      return { re: 0, im: 0 };
    }
    if (k < N / 2) {
      // Positive frequency: multiply by -j
      return { re: c.im, im: -c.re };
    } else {
      // Negative frequency: multiply by +j
      return { re: -c.im, im: c.re };
    }
  });

  // IFFT
  const result = ifft(XFilt);
  return result.map((c) => c.re);
}

/**
 * Analytic signal (pre-envelope): z(t) = x(t) + j*x̂(t).
 * Proakis §2.5: x̂ = Hilbert{x}.
 */
export function analyticSignal(x: number[]): { re: number[]; im: number[] } {
  const xh = hilbert(x);
  return { re: x, im: xh };
}

/**
 * Lowpass equivalent: I/Q demodulation and envelope.
 * Demodulate analytic z(t) = x(t) + j*x̂(t) by e^{-j2πfct} to get baseband.
 * i(t) = Re{z(t) e^{-j2πfct}}, q(t) = Im{z(t) e^{-j2πfct}}.
 * Envelope V(t) = √(i² + q²).
 * Proakis §2.5, s.49.
 */
export function lowpassEquivalent(
  x: number[],
  fc: number,
  fs: number,
): { i: number[]; q: number[]; env: number[] } {
  const z = analyticSignal(x);
  const i: number[] = [];
  const q: number[] = [];
  const env: number[] = [];

  for (let n = 0; n < x.length; n++) {
    const t = n / fs;
    // e^{-j2πfct} = cos(2πfct) - j*sin(2πfct)
    const c = Math.cos(2 * Math.PI * fc * t);
    const s = Math.sin(2 * Math.PI * fc * t);
    // z(t) * e^{-j2πfct} = (z_r + j*z_i) * (c - j*s)
    //                     = (z_r*c + z_i*s) + j*(z_i*c - z_r*s)
    const iVal = z.re[n] * c + z.im[n] * s;
    const qVal = z.im[n] * c - z.re[n] * s;
    i.push(iVal);
    q.push(qVal);
    env.push(Math.hypot(iVal, qVal));
  }

  return { i, q, env };
}
