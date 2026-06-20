// src/modules/baseband/model.ts — pure derived-data builders for the Baseband tabs (no React).
import { linspace } from '@/lib/dsp/math';
import {
  pulseWaveform,
  raisedCosine,
  raisedCosineSpectrum,
  raisedCosineBandwidth,
  nyquistOffCenterSamples,
  type PulseKind,
} from '@/lib/dsp/pulse';
import {
  duobinaryPulse,
  duobinarySpectrum,
  modifiedDuobinaryPulse,
  modifiedDuobinarySpectrum,
  precode,
  duobinaryReceive,
  symbolBySymbolDetect,
  errorPropagationDemo,
  viterbiPR,
  prBerCurves,
} from '@/lib/dsp/partialresponse';
import { pamPsd, symbolPsd, rectNrzMag } from '@/lib/dsp/psd';
import {
  channelResponse,
  envelopeDelay,
  distortPulse,
  designFilters,
} from '@/lib/dsp/channeldistortion';
import {
  matchedFilter,
  matchedFilterOutput,
  correlate,
  pulseEnergy,
  peakSnr,
  convolve,
} from '@/lib/dsp/matchedfilter';
import { sigmaFromN0, gaussian } from '@/lib/dsp/awgn';
import { makeRng } from '@/lib/sim/sources';
import { eyeTraces, eyeMetrics, type EyeTrace } from '@/lib/dsp/eye';
import { zeroForcingTaps, mmseTaps, residualIsi } from '@/lib/dsp/equalizer';
import { randomBitSource, type Bit } from '@/lib/sim/sources';

export interface PulseParams {
  kind: PulseKind;
  alpha: number;
  sps: number;
  span: number;
}

export interface PulseView {
  t: number[];
  p: number[];
  offCenter: number[];
  freqs: number[];
  spectrum: number[];
  bandwidth: number;
  nyquist: number;
  excess: number;
}

export function buildPulseView(p: PulseParams): PulseView {
  const T = 1;
  const wave = pulseWaveform(p.kind, p.alpha, p.sps, p.span);
  const center = (wave.length - 1) / 2;
  const t = wave.map((_, i) => (i - center) / p.sps);
  const alpha = p.kind === 'sinc' ? 0 : p.alpha;
  const freqs = linspace(-1, 1, 401);
  const spectrum = freqs.map((f) => raisedCosineSpectrum(f, alpha, T));
  return {
    t,
    p: wave,
    offCenter: nyquistOffCenterSamples(wave, p.sps),
    freqs,
    spectrum,
    bandwidth: raisedCosineBandwidth(alpha, T),
    nyquist: 1 / (2 * T),
    excess: alpha,
  };
}

export interface ReceiverParams {
  alpha: number;
  sps: number;
  span: number;
  noise: boolean;
  n0: number;
}

export interface ReceiverView {
  t: number[];
  pulse: number[];
  matched: number[];
  mfOutput: number[];
  mfPeakIndex: number;
  energy: number;
  peakSnr: number;
  correlatorValue: number;
  mfAtT: number;
  rrcCascade: number[];
}

export function buildReceiverView(p: ReceiverParams): ReceiverView {
  const pulse = pulseWaveform('rc', p.alpha, p.sps, p.span);
  const matched = matchedFilter(pulse);
  let received = pulse.slice();
  if (p.noise) {
    const sigma = sigmaFromN0(p.n0);
    const rng = makeRng(7);
    received = received.map((v) => v + sigma * gaussian(rng));
  }
  const mfOutput = matchedFilterOutput(received, pulse);
  const energy = pulseEnergy(pulse);
  const rrc = pulseWaveform('rrc', p.alpha, p.sps, p.span);
  return {
    t: pulse.map((_, i) => (i - (pulse.length - 1) / 2) / p.sps),
    pulse,
    matched,
    mfOutput,
    mfPeakIndex: mfOutput.indexOf(Math.max(...mfOutput)),
    energy,
    peakSnr: peakSnr(energy, p.n0),
    correlatorValue: correlate(received, pulse),
    mfAtT: mfOutput[pulse.length - 1],
    rrcCascade: convolve(rrc, rrc),
  };
}

export type EqualizerKind = 'off' | 'zf' | 'mmse';

export interface EyeParams {
  M: 2 | 4;
  channel: number[];
  equalizer: EqualizerKind;
  nTaps: number;
  noiseVar: number;
  sps: number;
}

export interface EyeView {
  tracesBefore: EyeTrace[];
  tracesAfter: EyeTrace[];
  eqTaps: number[];
  combined: number[];
  eyeHeightBefore: number;
  eyeHeightAfter: number;
  residualIsi: number;
  sps: number;
}

function pamLevels(bits: Bit[], M: 2 | 4): number[] {
  if (M === 2) return bits.map((b) => (b ? 1 : -1));
  const out: number[] = [];
  for (let i = 0; i + 1 < bits.length; i += 2) {
    const idx = (bits[i] << 1) | bits[i + 1];
    out.push([-3, -1, 3, 1][idx]);
  }
  return out;
}

function shapeHeld(levels: number[], sps: number): number[] {
  const held: number[] = [];
  for (const a of levels) for (let i = 0; i < sps; i++) held.push(a);
  return held;
}

export function buildEyeView(p: EyeParams): EyeView {
  const gen = randomBitSource(2024);
  const bits: Bit[] = Array.from({ length: 256 }, () => gen());
  const levels = pamLevels(bits, p.M);
  const clean = shapeHeld(levels, p.sps);
  const rx = convolve(clean, p.channel);
  const eqTaps =
    p.equalizer === 'zf'
      ? zeroForcingTaps(p.channel, p.nTaps)
      : p.equalizer === 'mmse'
        ? mmseTaps(p.channel, p.noiseVar, p.nTaps)
        : [1];
  const equalized = convolve(rx, eqTaps);
  const tracesBefore = eyeTraces(rx, p.sps, 2);
  const tracesAfter = eyeTraces(equalized, p.sps, 2);
  return {
    tracesBefore,
    tracesAfter,
    eqTaps,
    combined: convolve(p.channel, eqTaps),
    eyeHeightBefore: eyeMetrics(tracesBefore, p.sps).eyeHeight,
    eyeHeightAfter: eyeMetrics(tracesAfter, p.sps).eyeHeight,
    residualIsi: residualIsi(p.channel, eqTaps),
    sps: p.sps,
  };
}

// ── §10.3.2 Partial-response signaling ──────────────────────────────────────

export interface PartialResponseParams {
  kind: 'duo' | 'mod';
  span: number;
}

export interface PartialResponseView {
  t: number[];
  pulse: number[];
  rc: number[];
  freqs: number[];
  spectrum: number[];
  dcNull: boolean;
}

export function buildPartialResponseView(p: PartialResponseParams): PartialResponseView {
  const W = 0.5;
  const T = 1 / (2 * W); // T = 1
  const t = linspace(-p.span, p.span, 481);
  const pulse = p.kind === 'duo' ? duobinaryPulse(W, t) : modifiedDuobinaryPulse(W, t);
  // Full-response raised cosine (α=0.5) on the same grid for comparison.
  const rc = t.map((ti) => raisedCosine(ti, 0.5, T));
  const freqs = linspace(-1, 1, 401);
  const spectrum =
    p.kind === 'duo' ? duobinarySpectrum(W, freqs) : modifiedDuobinarySpectrum(W, freqs);
  return { t, pulse, rc, freqs, spectrum, dcNull: p.kind === 'mod' };
}

// ── §10.4 Detection of partial-response signals ─────────────────────────────

export interface PrDetectionParams {
  bits: Bit[];
  precoding: boolean;
  flipIndex: number;
  ebN0dB: number[];
  sps: number;
}

export interface PrDetectionTable {
  d: number[];
  p: number[];
  a: number[];
  b: number[];
  dHat: number[];
}

export interface PrDetectionView {
  table: PrDetectionTable;
  errorFlags: number[];
  eye: EyeTrace[];
  ber: { ebN0dB: number[]; zeroIsi: number[]; symbolBySymbol: number[]; mlsd: number[] };
  survivor: number[];
}

export function buildPrDetectionView(p: PrDetectionParams): PrDetectionView {
  const d = p.bits.map((b) => (b ? 1 : 0));
  const { p: pre, a } = precode(d);
  const b = duobinaryReceive(a);
  const dHat = symbolBySymbolDetect(b);

  // Error-propagation demo: inject one error and watch it stay local (precoding)
  // versus cascade (subtraction-based detection without precoding).
  const fi = Math.min(Math.max(0, p.flipIndex), Math.max(0, a.length - 1));
  let errorFlags: number[];
  if (p.precoding) {
    const bFlipped = b.slice();
    bFlipped[fi] = b[fi] === 0 ? 2 : 0; // perturb the received level at one instant
    const dErr = symbolBySymbolDetect(bFlipped);
    errorFlags = d.map((dm, i) => (dm === dErr[i] ? 0 : 1));
  } else {
    errorFlags = errorPropagationDemo(a, fi);
  }

  // Three-level eye from the partial-response waveform Σ a_m x(t−mT).
  const sps = p.sps;
  const impulses: number[] = [];
  for (const am of a) {
    impulses.push(am);
    for (let i = 1; i < sps; i++) impulses.push(0);
  }
  const pulseSamp = duobinaryPulse(0.5, linspace(-3, 3, 6 * sps + 1));
  const sig = convolve(impulses, pulseSamp);
  const eye = eyeTraces(sig, sps, 2);

  const ber = { ebN0dB: p.ebN0dB, ...prBerCurves(p.ebN0dB) };
  const survivor = viterbiPR(b, 'duobinary').path;

  return { table: { d, p: pre, a, b, dHat }, errorFlags, eye, ber, survivor };
}

// ── §10.2 Power spectrum of digitally modulated signals ─────────────────────

export interface PsdParams {
  gt: 'nrz' | 'rc';
  symbols: 'iid' | 'corr';
  zeroMean: boolean;
  alpha: number;
}

export interface PsdView {
  freqs: number[];
  svContinuous: number[];
  svLines: { f: number; weight: number }[];
  sa: number[];
}

export function buildPsdView(p: PsdParams): PsdView {
  const T = 1;
  const freqs = linspace(-2.5, 2.5, 401);
  const gTMag = p.gt === 'nrz' ? rectNrzMag(1, T) : (f: number) => raisedCosineSpectrum(f, p.alpha, T);
  // Symbol autocorrelation: i.i.d. ⇒ flat S_a=σ_a²; correlated a_n=b_n+b_{n−1} ⇒ S_a=4cos²(πfT).
  const Ra = p.symbols === 'iid' ? [1] : [2, 1];
  const sigmaA2 = Ra[0];
  const mA = p.zeroMean ? 0 : 1;
  const sa = symbolPsd(Ra, T, freqs);
  const gMag = freqs.map(gTMag);
  // Continuous spectrum, general form S_v(f)=(1/T)·S_a(f)·|G_T(f)|² (Eq. 10.2.2).
  const svContinuous = freqs.map((_, i) => (1 / T) * sa[i] * gMag[i] ** 2);
  // Discrete spectral lines come from a non-zero symbol mean (Eq. 10.2.9).
  const svLines = pamPsd(gTMag, sigmaA2, mA, T, freqs).lines;
  return { freqs, svContinuous, svLines, sa };
}

// ── §10.5 Channel distortion & transmit/receive filter design ───────────────

export interface DistortionParams {
  ampDistort: number;
  phaseDistort: number;
  alpha: number;
}

export interface DistortionView {
  freqs: number[];
  mag: number[];
  phase: number[];
  tau: number[];
  gT: number[];
  t: number[];
  cleanPulse: number[];
  distorted: number[];
}

export function buildDistortionView(p: DistortionParams): DistortionView {
  const T = 1;
  const sps = 16;
  const span = 4;
  // Channel C(f) over the Nyquist band (normalized to ±1/2T).
  const freqs = linspace(-0.5, 0.5, 201);
  const C = channelResponse(freqs, p.ampDistort, p.phaseDistort);
  const tau = envelopeDelay(C.phase, freqs);
  // Tx filter that pre-compensates the channel for zero ISI (Eq. 10.5.1).
  const Xrc = freqs.map((f) => raisedCosineSpectrum(f, p.alpha, T));
  const { gT } = designFilters(C, Xrc);

  // Clean raised-cosine pulse and the same pulse after passing through C(f).
  const cleanPulse = pulseWaveform('rc', p.alpha, sps, span);
  const N = cleanPulse.length;
  const binFreqs = Array.from({ length: N }, (_, k) => (k <= N / 2 ? k : k - N) / N);
  const Cpulse = channelResponse(binFreqs, p.ampDistort, p.phaseDistort);
  const distorted = distortPulse(cleanPulse, Cpulse.mag, Cpulse.phase);
  const t = cleanPulse.map((_, i) => (i - (N - 1) / 2) / sps);

  return { freqs, mag: C.mag, phase: C.phase, tau, gT, t, cleanPulse, distorted };
}
