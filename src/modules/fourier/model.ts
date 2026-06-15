/**
 * Signals & Spectra module — data model for each panel.
 * Pure functions that compute display data from parameters.
 * Proakis & Salehi §2.1–§2.5.
 */

import { linspace, sinc } from '@/lib/dsp/math';
import {
  seriesCoeffs,
  seriesPartialSum,
  ftPair,
  lowpassEquivalent,
  hilbert,
} from '@/lib/dsp/fourier';
import { butterworthMag, chebyshev1Mag, chebyshev2Mag } from '@/lib/dsp/analogfilters';
import { spectrum, type Complex } from '@/lib/dsp/fft';
import { analyticFt, type AnalyticFtKind } from '@/lib/dsp/ftpairs';
import { signalEnergy } from '@/lib/dsp/energy';
import { occupiedBandwidth } from '@/lib/dsp/bandwidth';
import { bandpassFilterFFT } from '@/lib/dsp/am-impl';
import {
  evalSignal,
  periodicWave,
  rectPulse,
  triPulse,
  unitStep,
  sgn,
  expSignal,
  unitImpulse,
  twoSidedExp,
  gaussianPulse,
  dampedSine,
  classifySignal,
  type Tone,
  type Periodic,
  type SignalClass,
} from '@/lib/dsp/signals';
import { window as windowFunc, type WindowType } from '@/lib/dsp/window';

// --- Fourier Series — extended waveform set (includes non-Periodic types) ---

/** All waveforms selectable in the Fourier Series section. */
export type SeriesWaveKind =
  | Periodic // 'square' | 'triangle' | 'sawtooth' | 'pulse'
  | 'sine'
  | 'cosine'
  | 'half_rect'
  | 'full_rect'
  | 'dirac_comb';

/** Educational metadata for each selectable waveform. */
export interface WaveformInfo {
  label: string;
  /** KaTeX string for the Fourier series formula (compact form). */
  formula: string;
  /** Which harmonics are present, e.g. "Odd only", "All", "Even + DC". */
  harmonics: string;
  /** Coefficient decay rate, e.g. "1/n", "1/n²", "Flat". */
  convergence: string;
  /** One-sentence plain-language description for students. */
  description: string;
}

/** Proakis & Salehi Table 2.1 + §2.1 reference data for all selectable series waveforms. */
export const WAVEFORM_INFO: Record<SeriesWaveKind, WaveformInfo> = {
  square: {
    label: 'Square',
    formula: '\\frac{4}{\\pi}\\sum_{n\\,\\text{odd}}\\frac{\\sin(2\\pi n f_0 t)}{n}',
    harmonics: 'Odd harmonics only',
    convergence: '1/n (slow)',
    description: 'Sudden jumps cause slow convergence and the ~9% Gibbs overshoot that never fully disappears.',
  },
  triangle: {
    label: 'Triangle',
    formula: '\\frac{8}{\\pi^2}\\sum_{n\\,\\text{odd}}\\frac{\\cos(2\\pi n f_0 t)}{n^2}',
    harmonics: 'Odd harmonics only',
    convergence: '1/n² (fast)',
    description: 'Kinks (not jumps) → coefficients decay as 1/n², so fewer harmonics reconstruct it well.',
  },
  sawtooth: {
    label: 'Sawtooth',
    formula: '\\frac{2}{\\pi}\\sum_{n=1}^{N}\\frac{(-1)^{n+1}}{n}\\sin(2\\pi n f_0 t)',
    harmonics: 'All harmonics',
    convergence: '1/n (slow)',
    description: 'One jump per period → slow convergence like square, but all harmonics (odd and even) are present.',
  },
  pulse: {
    label: 'Pulse train',
    formula: 'd+\\frac{2}{\\pi}\\sum_{n=1}^{N}\\frac{\\sin(\\pi nd)}{n}\\cos(2\\pi nf_0t)',
    harmonics: 'All (sinc envelope)',
    convergence: '1/n (sinc-weighted)',
    description: 'Duty cycle d controls the sinc-shaped spectral envelope; narrower pulse → wider, flatter spectrum.',
  },
  sine: {
    label: 'Sine',
    formula: '\\sin(2\\pi f_0 t)',
    harmonics: 'Single harmonic',
    convergence: 'Exact at N = 1',
    description: 'The elementary building block — already a perfect Fourier series with exactly one term.',
  },
  cosine: {
    label: 'Cosine',
    formula: '\\cos(2\\pi f_0 t)',
    harmonics: 'Single harmonic',
    convergence: 'Exact at N = 1',
    description: 'Same as sine but π/2 phase-shifted. One spectral line at f₀ with unit amplitude.',
  },
  half_rect: {
    label: 'Half-wave rect.',
    formula: '\\tfrac{1}{\\pi}+\\tfrac{1}{2}\\sin\\omega_0t+\\tfrac{2}{\\pi}\\sum_{n=1}^{\\infty}\\tfrac{(-1)^{n-1}}{4n^2-1}\\cos 2n\\omega_0t',
    harmonics: 'DC + fund. + even',
    convergence: '1/n² (fast)',
    description: 'Clipping negative half-cycles introduces a DC offset and generates even harmonics of the fundamental.',
  },
  full_rect: {
    label: 'Full-wave rect.',
    formula: '\\tfrac{2}{\\pi}+\\tfrac{4}{\\pi}\\sum_{n=1}^{\\infty}\\tfrac{\\cos(2n\\omega_0t)}{4n^2-1}',
    harmonics: 'DC + even harmonics',
    convergence: '1/n² (fast)',
    description: 'Flipping negative half-cycles doubles the frequency — the fundamental vanishes, only even harmonics remain.',
  },
  dirac_comb: {
    label: 'Dirac comb',
    formula: '\\sum_k\\delta(t-k/f_0)=f_0\\sum_{n=-\\infty}^{\\infty}e^{j2\\pi nf_0t}',
    harmonics: 'All equal amplitude',
    convergence: 'Flat (no decay)',
    description: 'Periodic impulse train has a perfectly flat line spectrum — all harmonics have identical amplitude f₀.',
  },
};

/** Flat list of all selectable series waveforms for the <Select> control. */
export const SERIES_WAVE_OPTIONS: { value: SeriesWaveKind; label: string }[] = [
  { value: 'sine',       label: 'Sine' },
  { value: 'cosine',     label: 'Cosine' },
  { value: 'square',     label: 'Square wave' },
  { value: 'triangle',   label: 'Triangle wave' },
  { value: 'sawtooth',   label: 'Sawtooth' },
  { value: 'half_rect',  label: 'Half-wave rectified' },
  { value: 'full_rect',  label: 'Full-wave rectified' },
  { value: 'dirac_comb', label: 'Dirac comb' },
  { value: 'pulse',      label: 'Pulse train' },
];

/** Evaluate a non-Periodic series waveform at time t (f0 sets the frequency). */
function evalExtWave(kind: Exclude<SeriesWaveKind, Periodic>, f0: number, t: number): number {
  const phi = f0 * t; // normalized phase (period = 1)
  const frac = phi - Math.floor(phi); // [0, 1)
  switch (kind) {
    case 'sine':      return Math.sin(2 * Math.PI * phi);
    case 'cosine':    return Math.cos(2 * Math.PI * phi);
    case 'half_rect': return Math.max(0, Math.sin(2 * Math.PI * phi));
    case 'full_rect': return Math.abs(Math.sin(2 * Math.PI * phi));
    case 'dirac_comb':return frac < 0.025 || frac > 0.975 ? 1 : 0; // narrow pulse at each period
  }
}

/**
 * Pre-compute complex Fourier series coefficients via DFT for non-analytic waveforms.
 * Returns { dc, an (cosine), bn (sine) } for harmonics n = 1..N.
 * Proakis §2.1: cₙ = (1/T₀) ∫ x(t) e^{-j2πnf₀t} dt.
 */
function dftSeriesCoeffs(
  kind: Exclude<SeriesWaveKind, Periodic>,
  f0: number,
  N: number,
): { dc: number; an: number[]; bn: number[] } {
  const M = 4096; // samples per period (power-of-2 for speed)
  // Sample one complete period [0, 1/f0)
  const x = Array.from({ length: M }, (_, k) => evalExtWave(kind, f0, k / (M * f0)));

  const dc = x.reduce((s, v) => s + v, 0) / M;
  const an: number[] = [];
  const bn: number[] = [];

  for (let n = 1; n <= N; n++) {
    let re = 0;
    let im = 0;
    for (let k = 0; k < M; k++) {
      const angle = (2 * Math.PI * n * k) / M;
      re += x[k] * Math.cos(angle);
      im -= x[k] * Math.sin(angle);
    }
    an.push((2 * re) / M); // cosine coefficient a_n
    bn.push((-2 * im) / M); // sine coefficient b_n
  }

  return { dc, an, bn };
}

/** Panel 1: Fourier Series Synthesis */
export interface SeriesSynthView {
  time: number[];
  ideal: number[];
  partial: number[];
  freqs: number[];
  mags: number[];
  phases: number[]; // ∠cₙ in radians, one per freq
  c1Mag: number;
  dcMag: number;
}

const NATIVE_PERIODIC: readonly Periodic[] = ['square', 'triangle', 'sawtooth', 'pulse'];

export function buildSeriesSynth(
  kind: SeriesWaveKind,
  f0: number,
  N: number,
  duty: number = 0.5,
  tStart: number = 0, // animation: scroll the time window by tStart seconds
): SeriesSynthView {
  const tDuration = 2.0; // fixed 2-second window; signal compresses as f0 increases
  const tSamples = 4096;
  // Local (fixed) display axis [0, tDuration]; the signal is sampled tStart ahead,
  // so increasing tStart scrolls the waveform left while the axis stays put.
  const time = linspace(0, tDuration, tSamples);

  let ideal: number[];
  let partial: number[];
  let freqs: number[];
  let mags: number[];
  let phases: number[];

  if ((NATIVE_PERIODIC as string[]).includes(kind)) {
    // Analytic path: use closed-form coefficients from Proakis Table 2.1.
    // Phase ∠cₙ derived from the synthesis formula for each waveform:
    //   sin terms  → cₙ = -j·Aₙ/2 → phase = -π/2 (if Aₙ>0) or +π/2 (if Aₙ<0)
    //   cos terms  → cₙ = Aₙ/2 (real) → phase = 0 (if Aₙ>0) or π (if Aₙ<0)
    const nativeKind = kind as Periodic;
    ideal = time.map((t) => periodicWave(nativeKind, f0, tStart + t, duty));
    partial = time.map((t) => seriesPartialSum(nativeKind, f0, N, tStart + t, duty));
    const coeffs = seriesCoeffs(nativeKind, f0, N, duty);
    freqs = coeffs.map((c) => c.freq);
    mags = coeffs.map((c) => c.mag);
    phases = coeffs.map((c) => {
      if (c.mag < 1e-12) return 0;
      const n = f0 > 0 ? Math.round(c.freq / f0) : 0;
      switch (nativeKind) {
        case 'square':
          // (4/π) Σ_{n odd} (1/n) sin → sine form, cₙ = -j·(2/(nπ)) → phase = -π/2
          return -Math.PI / 2;
        case 'triangle':
          // (8/π²) Σ_{n odd} (1/n²) cos — all coefficients positive → phase = 0
          return 0;
        case 'sawtooth':
          // (2/π) Σ (-1)^{n+1}/n sin → cₙ = -j·(-1)^{n+1}/(nπ)
          // odd n: positive * (-j) → phase = -π/2; even n: negative * (-j) → phase = +π/2
          return Math.pow(-1, n + 1) > 0 ? -Math.PI / 2 : Math.PI / 2;
        case 'pulse':
          // d + Σ 2sin(πnd)/(πn) cos → cₙ real; sign = sign of 2sin(πnd)/(πn)
          if (n === 0) return 0; // DC always zero phase
          return Math.sin(Math.PI * n * duty) >= 0 ? 0 : Math.PI;
      }
    });
  } else {
    // Numeric DFT path for extended waveforms (sine, cosine, half_rect, full_rect, dirac_comb).
    const extKind = kind as Exclude<SeriesWaveKind, Periodic>;
    const { dc, an, bn } = dftSeriesCoeffs(extKind, f0, N);

    ideal = time.map((t) => evalExtWave(extKind, f0, tStart + t));
    partial = time.map((t) => {
      let sum = dc;
      for (let n = 0; n < an.length; n++) {
        const freq = (n + 1) * f0;
        const phi = 2 * Math.PI * freq * (tStart + t);
        sum += an[n] * Math.cos(phi) + bn[n] * Math.sin(phi);
      }
      return sum;
    });

    freqs = [0, ...Array.from({ length: N }, (_, i) => (i + 1) * f0)];
    mags = [Math.abs(dc), ...an.map((a, i) => Math.sqrt(a * a + bn[i] * bn[i]))];
    // cₙ = (aₙ - j·bₙ)/2 → ∠cₙ = atan2(-bₙ, aₙ) — Proakis §2.1 convention
    phases = [dc >= 0 ? 0 : Math.PI, ...an.map((a, i) => Math.atan2(-bn[i], a))];
  }

  const c1Idx = freqs.findIndex((f) => f > 0);
  const c1Mag = c1Idx >= 0 ? mags[c1Idx] : 0;
  const dcIdx = freqs.findIndex((f) => f === 0);
  const dcMag = dcIdx >= 0 ? mags[dcIdx] : 0;

  return { time, ideal, partial, freqs, mags, phases, c1Mag, dcMag };
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
  N: number = 4096,
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

/**
 * Realizable lowpass filters: compare the ideal brick-wall against the
 * Butterworth and Chebyshev (type I / II) approximations of a chosen order.
 * Magnitude is returned both linearly (|H|) and in dB so the roll-off slope
 * (−20N dB/decade) and the equiripple behaviour are legible.
 */
export interface RealizableFilterView {
  freqs: number[];
  ideal: number[];
  butterworth: number[];
  cheby1: number[];
  cheby2: number[];
  idealDb: number[];
  butterworthDb: number[];
  cheby1Db: number[];
  cheby2Db: number[];
}

const REALFILT_DB_FLOOR = -80; // clamp for log display so −∞ does not blow up the axis

export function buildRealizableFilters(
  fc: number,
  order: number,
  rippleDb: number,
  stopDb: number,
  fMax: number = 100,
): RealizableFilterView {
  const freqs = linspace(0, fMax, 2048);
  const toDb = (m: number): number => Math.max(REALFILT_DB_FLOOR, 20 * Math.log10(Math.max(m, 1e-12)));

  const ideal = freqs.map((f) => (f <= fc ? 1 : 0));
  const butterworth = freqs.map((f) => butterworthMag(f, fc, order));
  const cheby1 = freqs.map((f) => chebyshev1Mag(f, fc, order, rippleDb));
  const cheby2 = freqs.map((f) => chebyshev2Mag(f, fc, order, stopDb));

  return {
    freqs,
    ideal,
    butterworth,
    cheby1,
    cheby2,
    idealDb: ideal.map((m) => (m > 0 ? 0 : REALFILT_DB_FLOOR)),
    butterworthDb: butterworth.map(toDb),
    cheby1Db: cheby1.map(toDb),
    cheby2Db: cheby2.map(toDb),
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
  const N = 4096;
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

export interface HilbertView {
  time: number[];
  signal: number[];
  xhat: number[]; // Hilbert transform x̂(t)
}

/**
 * Compute a signal from the Basic Signals catalog and its Hilbert transform.
 * Proakis §2.6 (p. 95): x̂(t) = (1/π) ∫ x(τ)/(t−τ) dτ.
 * Uses N=2048 samples over [tMin, tMax] so the FFT-based hilbert() has enough resolution.
 */
export function buildHilbertView(
  kind: BasicKind,
  F: number,
  tMin: number,
  tMax: number,
  N = 2048,
): HilbertView {
  const time = linspace(tMin, tMax, N);
  const signal = time.map((t) => basicSignal(kind, F * t));
  const xhat = hilbert(signal);
  return { time, signal, xhat };
}

/** Tab 5: baseband (centered at 0) vs bandpass (centered at ±fc) spectra of a chosen message. */
export interface BasebandBandpassView {
  freqs: number[];
  baseband: number[]; // normalized |X(f)| of the message, peak 1, centered at f=0
  bandpass: number[]; // the same shape translated to ±fc (modulation theorem), peak 1 per lobe
  kind: BasebandKind;
  F: number;
  fc: number;
  fs: number;
}

/** Curated baseband-suitable messages (lowpass energy pulses with a closed-form FT). */
export type BasebandKind = Extract<BasicKind, 'rect' | 'tri' | 'sinc' | 'gaussian'>;

const BASEBAND_TAU = 0.5; // fixed pulse width for the message FT scaling

/**
 * Baseband vs bandpass spectra for a chosen message — Proakis & Salehi §2.7 (p. 98).
 * The baseband magnitude |X_ℓ(f)| is the closed-form FT of the message (Table 2.1),
 * frequency-scaled so its first null sits near f = F. The bandpass spectrum applies
 * the modulation theorem X(f) = ½[X_ℓ(f-fc) + X_ℓ(f+fc)] — i.e. the SAME shape shifted
 * to ±fc. Shifting in frequency (not modulating in time) avoids any sampling/aliasing.
 */
export function buildBasebandBandpassSignal(
  kind: BasebandKind,
  F: number,
  fc: number,
  fs = 1000,
): BasebandBandpassView {
  const freqs = linspace(-fs / 2, fs / 2, 4096);
  // |X_ℓ(f)| of the unit message, scaled so the spectrum stretches with F (null ≈ F Hz).
  const mag = (f: number): number => {
    const X = analyticFt(kind as AnalyticFtKind, f / F, BASEBAND_TAU);
    return Math.hypot(X.re, X.im);
  };
  const rawBB = freqs.map((f) => mag(f));
  const peak = Math.max(...rawBB, 1e-12);
  const baseband = rawBB.map((v) => v / peak);
  // Translate the (unit-peak) message spectrum to ±fc; lobes are unit-peak when fc > F.
  const bandpass = freqs.map((f) => (mag(f - fc) + mag(f + fc)) / peak);
  return { freqs, baseband, bandpass, kind, F, fc, fs };
}

/** Tab "I/Q Representation": QAM-style bandpass build + coherent I/Q recovery (Proakis §2.7). */
export interface IQRepresentationView {
  time: number[];
  signal: number[]; // bandpass x(t) = x_c·cos − x_s·sin
  xcTrue: number[]; // true in-phase message x_c(t)
  xsTrue: number[]; // true quadrature message x_s(t)
  iRec: number[]; // recovered I = LPF{ 2·x·cos }
  qRec: number[]; // recovered Q = LPF{ −2·x·sin }
  envelope: number[]; // V(t) = √(x_c² + x_s²)
}

/**
 * Assemble a bandpass signal from two independent baseband messages assigned to the
 * in-phase and quadrature channels, then recover them by coherent demodulation.
 * Proakis & Salehi §2.7: x(t) = x_c(t)·cos(2πf_c t) − x_s(t)·sin(2πf_c t).
 *
 * Recovery (coherent, unity-gain): mixing by ±2·carrier moves the wanted component to
 * baseband and the unwanted to ±2f_c; a lowpass with cutoff f_c (between the message
 * band W and 2f_c, given the narrowband condition W ≪ f_c) returns x_c and x_s.
 * Pulses are localised and ≈0 at the window edges, so the FFT lowpass (circular) is
 * artifact-free — unlike a Hilbert transform of a sustained carrier.
 */
export function buildIQRepresentation(
  iKind: BasebandKind,
  qKind: BasebandKind,
  W: number, // message bandwidth / pulse-scale (Hz)
  fc: number, // carrier (Hz)
  fs = 4000, // ≥ 4·f_c,max so the discarded 2f_c product is representable
): IQRepresentationView {
  const N = 4096;
  const T = N / fs; // ≈ 1.024 s
  const time = linspace(-T / 2, T / 2, N);

  // Messages: unit-shape pulses scaled by W (width ∝ 1/W), centred in the window.
  const xcTrue = time.map((t) => basicSignal(iKind, W * t));
  const xsTrue = time.map((t) => basicSignal(qKind, W * t));

  // Modulate to bandpass (§2.7 sign convention: −sin on the quadrature term).
  const signal = time.map(
    (t, i) =>
      xcTrue[i] * Math.cos(2 * Math.PI * fc * t) - xsTrue[i] * Math.sin(2 * Math.PI * fc * t),
  );

  // Coherent demodulation, then lowpass to f_c (removes the 2f_c products).
  const iMix = signal.map((v, i) => 2 * v * Math.cos(2 * Math.PI * fc * time[i]));
  const qMix = signal.map((v, i) => -2 * v * Math.sin(2 * Math.PI * fc * time[i]));
  const iRec = bandpassFilterFFT(iMix, fs, 0, fc);
  const qRec = bandpassFilterFFT(qMix, fs, 0, fc);

  const envelope = time.map((_, i) => Math.hypot(xcTrue[i], xsTrue[i]));

  return { time, signal, xcTrue, xsTrue, iRec, qRec, envelope };
}

// --- Tab 1: Signals & Systems (Proakis §2.1) ---

export type BasicKind =
  // Periodic
  | 'sine' | 'cosine' | 'square' | 'sawtooth' | 'tri_wave'
  | 'half_rect' | 'full_rect' | 'dirac_comb'
  // Aperiodic
  | 'impulse' | 'rect' | 'tri' | 'sinc' | 'step' | 'sgn'
  | 'ramp' | 'exp' | 'exp2' | 'damped_sine' | 'gaussian' | 'chirp';

/**
 * Single source of truth for the selectable signal shapes, grouped for the
 * native <optgroup> menus. Shared by the Basic Signals and Convolution tabs so
 * both always offer the same set.
 */
export const SIGNAL_GROUPS: { group: string; options: { value: BasicKind; label: string }[] }[] = [
  {
    group: 'Periodic',
    options: [
      { value: 'sine', label: 'Sine' },
      { value: 'cosine', label: 'Cosine' },
      { value: 'square', label: 'Square wave' },
      { value: 'sawtooth', label: 'Sawtooth' },
      { value: 'tri_wave', label: 'Triangle wave' },
      { value: 'half_rect', label: 'Half-wave rectified' },
      { value: 'full_rect', label: 'Full-wave rectified' },
      { value: 'dirac_comb', label: 'Dirac comb' },
    ],
  },
  {
    group: 'Aperiodic',
    options: [
      { value: 'impulse', label: 'Unit impulse δ(t)' },
      { value: 'step', label: 'Unit step u(t)' },
      { value: 'ramp', label: 'Ramp r(t)' },
      { value: 'sgn', label: 'Signum sgn(t)' },
      { value: 'rect', label: 'Rectangular pulse Π(t)' },
      { value: 'tri', label: 'Triangular pulse Λ(t)' },
      { value: 'exp', label: 'Decaying exponential' },
      { value: 'exp2', label: 'Two-sided exponential' },
      { value: 'damped_sine', label: 'Damped sine' },
      { value: 'gaussian', label: 'Gaussian pulse' },
      { value: 'sinc', label: 'Sinc' },
      { value: 'chirp', label: 'Linear chirp' },
    ],
  },
];

export interface SignalOps {
  t0: number;      // time shift (s)
  F: number;       // rate/frequency: x(t) = A·g(F·(t'−t₀)), sine→sin(2πFt)
  amp: number;     // amplitude A
  reverse: boolean;
  tau: number;     // time constant for exponential: e^{-t/τ}·u(t)
  // axis settings
  tMin: number;
  tMax: number;
  N: number;
}

export interface SignalExplorerView {
  time: number[];
  original: number[];
  transformed: number[];
  classification: SignalClass;
  audioWavetable: number[]; // fixed t∈[-1,1] buffer for stable audio playback
}

function basicSignal(kind: BasicKind, t: number, tau = 0.5): number {
  switch (kind) {
    // Periodic (period = 1 in t-units, i.e. period = 1/F in real time)
    case 'sine':       return Math.sin(2 * Math.PI * t);
    case 'cosine':     return Math.cos(2 * Math.PI * t);
    case 'square':     return Math.sign(Math.sin(2 * Math.PI * t));
    case 'sawtooth':   return 2 * (t - Math.floor(t)) - 1;          // rising, ∈[−1,1)
    case 'tri_wave':   return 1 - 4 * Math.abs(t - Math.floor(t + 0.5)); // ∈[−1,1]
    case 'half_rect':  return Math.max(0, Math.sin(2 * Math.PI * t));
    case 'full_rect':  return Math.abs(Math.sin(2 * Math.PI * t));
    case 'dirac_comb': return Math.abs(t - Math.round(t)) < 0.1 ? 1 : 0; // impulse at each integer
    // Aperiodic
    case 'impulse':    return unitImpulse(t);
    case 'rect':       return rectPulse(t, 1);
    case 'tri':        return triPulse(t, 1);
    case 'sinc':       return sinc(t);
    case 'step':       return unitStep(t);
    case 'sgn':        return sgn(t);
    case 'ramp':       return t >= 0 ? t : 0;
    case 'exp':        return expSignal(t, tau);
    case 'exp2':       return twoSidedExp(t, tau);
    case 'damped_sine': return dampedSine(t, tau);
    case 'gaussian':   return gaussianPulse(t, tau);
    case 'chirp':      return t >= 0 ? Math.sin(Math.PI * t * t) : 0;
  }
}

/**
 * Signal explorer: original vs operated signal + energy/symmetry classification.
 * Equation (Proakis §2.1): x(t) = A · g(F · (t' − t₀)), t' = −t if reverse else t.
 * F is a time-rate: for sine → sin(2πF·t); for pulses → width ∝ 1/F.
 */
export function buildSignalExplorer(kind: BasicKind, ops: SignalOps): SignalExplorerView {
  const n = Math.max(100, Math.min(4096, ops.N));
  const time = linspace(ops.tMin, ops.tMax, n);
  const F = ops.F || 1;

  const tau = ops.tau > 0 ? ops.tau : 0.5;
  const original = time.map((t) => basicSignal(kind, t, tau));
  const transformed = time.map((t) => {
    const tp = ops.reverse ? -t : t;
    return ops.amp * basicSignal(kind, F * (tp - ops.t0), tau);
  });

  // Fixed t∈[-1,1] wavetable so audio pitch stays stable regardless of axis settings
  const audioTime = linspace(-1, 1, 201);
  const audioWavetable = audioTime.map((t) => {
    const tp = ops.reverse ? -t : t;
    return ops.amp * basicSignal(kind, F * (tp - ops.t0), tau);
  });

  return { time, original, transformed, classification: classifySignal(time, original), audioWavetable };
}

// --- Convolution lab (Proakis §2.1.5): interactive flip-and-slide ---

/** Convolution lab time window [τ_min, τ_max] — symmetric, wide enough for every preset. */
export const CONV_T_MIN = -4;
export const CONV_T_MAX = 4;
const CONV_SAMPLES = 641; // dt = 8/640 = 0.0125 s

/** Shape-only convolution data: signals and the full y(t) curve (slide-independent). */
export interface ConvCurve {
  /** Shared τ / t sample grid. */
  t: number[];
  dt: number;
  /** Input x(τ). */
  x: number[];
  /** Impulse response h(τ). */
  h: number[];
  /** Full convolution curve y(t) = ∫ x(τ) h(t − τ) dτ over the grid. */
  y: number[];
  hKind: BasicKind;
}

/** Slide-dependent overlap data for the current position t (cheap, per-frame). */
export interface ConvOverlap {
  /** Flipped, shifted response h(slideT − τ), plotted over τ in the overlap panel. */
  hReflected: number[];
  /** Pointwise product x(τ)·h(slideT − τ) (its area = y(slideT)). */
  product: number[];
  /** Current slide position t. */
  slideT: number;
  /** Convolution value at the slide position = area under `product`. */
  yAtSlide: number;
}

/**
 * Build the signals and the full convolution curve (Proakis & Salehi §2.1.5,
 * p. 41: y(t) = ∫ x(τ) h(t − τ) dτ). This part depends only on the chosen signal
 * shapes, so the UI memoizes it and only recomputes when a preset changes.
 *
 * The y(t) curve uses the same direct discrete summation as {@link buildConvOverlap},
 * so the shaded overlap area is, by construction, exactly the marked y(t) point.
 */
export function buildConvCurve(xKind: BasicKind, hKind: BasicKind): ConvCurve {
  const t = linspace(CONV_T_MIN, CONV_T_MAX, CONV_SAMPLES);
  const dt = t[1] - t[0];
  const x = t.map((tau) => basicSignal(xKind, tau));
  const h = t.map((tau) => basicSignal(hKind, tau));
  const y = t.map((tk) => {
    let sum = 0;
    for (let i = 0; i < x.length; i++) sum += x[i] * basicSignal(hKind, tk - t[i]);
    return sum * dt;
  });
  return { t, dt, x, h, y, hKind };
}

/** Compute the flip-and-slide overlap traces and area for one slide position. */
export function buildConvOverlap(curve: ConvCurve, slideT: number): ConvOverlap {
  const { t, dt, x, hKind } = curve;
  const hReflected = t.map((tau) => basicSignal(hKind, slideT - tau));
  const product = x.map((xi, i) => xi * hReflected[i]);
  const yAtSlide = product.reduce((acc, p) => acc + p, 0) * dt;
  return { hReflected, product, slideT, yAtSlide };
}

// --- Spectrum Explorer: Fourier transform of any Basic Signal (Proakis §2.3) ---

/** Operations applied to the chosen signal in the Spectrum Explorer. */
export interface SpectrumOps {
  amp: number; // A
  t0: number; // time shift (s)
  F: number; // frequency / time-scale
  tau: number; // time constant / width for exp/exp2/gaussian/damped_sine
  reverse: boolean; // time reversal
  modOn: boolean; // multiply by cos(2πf_m t)
  fm: number; // modulation frequency (Hz)
}

/** Analytic-overlay descriptor: a continuous curve, a line spectrum, or none. */
export type SpectrumOverlay =
  | { type: 'curve'; f: number[]; mag: number[]; phase: number[] }
  | { type: 'line'; f: number[]; mag: number[] }
  | { type: 'none'; reason: string };

export interface SpectrumExplorerView {
  // Time domain (analysis/display buffer)
  time: number[];
  x: number[]; // operated signal
  xOriginal: number[]; // un-operated reference
  // Numeric two-sided spectrum in physical units (|X(f)| ≈ ∫x e^{-j2πft} dt)
  freq: number[];
  mag: number[];
  magDb: number[]; // 20·log10(|X|/max), floored
  phase: number[]; // ∠X(f), masked to NaN where |X| is negligible
  // Analytic overlay (Proakis Table 2.1)
  overlay: SpectrumOverlay;
  // Readouts
  bandwidth: number; // null-to-null (Hz)
  eTime: number; // ∫|x|²dt
  eFreq: number; // ∫|X|²df (Parseval check)
  peakF: number; // |X(f)| peak frequency (Hz)
  classification: SignalClass;
}

/** Energy signals with a closed-form FT (continuous curve overlay). */
const ENERGY_OVERLAY: Partial<Record<BasicKind, AnalyticFtKind>> = {
  rect: 'rect', tri: 'tri', exp: 'exp', exp2: 'exp2', sinc: 'sinc', damped_sine: 'damped_sine',
};
/** Periodic signals → line-spectrum overlay via Fourier-series coefficients. */
const LINE_OVERLAY: Partial<Record<BasicKind, SeriesWaveKind>> = {
  sine: 'sine', cosine: 'cosine', square: 'square', sawtooth: 'sawtooth', tri_wave: 'triangle',
  half_rect: 'half_rect', full_rect: 'full_rect', dirac_comb: 'dirac_comb',
};

const SPEC_T_WIN = 20; // analysis window [-10, 10] s
const SPEC_N = 4096; // FFT length (power of 2)
const PHASE_EPS = 1e-3; // mask phase where |X| < PHASE_EPS·max|X|
const DB_FLOOR = -120;

/**
 * Build the Spectrum Explorer view: numerical FFT of the operated signal in
 * physical units plus the book's analytic transform as an overlay.
 *
 * Physical scaling (Proakis Eq. 2.3.1): for samples xₙ = x(t_start + n·dt),
 * X(f_k) ≈ dt·e^{-j2πf_k·t_start}·DFT{xₙ}. Hence |X(f_k)| = dt·N·(|DFT|/N) and
 * the phase carries a −2πf·t_start term that we remove so the result matches
 * the closed-form transform.
 */
export function buildSpectrumExplorer(
  kind: BasicKind,
  ops: SpectrumOps,
  windowType: WindowType = 'rect',
): SpectrumExplorerView {
  const { amp, t0, F, tau, reverse, modOn, fm } = ops;
  const Feff = F || 1;

  // Analysis buffer (also used for display).
  const time = linspace(-SPEC_T_WIN / 2, SPEC_T_WIN / 2, SPEC_N);
  const dt = time[1] - time[0];
  const fs = 1 / dt;
  const tStart = time[0];

  const sampleOp = (t: number): number => {
    const tp = reverse ? -t : t;
    let s = amp * basicSignal(kind, Feff * (tp - t0), tau);
    if (modOn) s *= Math.cos(2 * Math.PI * fm * t);
    return s;
  };
  const x = time.map(sampleOp);
  const xOriginal = time.map((t) => basicSignal(kind, t, tau));

  // Windowed FFT.
  const win = windowFunc(windowType, SPEC_N);
  const winGain = win.reduce((a, b) => a + b, 0) / SPEC_N; // coherent gain
  const windowed = x.map((v, i) => v * win[i]);
  const spec = spectrum(windowed, fs);

  // Physical magnitude and time-origin-corrected, masked phase.
  const physFactor = (dt * SPEC_N) / (winGain || 1);
  const mag = spec.mag.map((m) => m * physFactor);
  const maxMag = Math.max(...mag, 1e-12);
  const phase = spec.phase.map((p, i) => {
    if (mag[i] < PHASE_EPS * maxMag) return NaN;
    let ph = p - 2 * Math.PI * spec.freq[i] * tStart;
    ph = Math.atan2(Math.sin(ph), Math.cos(ph)); // wrap to [-π, π]
    return ph;
  });
  const magDb = mag.map((m) => Math.max(20 * Math.log10(m / maxMag), DB_FLOOR));

  // Readouts.
  const df = fs / SPEC_N;
  const eFreq = mag.reduce((s, m) => s + m * m, 0) * df;
  const eTime = signalEnergy(x, dt);
  // Occupied (99% energy) bandwidth — stable under time shift/scaling, unlike a
  // null-to-null threshold walk which jitters when sampled nulls miss exact zero.
  const bandwidth = occupiedBandwidth(spec.freq, mag, 0.99).W;
  let peakI = 0;
  for (let i = 1; i < mag.length; i++) if (mag[i] > mag[peakI]) peakI = i;
  const peakF = spec.freq[peakI];

  const overlay = buildOverlay(kind, ops, spec.freq);

  return {
    time, x, xOriginal,
    freq: spec.freq, mag, magDb, phase,
    overlay,
    bandwidth, eTime, eFreq, peakF,
    classification: classifySignal(time, xOriginal),
  };
}

/** Closed-form transform overlay matching the operated signal. */
function buildOverlay(kind: BasicKind, ops: SpectrumOps, freq: number[]): SpectrumOverlay {
  const { amp, t0, F, tau, reverse, modOn, fm } = ops;
  const Feff = F || 1;

  const aKind = ENERGY_OVERLAY[kind];
  if (aKind) {
    // Hₛ(f) = (1/|F|)·G(f/F); operated X(f) adds amplitude, shift and reversal.
    const baseHs = (fq: number): Complex => {
      const G = analyticFt(aKind, fq / Feff, tau);
      const inv = 1 / Math.abs(Feff);
      return { re: G.re * inv, im: G.im * inv };
    };
    const Xop = (fq: number): Complex => {
      const Hs = baseHs(reverse ? -fq : fq);
      const ph = (reverse ? 1 : -1) * 2 * Math.PI * fq * t0; // shift theorem
      const c = Math.cos(ph), s = Math.sin(ph);
      return { re: amp * (Hs.re * c - Hs.im * s), im: amp * (Hs.re * s + Hs.im * c) };
    };
    const Xf = (fq: number): Complex => {
      if (!modOn) return Xop(fq);
      const a = Xop(fq - fm), b = Xop(fq + fm); // ½[X(f−f₀)+X(f+f₀)]
      return { re: 0.5 * (a.re + b.re), im: 0.5 * (a.im + b.im) };
    };
    const cval = freq.map(Xf);
    const mag = cval.map((c) => Math.hypot(c.re, c.im));
    const mMax = Math.max(...mag, 1e-12);
    const phase = cval.map((c, i) => (mag[i] < PHASE_EPS * mMax ? NaN : Math.atan2(c.im, c.re)));
    return { type: 'curve', f: freq, mag, phase };
  }

  const sKind = LINE_OVERLAY[kind];
  if (sKind) {
    // Two-sided line spectrum: |c_n| = A_n/2 at ±n·F (+ DC), scaled by amplitude.
    const Nharm = 16;
    const f: number[] = [];
    const mag: number[] = [];
    const push = (freqVal: number, height: number) => {
      f.push(freqVal);
      mag.push(Math.abs(amp) * height);
    };
    if (sKind === 'square' || sKind === 'triangle' || sKind === 'sawtooth') {
      for (const c of seriesCoeffs(sKind, Feff, Nharm)) {
        if (c.mag < 1e-9) continue;
        push(c.freq, c.mag / 2);
        push(-c.freq, c.mag / 2);
      }
    } else {
      const ext = sKind as Exclude<SeriesWaveKind, Periodic>;
      const { dc, an, bn } = dftSeriesCoeffs(ext, Feff, Nharm);
      if (Math.abs(dc) > 1e-9) push(0, Math.abs(dc));
      for (let n = 0; n < an.length; n++) {
        const An = Math.hypot(an[n], bn[n]);
        if (An < 1e-9) continue;
        push((n + 1) * Feff, An / 2);
        push(-(n + 1) * Feff, An / 2);
      }
    }
    return { type: 'line', f, mag };
  }

  return { type: 'none', reason: 'No simple closed-form transform (Proakis Table 2.1).' };
}
