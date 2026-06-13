import {
  generateEnsemble,
  ensembleMean,
  ensembleAutocorr,
  timeAutocorr,
  periodogram,
  theoreticalAutocorr,
  theoreticalPsd,
  filterMagSq,
  type ProcessParams,
} from '@/lib/dsp/random';
import { linspace } from '@/lib/dsp/math';

export type { ProcessParams, ProcessKind } from '@/lib/dsp/random';

export const DEFAULT_PARAMS: ProcessParams = {
  kind: 'randphase-sine',
  amplitude: 1,
  f0: 5,
  n0: 1,
  fs: 200,
  M: 200,
  N: 256,
  seed: 1,
  filterKind: 'rc',
  cutoff: 20,
};

export interface Derived {
  ensemble: Float64Array[];
  mean: Float64Array;
  lags: Float64Array; // seconds
  rEnsemble: Float64Array;
  rTime: Float64Array;
  rTheory: Float64Array;
  freqs: Float64Array; // Hz, 0..fs/2
  psdEstimate: Float64Array;
  psdTheory: Float64Array;
  filterMag: Float64Array; // |H|^2 over freqs
}

const MAX_LAG = 80;

/** Pure derivation of every plot-ready array from the shared params. Memoize on params. */
export function deriveAll(p: ProcessParams): Derived {
  const ensemble = generateEnsemble(p);
  const mean = ensembleMean(ensemble);

  const lagsArr = new Float64Array(MAX_LAG + 1);
  for (let k = 0; k <= MAX_LAG; k++) lagsArr[k] = k / p.fs;
  const rEnsemble = ensembleAutocorr(ensemble, MAX_LAG);
  const rTime = timeAutocorr(ensemble[0], MAX_LAG);
  const rTheory = theoreticalAutocorr(p, lagsArr);

  const half = Math.floor(p.N / 2);
  const freqs = Float64Array.from(linspace(0, p.fs / 2, half + 1));
  const psdEstimate = periodogram(ensemble);
  const psdTheory = theoreticalPsd(p, freqs);
  const filterMag = filterMagSq(p, freqs);

  return { ensemble, mean, lags: lagsArr, rEnsemble, rTime, rTheory, freqs, psdEstimate, psdTheory, filterMag };
}
