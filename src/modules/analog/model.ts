import { linspace } from '@/lib/dsp/math';
import { evalSignal } from '@/lib/dsp/signals';
import type { AmMode, AngleMode } from '@/lib/dsp/analog';
import {
  amSignal,
  amEnvelope,
  amEfficiency,
  angleSignal,
  instantFreq,
  besselJ,
  carsonBandwidth,
  pllRecoverPhase,
} from '@/lib/dsp/analog';

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
 * FM/PM modulation view parameters.
 */
export interface AnalogFmParams {
  mode: AngleMode;
  messageFreq: number; // Hz
  carrierFreq: number; // Hz
  carrierAmp: number; // V
  modIndex: number; // β (FM) or kp (PM)
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
  method: 'envelope' | 'coherent' | 'pll' | 'fmdiscrim';
  amParams?: AnalogAmParams;
  fmParams?: AnalogFmParams;
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
 * Result from FM modulation view computation.
 */
export interface AnalogFmView {
  time: number[];
  message: number[];
  modulated: number[]; // constant-envelope FM/PM signal
  instantFreq: number[]; // f_i(t)
  // Bessel spectrum (discrete sidebands)
  sidebandFreqs: number[]; // carrier ± n·fm
  sidebandMags: number[]; // |Jn(β)|
  // Carson bandwidth marker
  carsonBw: number; // B = 2(β+1)fm
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

/**
 * Build AM modulation view: time-domain waveforms + spectrum.
 */
export function buildAnalogAmView(p: AnalogAmParams): AnalogAmView {
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
  const time = linspace(0, duration, N);

  const message = time.map((t) => evalSignal(msg, t));
  const carrier = time.map((t) => Math.cos(2 * Math.PI * fc * t));
  const modulated = time.map((t) => amSignal(p.mode, msg, fc, Ac, a, t));
  const envelope =
    p.mode === 'conventional'
      ? time.map((t) => amEnvelope(msg, Ac, a, t))
      : undefined;

  // Spectrum: compute FFT and extract positive frequencies
  // For simplicity, use analytic spectrum for single-tone message
  const specFreq: number[] = [];
  const specMag: number[] = [];

  // Analytical spectrum for AM modes:
  switch (p.mode) {
    case 'dsb':
      // Sidebands only at fc±fm
      specFreq.push(fc - fm, fc, fc + fm);
      specMag.push(0.5, 0, 0.5); // Ac/2 at each sideband
      break;
    case 'conventional':
      // Carrier at fc + sidebands at fc±fm
      specFreq.push(fc - fm, fc, fc + fm);
      specMag.push(a * 0.5, 1, a * 0.5); // Carrier normalized to 1, sidebands to a/2
      break;
    case 'ssb-usb':
      // Upper sideband only at fc+fm
      specFreq.push(fc + fm);
      specMag.push(0.5);
      break;
    case 'ssb-lsb':
      // Lower sideband only at fc-fm
      specFreq.push(fc - fm);
      specMag.push(0.5);
      break;
    case 'vsb':
      // Partial sidebands (vestige)
      specFreq.push(fc - fm, fc, fc + fm);
      specMag.push(0.4, 0.8, 0.5);
      break;
  }

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
 * Build FM modulation view: constant-envelope waveform + Bessel spectrum.
 */
export function buildAnalogFmView(p: AnalogFmParams): AnalogFmView {
  const msg = [{ freq: p.messageFreq, amp: 1 }];
  const fm = p.messageFreq;
  const fc = p.carrierFreq;
  const Ac = p.carrierAmp;
  const beta = p.modIndex;

  // Sample over ~5 message periods
  const duration = 5 / fm;
  const fs = Math.max(20 * fc, 50 * fm);
  const N = Math.ceil(fs * duration);
  const time = linspace(0, duration, N);

  const message = time.map((t) => evalSignal(msg, t));
  const modulated = time.map((t) =>
    angleSignal(p.mode, msg, fc, Ac, beta, t),
  );
  const instFreq = time.map((t) =>
    p.mode === 'fm' ? instantFreq(msg, fc, beta, t) : fc,
  );

  // Bessel spectrum: sidebands at fc±n·fm with amplitude |Jn(β)|
  const sidebandFreqs: number[] = [];
  const sidebandMags: number[] = [];
  const maxN = Math.ceil(beta + 2);
  for (let n = -maxN; n <= maxN; n++) {
    const freq = fc + n * fm;
    if (freq > 0) {
      const mag = Math.abs(besselJ(Math.abs(n), beta));
      sidebandFreqs.push(freq);
      sidebandMags.push(mag);
    }
  }

  const carsonBw = carsonBandwidth(beta, fm);

  return {
    time,
    message,
    modulated,
    instantFreq: instFreq,
    sidebandFreqs,
    sidebandMags,
    carsonBw,
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
export function buildAnalogDemodView(p: AnalogDemodParams): AnalogDemodView {
  const ap = p.amParams ?? {
    mode: 'conventional' as AmMode,
    messageFreq: 1000,
    carrierFreq: 20000,
    carrierAmp: 1,
    modIndex: 0.5,
  };
  const fp = p.fmParams ?? {
    mode: 'fm' as AngleMode,
    messageFreq: 1000,
    carrierFreq: 20000,
    carrierAmp: 1,
    modIndex: 5,
  };

  const isFm = p.method === 'fmdiscrim';
  const fm = isFm ? fp.messageFreq : ap.messageFreq;
  const fc = isFm ? fp.carrierFreq : ap.carrierFreq;
  const duration = 3 / fm;
  const fs = Math.max(20 * fc, 100 * fm);
  const N = Math.ceil(fs * duration);
  const time = linspace(0, duration, N);
  const msg = [{ freq: fm, amp: 1 }];
  const original = time.map((tt) => evalSignal(msg, tt));

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
        const env = amEnvelope(msg, ap.carrierAmp, a, tt);
        return env / ap.carrierAmp - 1; // remove carrier offset -> a·mn(t)
      });
      faithful = a <= 1; // a>1 -> envelope distortion
      break;
    }
    case 'coherent': {
      // Proakis §3.2.5: LPF{ u(t)·cos(2π fc t) } ∝ ½ m(t) (DSB-SC coherent detector).
      const prod = time.map((tt) => amSignal('dsb', msg, fc, ap.carrierAmp, ap.modIndex, tt) * Math.cos(2 * Math.PI * fc * tt));
      recovered = movingAverage(prod, win).map((v) => 2 * v); // undo the ½ factor
      break;
    }
    case 'pll': {
      // Proakis §3.3.3: PLL estimates the carrier phase θ̂(t); cos(θ̂) recovers the carrier.
      const u = time.map((tt) => Math.cos(2 * Math.PI * fc * tt));
      const theta = pllRecoverPhase(u, fc, fs);
      carrierTrue = u;
      carrierEst = theta.map((th) => Math.cos(th));
      // Coherent detection with the recovered carrier.
      const prod = time.map((tt, n) => amSignal('dsb', msg, fc, ap.carrierAmp, ap.modIndex, tt) * (carrierEst as number[])[n]);
      recovered = movingAverage(prod, win).map((v) => 2 * v);
      break;
    }
    case 'fmdiscrim':
    default: {
      // Proakis §3.3.3: discriminator output ∝ f_i(t) − f_c ∝ m(t).
      const fi = time.map((tt) => instantFreq(msg, fp.carrierFreq, fp.modIndex, tt));
      recovered = fi.map((f) => (f - fp.carrierFreq) / fp.modIndex);
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
