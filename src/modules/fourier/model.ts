/**
 * Signals & Spectra module — data model for each panel.
 * Pure functions that compute display data from parameters.
 * Proakis & Salehi §2.1–§2.5.
 */

import { linspace, sinc } from '@/lib/dsp/math';
import {
  seriesCoeffs,
  seriesPartialSum,
  transferMag,
  ftPair,
  lowpassEquivalent,
  hilbert,
} from '@/lib/dsp/fourier';
import { spectrum } from '@/lib/dsp/fft';
import {
  evalSignal,
  periodicWave,
  rectPulse,
  triPulse,
  unitStep,
  sgn,
  expSignal,
  classifySignal,
  type Tone,
  type Periodic,
  type SignalClass,
} from '@/lib/dsp/signals';
import { convolve } from '@/lib/dsp/convolution';
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
  filterType: 'lpf' | 'hpf' | 'bpf' | 'bsf' | 'rc',
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

/** Tab 3: interactive Fourier-transform property demonstrator (§2.3.2). */
export type FtProperty = 'shift' | 'modulate' | 'scale' | 'amp';

export interface FtPropertyParams {
  t0: number;
  fcShift: number;
  scale: number;
  amp: number;
}

export interface FtPropertyView {
  timeDomain: { t: number[]; original: number[]; transformed: number[] };
  freqDomain: { f: number[]; magOriginal: number[]; mag: number[] };
}

export function buildFtProperty(
  kind: 'rect' | 'tri' | 'gauss',
  property: FtProperty,
  p: FtPropertyParams,
): FtPropertyView {
  const pair = ftPair(kind, 0.1);
  const t = pair.time.t;
  const f = pair.freq.f;
  const x0 = pair.time.x;
  const m0 = pair.freq.mag;
  const n = x0.length;
  const dt = n > 1 ? t[1] - t[0] : 1;

  let transformed = x0.slice();
  let mag = m0.slice();

  switch (property) {
    case 'shift': {
      // x(t−t₀) ↔ X(f)·e^{−j2πft₀}: |X(f)| unchanged, only phase changes.
      const k = Math.round(p.t0 / dt);
      transformed = x0.map((_, i) => x0[(((i - k) % n) + n) % n]);
      break;
    }
    case 'modulate': {
      // x(t)·cos(2πf₀t) ↔ ½[X(f−f₀)+X(f+f₀)]: spectrum copies up to ±f₀.
      transformed = x0.map((v, i) => v * Math.cos(2 * Math.PI * p.fcShift * t[i]));
      const ksh = Math.round(p.fcShift / (f[1] - f[0])) || 0;
      mag = m0.map(
        (_, i) =>
          0.5 *
          (m0[(((i - ksh) % m0.length) + m0.length) % m0.length] +
            m0[(((i + ksh) % m0.length) + m0.length) % m0.length]),
      );
      break;
    }
    case 'scale': {
      // x(at) ↔ (1/|a|)·X(f/a): compress time ⇒ stretch frequency.
      const a = p.scale || 1;
      transformed = x0.map((_, i) => {
        const src = Math.round((i - n / 2) / a + n / 2);
        return src >= 0 && src < n ? x0[src] : 0;
      });
      mag = m0.map((_, i) => {
        const src = Math.round((i - m0.length / 2) * a + m0.length / 2);
        return (src >= 0 && src < m0.length ? m0[src] : 0) / Math.abs(a);
      });
      break;
    }
    case 'amp': {
      // a·x(t) ↔ a·X(f).
      transformed = x0.map((v) => v * p.amp);
      mag = m0.map((v) => v * Math.abs(p.amp));
      break;
    }
  }

  return {
    timeDomain: { t, original: x0, transformed },
    freqDomain: { f, magOriginal: m0, mag },
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

/** Tab 4: baseband (centered at 0) vs bandpass (centered at ±fc) spectra. */
export interface BasebandBandpassView {
  freqs: number[];
  baseband: number[];
  bandpass: number[];
  W: number;
  fc: number;
  fs: number;
}

export function buildBasebandBandpass(W: number, fc: number, fs = 1000): BasebandBandpassView {
  const freqs = linspace(-fs / 2, fs / 2, 512);
  // Triangular baseband spectrum over [-W, W]; bandpass is it shifted to ±fc.
  const tri = (f: number, center: number, half: number) =>
    Math.max(0, 1 - Math.abs(f - center) / half);
  const baseband = freqs.map((f) => tri(f, 0, W));
  const bandpass = freqs.map((f) => tri(f, fc, W / 2) + tri(f, -fc, W / 2));
  return { freqs, baseband, bandpass, W, fc, fs };
}

// --- Tab 1: Signals & Systems (Proakis §2.1) ---

export type BasicKind = 'rect' | 'tri' | 'sinc' | 'step' | 'sgn' | 'exp' | 'sine';

export interface SignalOps {
  shift: number;
  scale: number;
  amp: number;
  reverse: boolean;
}

export interface SignalExplorerView {
  time: number[];
  original: number[];
  transformed: number[];
  classification: SignalClass;
}

function basicSignal(kind: BasicKind, t: number): number {
  switch (kind) {
    case 'rect':
      return rectPulse(t, 1);
    case 'tri':
      return triPulse(t, 1);
    case 'sinc':
      return sinc(t);
    case 'step':
      return unitStep(t);
    case 'sgn':
      return sgn(t);
    case 'exp':
      return expSignal(t, 0.5);
    case 'sine':
      return Math.sin(2 * Math.PI * t);
  }
}

/** Signal explorer: original vs operated signal + energy/symmetry classification. */
export function buildSignalExplorer(kind: BasicKind, ops: SignalOps): SignalExplorerView {
  const time = linspace(-2, 2, 401);
  const original = time.map((t) => basicSignal(kind, t));
  const a = ops.scale || 1;
  const transformed = time.map((t) => {
    const u = ((ops.reverse ? -1 : 1) * (t - ops.shift)) / a;
    return ops.amp * basicSignal(kind, u);
  });
  return { time, original, transformed, classification: classifySignal(time, original) };
}

export interface ConvolutionView {
  t: number[];
  x: number[];
  h: number[];
  y: number[];
  slideIndex: number;
}

/** Convolution (LTI): y(t) = x(t) * h(t), with an animated slide position. */
export function buildConvolution(
  xKind: 'rect' | 'tri',
  hKind: 'rect' | 'exp',
  clock: number,
): ConvolutionView {
  const t = linspace(-1, 3, 401);
  const dt = t[1] - t[0];
  const x = t.map((tt) => (xKind === 'rect' ? rectPulse(tt - 0.5, 1) : triPulse(tt - 0.5, 1)));
  const h = t.map((tt) => (hKind === 'rect' ? rectPulse(tt - 0.5, 1) : expSignal(tt, 0.4)));
  const full = convolve(x, h, dt);
  const y = full.slice(0, t.length);
  const slideIndex = Math.floor(((clock % 4) / 4) * t.length);
  return { t, x, h, y, slideIndex };
}
