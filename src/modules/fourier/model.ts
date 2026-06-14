/**
 * Signals & Spectra module — data model for each panel.
 * Pure functions that compute display data from parameters.
 * Proakis & Salehi §2.1–§2.5.
 */

import { linspace } from '@/lib/dsp/math';
import {
  seriesCoeffs,
  seriesPartialSum,
  transferMag,
  ftPair,
  lowpassEquivalent,
  hilbert,
} from '@/lib/dsp/fourier';
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
  tStart: number = 0, // animation: scroll the time window by tStart seconds
): SeriesSynthView {
  const tDuration = 3 / f0; // 3 periods
  const tSamples = 512;
  // Local (fixed) display axis [0, tDuration]; the signal is sampled tStart ahead,
  // so increasing tStart scrolls the waveform left while the axis stays put.
  const time = linspace(0, tDuration, tSamples);

  const ideal = time.map((t) => periodicWave(kind, f0, tStart + t, duty));
  const partial = time.map((t) => seriesPartialSum(kind, f0, N, tStart + t, duty));

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
  tStart: number = 0, // animation: scroll the displayed time window
): SpectrumAnalyzerView {
  const time = linspace(0, N / fs, N);
  const sampleAt = (t: number): number => {
    if (signalType === 'tones') return evalSignal(tones, t);
    if (waveKind && f0) return periodicWave(waveKind, f0, t);
    return 0;
  };
  // Displayed signal scrolls with tStart; the spectrum is computed from a fixed
  // (tStart-independent) buffer so a stationary signal keeps a stationary spectrum.
  const signal = time.map((t) => sampleAt(tStart + t));
  const fftBuf = time.map((t) => sampleAt(t));

  // Apply window
  const w = windowFunc(windowType, N);
  const windowed = fftBuf.map((s, i) => s * w[i]);

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
  tStart: number = 0, // animation: scroll the displayed time waves
): FilterView {
  const freqs = linspace(0, fs / 2, 256);
  const filterMag = freqs.map((f) => transferMag(filterType, f, fc, fc2));

  // Example input signal: sum of three tones
  const N = 512;
  const time = linspace(0, N / fs, N);
  const sigAt = (t: number): number =>
    Math.cos(2 * Math.PI * (signalFreq - 50) * t) +
    Math.cos(2 * Math.PI * signalFreq * t) +
    Math.cos(2 * Math.PI * (signalFreq + 50) * t);
  // Displayed input scrolls with tStart; spectrum from a fixed buffer (stationary).
  const timeSigInput = time.map((t) => sigAt(tStart + t));

  const spec = spectrum(
    time.map((t) => sigAt(t)),
    fs,
  );
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

  // Time shift t₀ does not affect |X(f)| (only the phase), so the magnitude plot
  // is unchanged; the time pulse slides. Proakis §2.2.2: x(t−t₀) ↔ X(f)e^{−j2πft₀}.
  const freqShifted = pair.freq.mag.map((mag) => mag * ampScale);

  // Slide the time pulse by t₀ via a circular roll of the sample array.
  const t = pair.time.t;
  const x = pair.time.x;
  const n = x.length;
  const dt = n > 1 ? t[1] - t[0] : 1;
  const shiftIdx = Math.round(timeShift / dt);
  const timeShifted = x.map((_, i) => {
    const j = (((i - shiftIdx) % n) + n) % n;
    return x[j] * ampScale;
  });

  return {
    timeDomain: { t, x: timeShifted },
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
  tStart: number = 0, // animation: scroll the bandpass signal
): AnalyticView {
  const N = 512;
  const time = linspace(0, N / fs, N);

  // AM signal: (1 + m*cos(2π*fm*t)) * cos(2π*fc*t), scrolled by tStart.
  const signal = time.map((t) => {
    const tt = tStart + t;
    return (1 + m * Math.cos(2 * Math.PI * fm * tt)) * Math.cos(2 * Math.PI * fc * tt);
  });

  const xhat = hilbert(signal); // Proakis §2.6: x̂(t) = Hilbert{x(t)}
  const result = lowpassEquivalent(signal, fc, fs);

  return {
    time,
    signal,
    analyticRe: signal, // Real part of analytic signal
    analyticIm: xhat, // Imag part = Hilbert transform (no longer stubbed to zeros)
    iComponent: result.i,
    qComponent: result.q,
    envelope: result.env,
  };
}
