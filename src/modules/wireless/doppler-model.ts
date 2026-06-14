import {
  maxDopplerHz,
  coherenceTimeS,
  coherenceTimeRuleS,
  jakesDopplerPsd,
  dopplerAutocorr,
  levelCrossingRateHz,
  avgFadeDurationS,
  fadingEnvelope,
} from '@/lib/dsp/doppler';
import { linspace } from '@/lib/dsp/math';

export interface DopplerParams {
  speedKmh: number; // mobile speed (km/h)
  carrierGHz: number; // carrier frequency (GHz)
  thresholdDb: number; // fade threshold ρ in dB relative to RMS
  seed: number; // envelope RNG seed (deterministic)
}

export const DEFAULT_DOPPLER_PARAMS: DopplerParams = {
  speedKmh: 90,
  carrierGHz: 0.9,
  thresholdDb: -10,
  seed: 7,
};

export interface DopplerDerived {
  fmHz: number;
  coherenceTimeMs: number;
  coherenceTimeRuleMs: number;
  lcrHz: number;
  afdMs: number;
  thresholdDb: number;
  // U-shaped Doppler power spectrum
  psdFreq: number[];
  psdVal: number[];
  // autocorrelation J0(2π f_m τ)
  acfTauMs: number[];
  acfVal: number[];
  // envelope time series (dB, unit-RMS reference)
  envTimeMs: number[];
  envDb: number[];
}

const N_PSD = 201;
const N_ACF = 201;
const N_ENV = 512;

/** Pure derivation of Doppler / time-selective-fading plot data. Memoize on params. */
export function deriveDoppler(p: DopplerParams): DopplerDerived {
  const speedMps = p.speedKmh / 3.6;
  const carrierHz = p.carrierGHz * 1e9;
  const fm = maxDopplerHz(speedMps, carrierHz);

  // ρ as a normalized amplitude (envelope is unit-RMS): ρ = 10^(dB/20).
  const rhoNorm = 10 ** (p.thresholdDb / 20);

  // Doppler PSD over (−f_m, f_m); clamp just inside the integrable band edge.
  const psdFreq = linspace(-0.995 * fm, 0.995 * fm, N_PSD);
  const psdVal = psdFreq.map((f) => jakesDopplerPsd(f, fm));

  // Autocorrelation over a few Doppler periods.
  const tauMax = fm > 0 ? 3 / fm : 1;
  const acfTau = linspace(0, tauMax, N_ACF);
  const acfVal = acfTau.map((tau) => dopplerAutocorr(tau, fm));

  // Envelope over ~20 Doppler periods.
  const duration = fm > 0 ? 20 / fm : 1;
  const fs = N_ENV / duration;
  const env = fadingEnvelope(fm, fs, N_ENV, p.seed);
  const envTime = linspace(0, duration, N_ENV);

  return {
    fmHz: fm,
    coherenceTimeMs: coherenceTimeS(fm) * 1e3,
    coherenceTimeRuleMs: coherenceTimeRuleS(fm) * 1e3,
    lcrHz: levelCrossingRateHz(rhoNorm, fm),
    afdMs: avgFadeDurationS(rhoNorm, fm) * 1e3,
    thresholdDb: p.thresholdDb,
    psdFreq,
    psdVal,
    acfTauMs: acfTau.map((t) => t * 1e3),
    acfVal,
    envTimeMs: envTime.map((t) => t * 1e3),
    envDb: env.map((v) => 20 * Math.log10(Math.max(v, 1e-4))),
  };
}
