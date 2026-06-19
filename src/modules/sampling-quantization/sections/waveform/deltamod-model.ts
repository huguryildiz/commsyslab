import { linspace } from '@/lib/dsp/math';
import { deltaModulate } from '@/lib/dsp/deltamod';
import type { Bit } from '@/lib/sim/sources';

export interface DeltaModParams {
  /** Tone frequency f (Hz). */
  toneFreq: number;
  /** Tone amplitude A. */
  toneAmp: number;
  /** Sampling rate fs (samples/sec). */
  fs: number;
  /** Delta step size. */
  step: number;
  /** Left edge of the visible window (seconds). */
  t0: number;
  /** Width of the visible window (seconds). */
  windowSec: number;
  /** Dense analog-curve resolution. */
  analogN?: number;
}

export interface DeltaModView {
  analog: { t: number[]; x: number[] };
  sampleTimes: number[];
  sampleValues: number[];
  staircase: number[];
  bits: Bit[];
  error: number[];
  /** True at sample i when the analog moved more than one step since i-1 (slope overload). */
  overload: boolean[];
  slopeLimit: number;
  maxSignalSlope: number;
  overloading: boolean;
  snrDb: number;
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Sample a tone, run DM from the time origin, and slice the visible window. Pure. */
export function buildDeltaModView(p: DeltaModParams): DeltaModView {
  const { toneFreq, toneAmp, fs, step, t0, windowSec } = p;
  const analogN = p.analogN ?? 400;
  const t1 = t0 + windowSec;
  const tone = (t: number) => toneAmp * Math.sin(2 * Math.PI * toneFreq * t);

  const at = linspace(t0, t1, analogN);
  const ax = at.map(tone);

  // DM from the origin: sample n = 0..nEnd, then slice the window [nStart, nEnd].
  const Ts = 1 / fs;
  const nEnd = Math.floor(t1 / Ts);
  const nStart = Math.ceil(t0 / Ts);
  const allValues: number[] = [];
  for (let n = 0; n <= nEnd; n++) allValues.push(tone(n * Ts));
  const { bits: allBits, staircase: allStair } = deltaModulate(allValues, step, 0);
  const overloadAll = allValues.map((v, i) =>
    i === 0 ? false : Math.abs(v - allValues[i - 1]) > step,
  );

  const sampleTimes: number[] = [];
  for (let n = nStart; n <= nEnd; n++) sampleTimes.push(n * Ts);
  const sampleValues = allValues.slice(nStart);
  const staircase = allStair.slice(nStart);
  const bits = allBits.slice(nStart);
  const overload = overloadAll.slice(nStart);
  const error = sampleValues.map((v, i) => v - staircase[i]);

  const sigP = mean(sampleValues.map((v) => v * v));
  const errP = mean(error.map((e) => e * e));

  return {
    analog: { t: at, x: ax },
    sampleTimes,
    sampleValues,
    staircase,
    bits,
    error,
    overload,
    slopeLimit: step * fs,
    maxSignalSlope: toneAmp * 2 * Math.PI * toneFreq,
    overloading: toneAmp * 2 * Math.PI * toneFreq > step * fs,
    snrDb: errP > 0 ? 10 * Math.log10(sigP / errP) : Infinity,
  };
}
