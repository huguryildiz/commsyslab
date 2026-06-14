import { linspace } from '@/lib/dsp/math';
import { evalSignal } from '@/lib/dsp/signals';
import type { AmMode } from '@/lib/dsp/analog';
import { amSignal, amEnvelope, amEfficiency, pllRecoverPhase, vsbFilter } from '@/lib/dsp/analog';
import { spectrum } from '@/lib/dsp/fft';
import {
  powerLawModulator,
  switchingModulator,
  balancedModulator,
  ringModulator,
  fdmCompose,
  fdmSeparate,
  qamModulate,
  qamDemod,
} from '@/lib/dsp/am-impl';

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
 * The spectrum is computed from a windowed time buffer via `spectrum()` rather
 * than hardcoded analytic lines. VSB is generated as DSB-SC and then shaped by
 * the real vestigial filter (Proakis §3.2.4).
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

export type ModulatorKind = 'power-law' | 'switching' | 'balanced' | 'ring';

export interface ModulatorParams {
  modulator: ModulatorKind;
  messageFreq: number; // Hz
  carrierFreq: number; // Hz
  carrierAmp: number; // V
}

export interface ModulatorView {
  time: number[];
  node: number[]; // intermediate "dirty" node signal (pre-BPF)
  output: number[]; // BPF / summed output (the desired AM signal)
  dirtyFreq: number[];
  dirtyMag: number[]; // spectrum before the bandpass filter (shows unwanted terms)
  cleanFreq: number[];
  cleanMag: number[]; // spectrum after the bandpass filter (desired AM)
  producesDsb: boolean; // balanced/ring → DSB-SC; power-law/switching → conventional
}

/** Keep only the positive-frequency bins of a two-sided spectrum within [lo, hi]. */
function bandSlice(freq: number[], mag: number[], lo: number, hi: number): { f: number[]; m: number[] } {
  const f: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < freq.length; i++) {
    if (freq[i] >= lo && freq[i] <= hi) {
      f.push(freq[i]);
      m.push(mag[i]);
    }
  }
  return { f, m };
}

/**
 * Build the modulator view: the intermediate (pre-BPF) node signal and the
 * recovered output, plus their FFT spectra so the "unwanted terms → BPF → clean
 * AM" story is explicit. Proakis §3.3.
 */
export function buildModulatorView(p: ModulatorParams): ModulatorView {
  const fm = p.messageFreq;
  const fc = p.carrierFreq;
  const fs = 8 * fc;
  const N = 8192;
  const t = Array.from({ length: N }, (_, i) => i / fs);
  const msg = [{ freq: fm, amp: 1 }];

  let node: number[];
  let output: number[];
  let producesDsb: boolean;
  switch (p.modulator) {
    case 'power-law': {
      const r = powerLawModulator(msg, fc, p.carrierAmp, 1, 0.3, t);
      node = r.vo;
      output = r.uBpf;
      producesDsb = false;
      break;
    }
    case 'switching': {
      const r = switchingModulator(msg, fc, p.carrierAmp, t, 15);
      node = r.vo;
      output = r.uBpf;
      producesDsb = false;
      break;
    }
    case 'balanced': {
      const r = balancedModulator(msg, fc, p.carrierAmp, t);
      node = r.upper; // show one branch as the "node" signal
      output = r.uOut;
      producesDsb = true;
      break;
    }
    case 'ring': {
      const r = ringModulator(msg, fc, t, 15);
      node = r.vo;
      output = r.uBpf;
      producesDsb = true;
      break;
    }
  }

  const lo = 0; // lo=0 drops the negative-frequency half of the two-sided spectrum
  const hi = fc + 6 * fm;
  const win = hann(N);
  const dirtySpec = spectrum(
    node.map((v, i) => v * win[i]),
    fs,
  );
  const cleanSpec = spectrum(
    output.map((v, i) => v * win[i]),
    fs,
  );
  const dirty = bandSlice(dirtySpec.freq, dirtySpec.mag, lo, hi);
  const clean = bandSlice(cleanSpec.freq, cleanSpec.mag, lo, hi);

  // Show a few message/carrier periods of the time-domain node + output.
  const showN = Math.min(N, Math.ceil(fs * Math.max(3 / fm, 10 / fc)));
  return {
    time: t.slice(0, showN),
    node: node.slice(0, showN),
    output: output.slice(0, showN),
    dirtyFreq: dirty.f,
    dirtyMag: dirty.m,
    cleanFreq: clean.f,
    cleanMag: clean.m,
    producesDsb,
  };
}

export interface FdmParams {
  messageFreqs: number[]; // one tone per channel (Hz)
  spacing: number; // carrier separation (Hz)
  bandwidth: number; // per-channel baseband bandwidth W (Hz)
  selected: number; // channel index to recover at the receiver
}
export interface FdmView {
  time: number[];
  recovered: number[];
  specFreq: number[];
  specMag: number[];
  carriers: number[];
  overlap: boolean; // spacing < 2·bandwidth → adjacent-band interference
}

export interface QamParams {
  m1Freq: number;
  m2Freq: number;
  carrierFreq: number;
  phaseErrorDeg: number;
}
export interface QamView {
  time: number[];
  m1: number[];
  m2: number[];
  m1Hat: number[];
  m2Hat: number[];
  crosstalkDb: number;
}

/**
 * Build the FDM multiplexer view: composite spectrum + one recovered channel.
 * Each message is a single tone DSB-SC-modulated onto its own carrier; the
 * channels are spaced by `spacing` Hz starting from fc0 = 20 kHz (Proakis §3.4.1).
 * overlap = true when spacing < 2·bandwidth, indicating adjacent-band interference.
 */
export function buildFdmView(p: FdmParams): FdmView {
  const K = p.messageFreqs.length;
  const fc0 = 20000;
  const carriers = Array.from({ length: K }, (_, k) => fc0 + k * p.spacing);
  const fcMax = carriers[K - 1];
  const fs = 8 * (fcMax + p.bandwidth);
  const N = 8192;
  const t = Array.from({ length: N }, (_, i) => i / fs);
  const messages = p.messageFreqs.map((f) => [{ freq: f, amp: 1 }]);
  const { composite } = fdmCompose(messages, carriers, t);
  const sel = Math.min(p.selected, K - 1);
  const recovered = fdmSeparate(composite, fs, carriers[sel], p.bandwidth, t);
  const win = hann(N);
  const sp = spectrum(
    composite.map((v, i) => v * win[i]),
    fs,
  );
  const { f, m } = bandSlice(sp.freq, sp.mag, 0, fcMax + 4 * p.bandwidth);
  const showN = Math.min(N, Math.ceil(fs * 0.003));
  return {
    time: t.slice(0, showN),
    recovered: recovered.slice(0, showN),
    specFreq: f,
    specMag: m,
    carriers,
    overlap: p.spacing < 2 * p.bandwidth,
  };
}

/**
 * Build the QAM view: modulated signal, recovered channels, and crosstalk.
 * A phase error at the receiver couples the I and Q channels (Proakis §3.4.2).
 * crosstalkDb = 20 log10(leak/own) measured at the message tone frequencies.
 */
export function buildQamView(p: QamParams): QamView {
  const fc = p.carrierFreq;
  const fs = 8 * fc;
  const N = 8192;
  const t = Array.from({ length: N }, (_, i) => i / fs);
  const W = Math.max(p.m1Freq, p.m2Freq) * 1.5;
  const m1 = [{ freq: p.m1Freq, amp: 1 }];
  const m2 = [{ freq: p.m2Freq, amp: 1 }];
  const u = qamModulate(m1, m2, fc, 1, t);
  const { m1Hat, m2Hat } = qamDemod(u, fc, t, fs, W, (p.phaseErrorDeg * Math.PI) / 180);
  const corr = (sig: number[], f: number) =>
    Math.abs(sig.reduce((s, v, i) => s + v * Math.cos(2 * Math.PI * f * t[i]), 0)) / sig.length;
  const own = corr(m1Hat, p.m1Freq);
  const leak = corr(m1Hat, p.m2Freq);
  const crosstalkDb = 20 * Math.log10((leak + 1e-9) / (own + 1e-9));
  const showN = Math.min(N, Math.ceil(fs * Math.max(3 / p.m1Freq, 10 / fc)));
  return {
    time: t.slice(0, showN),
    m1: t.slice(0, showN).map((tt) => Math.cos(2 * Math.PI * p.m1Freq * tt)),
    m2: t.slice(0, showN).map((tt) => Math.cos(2 * Math.PI * p.m2Freq * tt)),
    m1Hat: m1Hat.slice(0, showN),
    m2Hat: m2Hat.slice(0, showN),
    crosstalkDb,
  };
}
