import {
  exponentialPdp,
  rmsDelaySpread,
  coherenceBandwidth,
  coherenceTime,
  channelFreqResponse,
  envelopeSeries,
  rayleighPdf,
  ricianPdf,
  type Tap,
} from '@/lib/dsp/fading';
import { makeRng } from '@/lib/dsp/random';
import { linspace } from '@/lib/dsp/math';

export interface ScenarioParams {
  nTaps: number;
  tauRmsUs: number; // RMS delay constant of the exponential PDP, microseconds
  tapSpacingUs: number; // tap spacing, microseconds
  K: number; // Rician K-factor (0 = Rayleigh)
  fD: number; // max Doppler shift, Hz
  nSamples: number; // envelope time samples
  fs: number; // envelope sampling rate, Hz
  seed: number;
}

export const DEFAULT_PARAMS: ScenarioParams = {
  nTaps: 6,
  tauRmsUs: 1.0,
  tapSpacingUs: 0.5,
  K: 0,
  fD: 100,
  nSamples: 256,
  fs: 1000,
  seed: 1,
};

export interface Derived {
  taps: Tap[];
  sigmaTau: number; // seconds
  coherenceBw: number; // Hz
  coherenceTime: number; // seconds
  freqs: number[]; // Hz (frequency-response x-axis)
  magResponse: number[]; // |H(f)|
  envelope: Float64Array; // |r(t)|
  pdf: { r: number[]; fr: number[] }; // envelope PDF curve
}

const FREQ_SPAN = 5e6; // ±5 MHz frequency-response window

/** Pure derivation of plot-ready data from the scenario. Memoize on params. */
export function deriveAll(p: ScenarioParams): Derived {
  const taps = exponentialPdp(p.nTaps, p.tauRmsUs * 1e-6, p.tapSpacingUs * 1e-6);
  const sigmaTau = rmsDelaySpread(taps);

  const freqs = linspace(-FREQ_SPAN, FREQ_SPAN, 256);
  const magResponse = channelFreqResponse(taps, freqs, makeRng(p.seed));

  const envelope = envelopeSeries(
    { fD: p.fD, K: p.K, nSamples: p.nSamples, fs: p.fs },
    makeRng(p.seed + 101),
  );

  const sigma = 1; // unit-power scatter reference for the PDF curve
  const r = linspace(0, 4, 160);
  const fr = r.map((rv) => (p.K === 0 ? rayleighPdf(rv, sigma) : ricianPdf(rv, sigma, p.K)));

  return {
    taps,
    sigmaTau,
    coherenceBw: coherenceBandwidth(sigmaTau),
    coherenceTime: coherenceTime(p.fD),
    freqs,
    magResponse,
    envelope,
    pdf: { r, fr },
  };
}
