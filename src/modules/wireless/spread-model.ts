import {
  mSequence,
  pnAutocorrelation,
  spreadBits,
  processingGainDb,
  dsssBer,
  dsssDetectorPe,
} from '@/lib/dsp/spread';
import { spectrum } from '@/lib/dsp/fft';
import { makeRng } from '@/lib/dsp/random';
import { linspace } from '@/lib/dsp/math';

export interface SpreadParams {
  registerLength: number; // LFSR stages n → N = 2^n - 1 chips/bit
  ebN0Db: number; // E_b/N_0 (dB)
  jsrDb: number; // jammer-to-signal ratio (dB) — headline operating point
  jammerOffset: number; // CW jammer frequency as a fraction of the chip-rate band [0..0.5]
  seed: number;
}

export const DEFAULT_SPREAD_PARAMS: SpreadParams = {
  registerLength: 5, // N = 31
  ebN0Db: 8,
  jsrDb: 10,
  jammerOffset: 0.25,
  seed: 1,
};

export interface SpreadDerived {
  N: number;
  processingGainDb: number;
  autocorr: number[]; // cyclic PN autocorrelation (peak N at 0)
  freqs: number[]; // spectrum x-axis (normalized 0..0.5)
  spectrumSpread: number[]; // |FFT| of (spread signal + CW jammer), pre-despread
  spectrumDespread: number[]; // |FFT| after multiplying by the PN code again
  jsrSweep: number[]; // dB
  berSpread: number[]; // DS-SS BER vs JSR (processing gain N)
  berUnspread: number[]; // BER with no spreading (N = 1)
  detectorPe: number; // Pe at the detector for the operating point (§15.2.2)
}

const JSR_SWEEP = linspace(-10, 40, 101); // dB

/** Pure derivation of plot-ready DS-SS data. Memoize on params. */
export function deriveSpread(p: SpreadParams): SpreadDerived {
  const pn = mSequence(p.registerLength);
  const N = pn.length;

  // One data bit (+1) spread across the PN period, plus a CW jammer tone.
  const chips = spreadBits([1], pn);
  const rng = makeRng(p.seed);
  const jsr = 10 ** (p.jsrDb / 10);
  const jamAmp = Math.sqrt(jsr); // jammer amplitude relative to unit chip amplitude
  const phase0 = 2 * Math.PI * rng();
  const jammed = chips.map(
    (c, i) => c + jamAmp * Math.cos(2 * Math.PI * p.jammerOffset * i + phase0),
  );

  // Despread by multiplying the received chips by the same PN code again.
  const despreadSig = jammed.map((v, i) => v * pn[i % N]);

  // Two-sided fftshifted spectra; keep the non-negative-frequency half so the
  // x-axis runs 0..fs/2 ascending (spectrum() returns { freq, mag, phase }).
  const preSpec = spectrum(jammed, 1);
  const postSpec = spectrum(despreadSig, 1);
  const startPos = Math.floor(preSpec.freq.length / 2);
  const freqs = preSpec.freq.slice(startPos);
  const spectrumSpread = preSpec.mag.slice(startPos);
  const spectrumDespread = postSpec.mag.slice(startPos);

  const berSpread = JSR_SWEEP.map((jsrDb) => dsssBer(p.ebN0Db, jsrDb, N));
  const berUnspread = JSR_SWEEP.map((jsrDb) => dsssBer(p.ebN0Db, jsrDb, 1));

  return {
    N,
    processingGainDb: processingGainDb(N),
    autocorr: pnAutocorrelation(pn),
    freqs,
    spectrumSpread,
    spectrumDespread,
    jsrSweep: JSR_SWEEP,
    berSpread,
    berUnspread,
    detectorPe: dsssDetectorPe(p.ebN0Db, p.jsrDb, N),
  };
}
