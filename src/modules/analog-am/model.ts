import { linspace } from '@/lib/dsp/math';
import { evalSignal } from '@/lib/dsp/signals';
import type { AmMode } from '@/lib/dsp/analog';
import { amSignal, amEnvelope, amEfficiency, pllRecoverPhase, vsbFilter } from '@/lib/dsp/analog';
import { spectrum } from '@/lib/dsp/fft';

/**
 * AM modulation view parameters.
 */
export interface AnalogAmParams {
  mode: AmMode;
  messageFreq: number; // Hz
  carrierFreq: number; // Hz
  carrierAmp: number; // V
  modIndex: number; // a (modulation depth)
}

/**
 * Power & efficiency view parameters.
 */
export interface AnalogPowerParams {
  amParams: AnalogAmParams;
}

/**
 * Demodulation view parameters.
 */
export interface AnalogDemodParams {
  method: 'envelope' | 'coherent' | 'pll';
  amParams?: AnalogAmParams;
}

/**
 * Superheterodyne receiver view parameters.
 */
export interface AnalogSuperParams {
  stationFreq: number; // RF carrier (Hz)
  ifFreq: number; // Fixed IF (Hz), typically 455 kHz for AM radio
}

/**
 * Result from AM modulation view computation.
 */
export interface AnalogAmView {
  // Time-domain samples
  time: number[]; // seconds
  message: number[]; // message signal m(t)
  carrier: number[]; // carrier cos(2π fc t)
  modulated: number[]; // modulated signal u(t)
  envelope?: number[]; // envelope for conventional AM
  // Spectral data
  specFreq: number[]; // positive frequencies (Hz)
  specMag: number[]; // magnitude spectrum (normalized)
  // Status
  isOvermodulated: boolean; // a > 1
}

/**
 * Result from power/efficiency view.
 */
export interface AnalogPowerView {
  carrierPower: number; // Pc = Ac²/2
  sidebandPower: number; // Ps (conventional AM)
  totalPower: number; // Pc + Ps
  efficiency: number; // η in [0, 1]
}

/**
 * Result from the demodulation view.
 */
export interface AnalogDemodView {
  time: number[];
  original: number[]; // original message m(t) (normalized)
  recovered: number[]; // recovered message after the chosen detector
  /** True vs PLL-estimated carrier (PLL method only). */
  carrierTrue?: number[];
  carrierEst?: number[];
  /** True when the detector reproduces the message faithfully. */
  faithful: boolean;
}

/**
 * Result from the superheterodyne receiver view.
 */
export interface AnalogSuperView {
  stationFreq: number; // f_c (Hz)
  ifFreq: number; // f_IF (Hz)
  loFreq: number; // f_LO = f_c + f_IF (Hz)
  imageFreq: number; // f_image = f_c + 2 f_IF (Hz)
  // Frequency-translation diagram (RF band -> IF band).
  rfLines: number[]; // RF spectral lines (desired + image)
  ifLine: number; // where everything lands after mixing (f_IF)
}

/** Hann window of length N — tapers the FFT buffer to suppress spectral leakage. */
function hann(N: number): number[] {
  const w = new Array<number>(N);
  for (let n = 0; n < N; n++) w[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
  return w;
}

/**
 * FFT magnitude spectrum |U(f)| of the AM signal around the carrier.
 * Approach A: the spectrum is computed from a real, windowed time buffer via
 * `spectrum()` rather than hardcoded. VSB is generated as DSB-SC and then shaped
 * by the real vestigial filter (Proakis §3.2.4).
 */
export function buildAmSpectrum(p: AnalogAmParams): { specFreq: number[]; specMag: number[] } {
  const fm = p.messageFreq;
  const fc = p.carrierFreq;
  const fs = 8 * fc; // oversample so carrier + sidebands sit well below Nyquist
  const N = 8192; // power of two for the radix-2 FFT
  const msg = [{ freq: fm, amp: 1 }];
  // VSB is DSB-SC filtered; generate the DSB buffer, then shape the spectrum.
  const genMode: AmMode = p.mode === 'vsb' ? 'dsb' : p.mode;
  const win = hann(N);
  const x = new Array<number>(N);
  for (let n = 0; n < N; n++) {
    x[n] = amSignal(genMode, msg, fc, p.carrierAmp, p.modIndex, n / fs) * win[n];
  }
  const sp = spectrum(x, fs);
  // Keep only the positive-frequency display band around the carrier.
  const lo = Math.max(0, fc - 4 * fm);
  const hi = fc + 4 * fm;
  const specFreq: number[] = [];
  let specMag: number[] = [];
  for (let i = 0; i < sp.freq.length; i++) {
    if (sp.freq[i] >= lo && sp.freq[i] <= hi) {
      specFreq.push(sp.freq[i]);
      specMag.push(sp.mag[i]);
    }
  }
  if (p.mode === 'vsb') {
    // vestige half-width = 2·fm so the lower sideband at f_c-fm lands mid-ramp
    // (H = 0.25), leaving a visible vestige rather than being fully removed.
    specMag = vsbFilter(specMag, specFreq, fc, 2 * fm);
  }
  return { specFreq, specMag };
}

/**
 * Build AM modulation view: time-domain waveforms + spectrum.
 */
export function buildAnalogAmView(p: AnalogAmParams, tStart = 0): AnalogAmView {
  // Message signal (single tone for simplicity)
  const msg = [{ freq: p.messageFreq, amp: 1 }];
  const fm = p.messageFreq;
  const fc = p.carrierFreq;
  const Ac = p.carrierAmp;
  const a = p.modIndex;

  // Sample over ~3 message periods or 10 carrier cycles, whichever is longer
  const duration = Math.max(3 / fm, 10 / fc);
  const fs = Math.max(20 * fc, 100 * fm); // Nyquist: 2*max(fc, fm)
  const N = Math.ceil(fs * duration);
  // Local (fixed) display axis [0, duration]; sampling tStart ahead scrolls the wave.
  const time = linspace(0, duration, N);

  const message = time.map((t) => evalSignal(msg, tStart + t));
  const carrier = time.map((t) => Math.cos(2 * Math.PI * fc * (tStart + t)));
  const modulated = time.map((t) => amSignal(p.mode, msg, fc, Ac, a, tStart + t));
  const envelope =
    p.mode === 'conventional' ? time.map((t) => amEnvelope(msg, Ac, a, tStart + t)) : undefined;

  const { specFreq, specMag } = buildAmSpectrum(p);

  const isOvermodulated = a > 1;

  return {
    time,
    message,
    carrier,
    modulated,
    envelope,
    specFreq,
    specMag,
    isOvermodulated,
  };
}

/**
 * Build power & efficiency view.
 */
export function buildAnalogPowerView(p: AnalogPowerParams): AnalogPowerView {
  const ap = p.amParams;
  const Ac = ap.carrierAmp;
  const a = ap.modIndex;

  // Single-tone message power
  const Pmn = 0.5; // cos²(2π fm t) has average power 1/2

  // Carrier power: Pc = Ac²/2
  const carrierPower = (Ac * Ac) / 2;

  // Sideband power (conventional AM): Ps = (a·Ac)²/2 / 2 = a²·Ac²/8 per sideband, 2 sidebands
  const sidebandPower = (a * a * Ac * Ac) / 4;

  // Total power
  const totalPower = carrierPower + sidebandPower;

  // Efficiency η = Ps / (Pc + Ps) = sideband power / total power
  // Or: η = a² Pmn / (1 + a² Pmn)
  const efficiency = amEfficiency(a, Pmn);

  return {
    carrierPower,
    sidebandPower,
    totalPower,
    efficiency,
  };
}

/** Simple moving-average lowpass — pedagogical baseband recovery after mixing. */
function movingAverage(x: number[], win: number): number[] {
  const out = new Array<number>(x.length).fill(0);
  let acc = 0;
  for (let n = 0; n < x.length; n++) {
    acc += x[n];
    if (n >= win) acc -= x[n - win];
    out[n] = acc / Math.min(n + 1, win);
  }
  return out;
}

/**
 * Build demodulation view: recovered message vs original for the chosen detector.
 * Proakis §3.2.5 (AM detectors) & §3.3.3 (PLL / FM discriminator).
 */
export function buildAnalogDemodView(p: AnalogDemodParams, tStart = 0): AnalogDemodView {
  const ap = p.amParams ?? {
    mode: 'conventional' as AmMode,
    messageFreq: 1000,
    carrierFreq: 20000,
    carrierAmp: 1,
    modIndex: 0.5,
  };

  const fm = ap.messageFreq;
  const fc = ap.carrierFreq;
  const duration = 3 / fm;
  const fs = Math.max(20 * fc, 100 * fm);
  const N = Math.ceil(fs * duration);
  // Local (fixed) display axis; sampling tStart ahead scrolls every trace.
  const time = linspace(0, duration, N);
  const msg = [{ freq: fm, amp: 1 }];
  const original = time.map((tt) => evalSignal(msg, tStart + tt));

  // Lowpass window ~ one carrier period, to strip the 2·fc product term.
  const win = Math.max(2, Math.round(fs / fc));

  let recovered: number[];
  let carrierTrue: number[] | undefined;
  let carrierEst: number[] | undefined;
  let faithful = true;

  switch (p.method) {
    case 'envelope': {
      // Proakis §3.2.5: envelope detector tracks Ac[1 + a·mn(t)]; valid only when a ≤ 1.
      const a = ap.modIndex;
      recovered = time.map((tt) => {
        const env = amEnvelope(msg, ap.carrierAmp, a, tStart + tt);
        return env / ap.carrierAmp - 1; // remove carrier offset -> a·mn(t)
      });
      faithful = a <= 1; // a>1 -> envelope distortion
      break;
    }
    case 'coherent': {
      // Proakis §3.2.5: LPF{ u(t)·cos(2π fc t) } ∝ ½ m(t) (DSB-SC coherent detector).
      const prod = time.map(
        (tt) =>
          amSignal('dsb', msg, fc, ap.carrierAmp, ap.modIndex, tStart + tt) *
          Math.cos(2 * Math.PI * fc * (tStart + tt)),
      );
      recovered = movingAverage(prod, win).map((v) => 2 * v); // undo the ½ factor
      break;
    }
    case 'pll': {
      // Proakis §3.3.3: PLL estimates the carrier phase θ̂(t); cos(θ̂) recovers the carrier.
      const u = time.map((tt) => Math.cos(2 * Math.PI * fc * (tStart + tt)));
      const theta = pllRecoverPhase(u, fc, fs);
      carrierTrue = u;
      carrierEst = theta.map((th) => Math.cos(th));
      // Coherent detection with the recovered carrier.
      const prod = time.map(
        (tt, n) =>
          amSignal('dsb', msg, fc, ap.carrierAmp, ap.modIndex, tStart + tt) *
          (carrierEst as number[])[n],
      );
      recovered = movingAverage(prod, win).map((v) => 2 * v);
      break;
    }
  }

  return { time, original, recovered, carrierTrue, carrierEst, faithful };
}

/**
 * Build superheterodyne receiver view: frequency plan + image frequency.
 * Proakis §3.4 s.115 — f_LO = f_c + f_IF, image at f_c + 2 f_IF.
 */
export function buildAnalogSuperView(p: AnalogSuperParams): AnalogSuperView {
  const loFreq = p.stationFreq + p.ifFreq; // Proakis §3.4: f_LO = f_c + f_IF
  const imageFreq = p.stationFreq + 2 * p.ifFreq; // Proakis §3.4: f_image = f_c + 2 f_IF
  return {
    stationFreq: p.stationFreq,
    ifFreq: p.ifFreq,
    loFreq,
    imageFreq,
    rfLines: [p.stationFreq, imageFreq],
    ifLine: p.ifFreq,
  };
}
