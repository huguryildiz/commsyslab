import { evalSignal, signalBandwidth, signalPower, type Tone } from '@/lib/dsp/signals';
import {
  sample,
  sincReconstruct,
  nyquistRate,
  samplingRegime,
  type SamplingRegime,
} from '@/lib/dsp/sampling';
import {
  quantize,
  quantizationError,
  step,
  quantizationNoisePower,
  sqnrTheoreticalDb,
  sqnrMeasuredDb,
  type QuantizerType,
} from '@/lib/dsp/quantize';
import { pcmStream, type PcmCoding } from '@/lib/dsp/pcm';
import { linspace } from '@/lib/dsp/math';
import type { Bit } from '@/lib/sim/sources';

export interface SamplingParams {
  tones: Tone[];
  fs: number;
  bits: number;
  mMax: number;
  type: QuantizerType;
  coding: PcmCoding;
  /** Left edge of the visible time window (seconds). */
  t0: number;
  /** Width of the visible time window (seconds). */
  windowSec: number;
  /** Dense-curve resolution for analog + reconstructed traces. */
  analogN?: number;
}

export interface XY {
  t: number[];
  x: number[];
}

export interface SamplingView {
  analog: XY;
  samples: XY;
  reconstructed: XY;
  quantized: XY;
  error: { t: number[]; e: number[] };
  pcm: Bit[];
  bandwidth: number;
  nyquist: number;
  regime: SamplingRegime;
  delta: number;
  noisePower: number;
  sqnrTheoryDb: number;
  sqnrMeasuredDb: number;
}

/** Assemble all panel traces + scalar metrics for a time window. Pure. */
export function buildSamplingView(p: SamplingParams): SamplingView {
  const { tones, fs, bits, mMax, type, coding, t0, windowSec } = p;
  const analogN = p.analogN ?? 400;
  const t1 = t0 + windowSec;

  const at = linspace(t0, t1, analogN);
  const ax = at.map((t) => evalSignal(tones, t));

  const s = sample(tones, fs, t0, t1);
  const rx = at.map((t) => sincReconstruct(s, t));

  const qx = s.values.map((v) => quantize(v, mMax, bits, type));
  const err = quantizationError(s.values, qx);
  const pcm = pcmStream(s.values, mMax, bits, type, coding);

  return {
    analog: { t: at, x: ax },
    samples: { t: s.times, x: s.values },
    reconstructed: { t: at, x: rx },
    quantized: { t: s.times, x: qx },
    error: { t: s.times, e: err },
    pcm,
    bandwidth: signalBandwidth(tones),
    nyquist: nyquistRate(tones),
    regime: samplingRegime(fs, signalBandwidth(tones)),
    delta: step(mMax, bits),
    noisePower: quantizationNoisePower(mMax, bits),
    sqnrTheoryDb: sqnrTheoreticalDb(signalPower(tones), mMax, bits),
    sqnrMeasuredDb: sqnrMeasuredDb(s.values, qx),
  };
}
