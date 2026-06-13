// src/modules/baseband/model.ts — pure derived-data builders for the Baseband tabs (no React).
import { linspace } from '@/lib/dsp/math';
import {
  pulseWaveform,
  raisedCosineSpectrum,
  raisedCosineBandwidth,
  nyquistOffCenterSamples,
  type PulseKind,
} from '@/lib/dsp/pulse';
import { matchedFilter, matchedFilterOutput, correlate, pulseEnergy, peakSnr, convolve } from '@/lib/dsp/matchedfilter';
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
