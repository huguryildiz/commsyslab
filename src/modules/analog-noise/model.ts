import {
  outputSnrDb,
  demodulationGainDb,
  fmThresholdCnrDb,
  addNoiseAtSnr,
  type AnalogScheme,
  type SnrParams,
} from '@/lib/dsp/analognoise';
import { makeRng } from '@/lib/dsp/random';
import { linspace } from '@/lib/dsp/math';

export type { AnalogScheme, SnrParams } from '@/lib/dsp/analognoise';

export interface ScenarioParams {
  scheme: AnalogScheme;
  messageFreq: number; // Hz
  W: number; // Hz
  cnrDb: number; // channel SNR γ (dB)
  amIndex: number; // a
  beta: number; // β
  emphasis: boolean;
  fs: number;
  N: number;
}

export const DEFAULT_PARAMS: ScenarioParams = {
  scheme: 'fm',
  messageFreq: 5,
  W: 15000,
  cnrDb: 20,
  amIndex: 0.5,
  beta: 5,
  emphasis: false,
  fs: 400,
  N: 512,
};

const SCHEMES: AnalogScheme[] = ['dsb', 'ssb', 'am', 'fm'];
export const MESSAGE_POWER = 0.5; // normalized single-tone message power (½ for unit-amplitude sine)

function snrParams(p: ScenarioParams): SnrParams {
  return { amIndex: p.amIndex, beta: p.beta, messagePower: MESSAGE_POWER, emphasis: p.emphasis, W: p.W };
}

export interface Derived {
  reference: Float64Array; // clean message (time)
  outputNoisy: Float64Array; // demod output synthesized at the theoretical SNR_o
  outputSnrDb: number;
  demodGainDb: number;
  cnrSweep: Float64Array; // x-axis (dB)
  curves: Record<AnalogScheme, Float64Array>; // SNR_o(dB) per scheme over the sweep
  fmThresholdDb: number;
}

/** Pure derivation of plot-ready arrays from the shared scenario. Memoize on params. */
export function deriveAll(p: ScenarioParams): Derived {
  const sp = snrParams(p);
  const reference = new Float64Array(p.N);
  for (let n = 0; n < p.N; n++) reference[n] = Math.sin((2 * Math.PI * p.messageFreq * n) / p.fs);

  const snrOut = outputSnrDb(p.scheme, p.cnrDb, sp);
  const rng = makeRng(Math.round(p.cnrDb * 7 + p.beta * 13 + 1)); // vary with params, deterministic
  const outputNoisy = addNoiseAtSnr(reference, snrOut, rng);

  const cnrSweep = Float64Array.from(linspace(0, 40, 81));
  const curves = {} as Record<AnalogScheme, Float64Array>;
  for (const s of SCHEMES) {
    const arr = new Float64Array(cnrSweep.length);
    for (let i = 0; i < cnrSweep.length; i++) arr[i] = outputSnrDb(s, cnrSweep[i], sp);
    curves[s] = arr;
  }

  return {
    reference,
    outputNoisy,
    outputSnrDb: snrOut,
    demodGainDb: demodulationGainDb(p.scheme, sp),
    cnrSweep,
    curves,
    fmThresholdDb: fmThresholdCnrDb(p.beta),
  };
}
