// Proakis §7.5 — Linear Predictive Coding (analysis-synthesis speech coding).
// Implemented from Book.pdf Eq. 7.5.1–7.5.13 (no CCSM reference script).
//
// Source-filter model (Fig. 7.17): an excitation w_n (periodic impulse train for
// voiced speech, white noise for unvoiced) drives an all-pole vocal-tract filter
//     x_n = Σ_{i=1}^p a_i x_{n-i} + G w_n            (Eq. 7.5.1)
// The order-p linear predictor (all-zero analysis filter) estimates
//     x̂_n = Σ_{k=1}^p a_k x_{n-k}                    (Eq. 7.5.2)
// and the prediction error e_n = x_n − x̂_n           (Eq. 7.5.3)
// is minimized in the mean-square sense, yielding the Yule-Walker normal equations
//     R a = r                                         (Eq. 7.5.9)
// with R a symmetric Toeplitz autocorrelation matrix, solved by Levinson-Durbin.
import { makeRng } from './random';

/**
 * Biased autocorrelation R[0..p] of a frame:  R_i = Σ_n x_n x_{n-i}  (Eq. 7.5.7).
 * Returns p+1 lags; R is symmetric so only non-negative lags are needed.
 */
export function autocorrelation(x: number[], p: number): number[] {
  const R = new Array<number>(p + 1).fill(0);
  for (let i = 0; i <= p; i++) {
    let s = 0;
    for (let n = i; n < x.length; n++) s += x[n] * x[n - i];
    R[i] = s;
  }
  return R;
}

export interface LevinsonResult {
  /** Predictor coefficients a_1..a_p (length p) for x̂_n = Σ a_k x_{n-k}. */
  a: number[];
  /** Reflection (PARCOR) coefficients k_1..k_p; |k_i|<1 ⇒ stable synthesis filter. */
  reflection: number[];
  /** Minimum prediction-error energy E_min = R_0 − Σ a_k R_k  (Eq. 7.5.11). */
  error: number;
}

/**
 * Levinson-Durbin recursion solving the Toeplitz Yule-Walker system R a = r
 * (Eq. 7.5.9) for the order-p predictor. The error filter is A(z)=1−Σ a_k z^{-k}.
 */
export function levinsonDurbin(R: number[], p: number): LevinsonResult {
  const reflection = new Array<number>(p).fill(0);
  let E = R[0];
  if (E <= 0) return { a: new Array<number>(p).fill(0), reflection, error: 0 };
  // a[0]=1 implicitly; a[1..p] accumulated in place.
  const a = new Array<number>(p + 1).fill(0);
  for (let i = 1; i <= p; i++) {
    let acc = R[i];
    for (let j = 1; j < i; j++) acc -= a[j] * R[i - j];
    const k = acc / E;
    reflection[i - 1] = k;
    const prev = a.slice();
    a[i] = k;
    for (let j = 1; j < i; j++) a[j] = prev[j] - k * prev[i - j];
    E *= 1 - k * k;
    if (E <= 0) {
      E = 0;
      break;
    }
  }
  return { a: a.slice(1, p + 1), reflection, error: E };
}

export interface LpcModel {
  /** Predictor / all-pole filter coefficients a_1..a_p. */
  a: number[];
  /** Reflection coefficients. */
  reflection: number[];
  /** Residual energy E_min after prediction. */
  error: number;
  /** Gain G = √E_min for unit-energy excitation (Eq. 7.5.12–7.5.13). */
  gain: number;
  /** Autocorrelation lags R[0..p] used in the design. */
  R: number[];
}

/** Estimate the order-p LPC model of a speech frame (autocorrelation method). */
export function lpcAnalyze(frame: number[], p: number): LpcModel {
  const R = autocorrelation(frame, p);
  const { a, reflection, error } = levinsonDurbin(R, p);
  return { a, reflection, error, gain: Math.sqrt(Math.max(0, error)), R };
}

/**
 * Prediction error e_n = x_n − Σ_{k=1}^p a_k x_{n-k}  (Eq. 7.5.3); samples before
 * the frame are treated as zero. Length matches the input.
 */
export function predictionError(x: number[], a: number[]): number[] {
  const e = new Array<number>(x.length).fill(0);
  for (let n = 0; n < x.length; n++) {
    let pred = 0;
    for (let k = 0; k < a.length; k++) pred += a[k] * (x[n - 1 - k] ?? 0);
    e[n] = x[n] - pred;
  }
  return e;
}

/**
 * All-pole synthesis x_n = Σ_{i=1}^p a_i x_{n-i} + G w_n  (Eq. 7.5.1): drive the
 * vocal-tract filter with an excitation sequence to reconstruct the waveform.
 */
export function lpcSynthesize(excitation: number[], a: number[], gain: number): number[] {
  const x = new Array<number>(excitation.length).fill(0);
  for (let n = 0; n < excitation.length; n++) {
    let acc = gain * excitation[n];
    for (let i = 0; i < a.length; i++) acc += a[i] * (x[n - 1 - i] ?? 0);
    x[n] = acc;
  }
  return x;
}

/** Prediction gain (dB): 10·log10(var(signal)/var(error)). >0 for correlated sources. */
export function predictionGainDb(signal: number[], error: number[]): number {
  const variance = (v: number[]): number => {
    if (!v.length) return 0;
    const m = v.reduce((s, z) => s + z, 0) / v.length;
    return v.reduce((s, z) => s + (z - m) * (z - m), 0) / v.length;
  };
  const ps = variance(signal);
  const pe = variance(error);
  if (pe <= 0 || ps <= 0) return 0;
  return 10 * Math.log10(ps / pe);
}

// ── Excitation generators (unit-energy: Σ w_n² = 1, per Eq. 7.5.12) ──────────────

/** Voiced excitation: periodic impulse train of N samples spaced by `period`. */
export function impulseTrain(N: number, period: number): number[] {
  const w = new Array<number>(N).fill(0);
  if (period < 1) return w;
  let count = 0;
  for (let n = 0; n < N; n += period) count++;
  const amp = count > 0 ? 1 / Math.sqrt(count) : 0;
  for (let n = 0; n < N; n += period) w[n] = amp;
  return w;
}

/** Unvoiced excitation: zero-mean white noise of N samples, normalized to unit energy. */
export function whiteNoise(N: number, seed = 1): number[] {
  const rng = makeRng(seed);
  const w = new Array<number>(N).fill(0);
  // Box-Muller Gaussian samples.
  for (let n = 0; n < N; n++) {
    const u1 = Math.max(rng(), 1e-12);
    const u2 = rng();
    w[n] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  const energy = w.reduce((s, z) => s + z * z, 0);
  const norm = energy > 0 ? 1 / Math.sqrt(energy) : 0;
  return w.map((z) => z * norm);
}

export interface PitchEstimate {
  /** True when a strong periodic peak is found (voiced speech). */
  voiced: boolean;
  /** Fundamental frequency f_0 (Hz); 0 when unvoiced. */
  pitchHz: number;
  /** Lag (samples) of the autocorrelation peak. */
  lag: number;
  /** Normalized peak strength in [0, 1]; compared against `threshold`. */
  strength: number;
}

/**
 * Pitch / voiced-unvoiced detection by the normalized-autocorrelation peak over the
 * 50–400 Hz pitch range. The reciprocal of the peak lag is the pitch f_0 = 1/T_0
 * (§7.5). Strong peak ⇒ voiced impulse-train excitation; weak ⇒ unvoiced noise.
 */
export function estimatePitch(
  frame: number[],
  fs: number,
  opts: { minHz?: number; maxHz?: number; threshold?: number } = {},
): PitchEstimate {
  const { minHz = 50, maxHz = 400, threshold = 0.3 } = opts;
  const R0 = frame.reduce((s, z) => s + z * z, 0);
  const none: PitchEstimate = { voiced: false, pitchHz: 0, lag: 0, strength: 0 };
  if (R0 <= 0) return none;
  const minLag = Math.max(1, Math.floor(fs / maxHz));
  const maxLag = Math.min(frame.length - 1, Math.ceil(fs / minHz));
  let bestLag = 0;
  let bestStrength = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let n = lag; n < frame.length; n++) s += frame[n] * frame[n - lag];
    const strength = s / R0;
    if (strength > bestStrength) {
      bestStrength = strength;
      bestLag = lag;
    }
  }
  if (bestStrength < threshold || bestLag === 0) return none;
  return { voiced: true, pitchHz: fs / bestLag, lag: bestLag, strength: bestStrength };
}

export interface LpcSpectrum {
  /** Normalized frequency f/fs ∈ [0, 0.5]. */
  freqNorm: number[];
  /** All-pole envelope magnitude |H| in dB:  H(z)=G/(1−Σ a_k z^{-k}). */
  magDb: number[];
}

/**
 * Frequency response of the all-pole synthesis filter H(e^{jω}) = G/(1−Σ a_k e^{-jωk})
 * over ω ∈ [0, π]. The peaks of |H| are the formants (vocal-tract resonances).
 */
export function lpcSpectrum(a: number[], gain: number, nPoints = 256): LpcSpectrum {
  const freqNorm = new Array<number>(nPoints);
  const magDb = new Array<number>(nPoints);
  for (let m = 0; m < nPoints; m++) {
    const w = (Math.PI * m) / (nPoints - 1);
    // Denominator 1 − Σ a_k e^{-jωk}
    let re = 1;
    let im = 0;
    for (let k = 0; k < a.length; k++) {
      re -= a[k] * Math.cos(w * (k + 1));
      im += a[k] * Math.sin(w * (k + 1));
    }
    const denom = Math.sqrt(re * re + im * im);
    const mag = denom > 0 ? gain / denom : 0;
    freqNorm[m] = w / (2 * Math.PI);
    magDb[m] = 20 * Math.log10(Math.max(mag, 1e-9));
  }
  return { freqNorm, magDb };
}

export interface LpcBitRate {
  bitsPerFrame: number;
  framesPerSec: number;
  /** LPC bit rate (bits/sec). */
  rate: number;
  /** Reference PCM rate (bits/sec) for the same speech signal. */
  pcmRate: number;
  /** Compression factor pcmRate / rate. */
  compression: number;
}

/**
 * LPC parameter bit rate (§7.5): per 20–30 ms frame the encoder transmits the
 * voiced/unvoiced flag (1 bit), pitch (≈6 bits), gain (≈5 bits, log-companded), and
 * p prediction coefficients (8–10 bits each) → speech compressible to ~2400 bps,
 * versus 64 kbps for PCM.
 */
export function lpcBitRate(
  p: number,
  frameMs: number,
  opts: { coeffBits?: number; pitchBits?: number; gainBits?: number; vuvBits?: number; pcmRate?: number } = {},
): LpcBitRate {
  const { coeffBits = 10, pitchBits = 6, gainBits = 5, vuvBits = 1, pcmRate = 64000 } = opts;
  const bitsPerFrame = vuvBits + pitchBits + gainBits + p * coeffBits;
  const framesPerSec = 1000 / frameMs;
  const rate = bitsPerFrame * framesPerSec;
  return { bitsPerFrame, framesPerSec, rate, pcmRate, compression: rate > 0 ? pcmRate / rate : 0 };
}

export interface SynthFrameOptions {
  fs: number;
  /** Number of samples in the frame. */
  N: number;
  /** Voiced (impulse-train) or unvoiced (noise) excitation. */
  voiced: boolean;
  /** Pitch f_0 (Hz) for voiced frames. */
  pitchHz: number;
  /** Formant resonances {freq (Hz), bw (Hz)} cascaded as 2-pole filters. */
  formants: { freq: number; bw: number }[];
  /** Gain applied to the excitation. */
  gain?: number;
  seed?: number;
}

/**
 * Build a synthetic speech-like frame: a voiced/unvoiced excitation passed through a
 * cascade of 2-pole formant resonators. Used to drive the LPC demo with a signal
 * whose vocal-tract resonances (formants) LPC analysis can recover.
 */
export function synthSpeechFrame(opts: SynthFrameOptions): number[] {
  const { fs, N, voiced, pitchHz, formants, gain = 1, seed = 1 } = opts;
  const period = voiced && pitchHz > 0 ? Math.max(1, Math.round(fs / pitchHz)) : 0;
  const exc = voiced ? impulseTrain(N, period) : whiteNoise(N, seed);
  let x = exc.map((v) => v * gain);
  // Each formant is a 2-pole resonator: y_n = x_n + 2r cos(θ) y_{n-1} − r² y_{n-2},
  // with pole radius r = e^{−π·bw/fs} and angle θ = 2π·freq/fs.
  for (const f of formants) {
    const r = Math.exp((-Math.PI * f.bw) / fs);
    const theta = (2 * Math.PI * f.freq) / fs;
    const b1 = 2 * r * Math.cos(theta);
    const b2 = -r * r;
    const y = new Array<number>(N).fill(0);
    for (let n = 0; n < N; n++) {
      y[n] = x[n] + b1 * (y[n - 1] ?? 0) + b2 * (y[n - 2] ?? 0);
    }
    x = y;
  }
  // Normalize peak amplitude to keep the demo plots in a stable range.
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  return peak > 0 ? x.map((v) => v / peak) : x;
}
