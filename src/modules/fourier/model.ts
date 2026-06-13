/**
 * Fourier & Spectrum module — data model for each panel.
 * Pure functions that compute display data from parameters.
 * Proakis & Salehi §2.1–§2.5.
 */

import { linspace } from '@/lib/dsp/math';
import { seriesCoeffs, seriesPartialSum, transferMag, ftPair, lowpassEquivalent } from '@/lib/dsp/fourier';
import { spectrum } from '@/lib/dsp/fft';
import { evalSignal, periodicWave, type Tone, type Periodic } from '@/lib/dsp/signals';
import { window as windowFunc, type WindowType } from '@/lib/dsp/window';

/** Panel 1: Fourier Series Synthesis */
export interface SeriesSynthView {
  time: number[];
  ideal: number[];
  partial: number[];
  freqs: number[];
  mags: number[];
  c1Mag: number;
  dcMag: number;
}

export function buildSeriesSynth(
  kind: Periodic,
  f0: number,
  N: number,
  duty: number = 0.5,
): SeriesSynthView {
  const tDuration = 3 / f0; // 3 periods
  const tSamples = 512;
  const time = linspace(0, tDuration, tSamples);

  const ideal = time.map((t) => periodicWave(kind, f0, t, duty));
  const partial = time.map((t) => seriesPartialSum(kind, f0, N, t, duty));

  const coeffs = seriesCoeffs(kind, f0, N, duty);
  const freqs = coeffs.map((c) => c.freq);
  const mags = coeffs.map((c) => c.mag);

  const c1Idx = freqs.findIndex((f) => f > 0);
  const c1Mag = c1Idx >= 0 ? mags[c1Idx] : 0;
  const dcMag = mags[0] ?? 0;

  return { time, ideal, partial, freqs, mags, c1Mag, dcMag };
}

/** Panel 2: DFT / FFT Spectrum Analyzer */
export interface SpectrumAnalyzerView {
  time: number[];
  signal: number[];
  freqs: number[];
  mags: number[];
  phases: number[];
}

export function buildSpectrumAnalyzer(
  signalType: 'tones' | 'wave',
  tones: Tone[],
  waveKind?: Periodic,
  f0?: number,
  fs: number = 100,
  N: number = 512,
  windowType: WindowType = 'hann',
): SpectrumAnalyzerView {
  const time = linspace(0, N / fs, N);
  const signal = time.map((t) => {
    if (signalType === 'tones') {
      return evalSignal(tones, t);
    } else if (waveKind && f0) {
      return periodicWave(waveKind, f0, t);
    }
    return 0;
  });

  // Apply window
  const w = windowFunc(windowType, N);
  const windowed = signal.map((s, i) => s * w[i]);

  // FFT
  const spec = spectrum(windowed, fs);

  return {
    time,
    signal,
    freqs: spec.freq,
    mags: spec.mag,
    phases: spec.phase,
  };
}

/** Panel 3: LTI Filter |H(f)| */
export interface FilterView {
  freqs: number[];
  inputMag: number[];
  filterMag: number[];
  outputMag: number[];
  timeInput: number[];
  timeOutput: number[];
  timeSigInput: number[];
  timeSigOutput: number[];
}

export function buildFilter(
  filterType: 'lpf' | 'hpf' | 'bpf' | 'rc',
  fc: number,
  fc2?: number,
  signalFreq: number = 50,
  fs: number = 500,
): FilterView {
  const freqs = linspace(0, fs / 2, 256);
  const filterMag = freqs.map((f) => transferMag(filterType, f, fc, fc2));

  // Example input signal: sum of three tones
  const N = 512;
  const time = linspace(0, N / fs, N);
  const timeSigInput = time.map((t) => {
    return (
      Math.cos(2 * Math.PI * (signalFreq - 50) * t) +
      Math.cos(2 * Math.PI * signalFreq * t) +
      Math.cos(2 * Math.PI * (signalFreq + 50) * t)
    );
  });

  const spec = spectrum(timeSigInput, fs);
  const inputMag = spec.mag;
  const outputMag = spec.mag.map((m, i) => {
    const f = spec.freq[i];
    return m * transferMag(filterType, f, fc, fc2);
  });

  // Time-domain response (simplified: assume filter passband magnitude)
  const timeSigOutput = timeSigInput.map((s) => {
    const response = transferMag(filterType, signalFreq, fc, fc2);
    return s * response;
  });

  return {
    freqs,
    inputMag,
    filterMag,
    outputMag,
    timeInput: time,
    timeOutput: time,
    timeSigInput,
    timeSigOutput,
  };
}

/** Panel 4: FT Pairs & Properties */
export interface PairsView {
  timeDomain: { t: number[]; x: number[] };
  freqDomain: { f: number[]; mag: number[] };
}

export function buildPairs(
  kind: 'rect' | 'tri' | 'gauss',
  param: number,
  timeShift: number = 0,
  ampScale: number = 1,
): PairsView {
  const pair = ftPair(kind, param);

  // Apply time shift in frequency domain as phase ramp
  const freqShifted = pair.freq.mag.map((mag) => {
    // Phase shift doesn't affect magnitude in this display
    return mag * ampScale;
  });

  // Time-domain shift
  const timeShifted = pair.time.x.map((x, i) => {
    const t = pair.time.t[i];
    return (t - timeShift >= -pair.time.t[pair.time.t.length - 1] / 2 &&
      t - timeShift <= pair.time.t[pair.time.t.length - 1] / 2)
      ? x * ampScale
      : 0;
  });

  return {
    timeDomain: { t: pair.time.t, x: timeShifted },
    freqDomain: { f: pair.freq.f, mag: freqShifted },
  };
}

/** Panel 5: Bandpass Signals & Hilbert */
export interface AnalyticView {
  time: number[];
  signal: number[];
  analyticRe: number[];
  analyticIm: number[];
  iComponent: number[];
  qComponent: number[];
  envelope: number[];
}

export function buildAnalytic(
  fc: number,
  fm: number,
  m: number, // modulation index
  fs: number = 1000,
): AnalyticView {
  const N = 512;
  const time = linspace(0, N / fs, N);

  // AM signal: (1 + m*cos(2π*fm*t)) * cos(2π*fc*t)
  const signal = time.map(
    (t) =>
      (1 + m * Math.cos(2 * Math.PI * fm * t)) *
      Math.cos(2 * Math.PI * fc * t),
  );

  const result = lowpassEquivalent(signal, fc, fs);

  return {
    time,
    signal,
    analyticRe: signal, // Real part of analytic signal
    analyticIm: new Array(N).fill(0), // Will be filled with Hilbert(signal)
    iComponent: result.i,
    qComponent: result.q,
    envelope: result.env,
  };
}
