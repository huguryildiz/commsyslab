import {
  awgnBerAntipodal,
  rayleighBerAntipodal,
  rayleighBerOrthogonal,
  mrcBerAntipodal,
} from '@/lib/dsp/diversity';
import { compositeOutage } from '@/lib/dsp/shadowing';
import { linspace } from '@/lib/dsp/math';

export type BerModulation = 'antipodal' | 'orthogonal';

export interface BerParams {
  modulation: BerModulation;
  diversityL: number; // MRC branches (antipodal only)
  shadowingSigmaDb: number; // outage-panel headline shadowing sigma (dB)
  outageThreshDb: number; // outage SNR threshold gamma_th (dB)
}

export const DEFAULT_BER_PARAMS: BerParams = {
  modulation: 'antipodal',
  diversityL: 2,
  shadowingSigmaDb: 8,
  outageThreshDb: 5,
};

export interface BerDerived {
  ebN0: number[]; // dB sweep (x-axis for BER curves)
  awgn: number[]; // AWGN antipodal BER
  rayleigh: number[]; // single-branch Rayleigh BER (selected modulation)
  mrc: number[]; // MRC order-L antipodal BER
  outage: {
    gammaBar: number[]; // dB sweep (x-axis for outage)
    curves: { sigmaDb: number; pout: number[] }[]; // sigma = 0, 4, headline
  };
}

const EB_N0 = linspace(0, 30, 121); // dB
const GAMMA_BAR = linspace(0, 30, 121); // dB
const OUTAGE_SIGMAS = [0, 4]; // fixed comparison shadowing levels (dB); headline appended

/** Pure derivation of plot-ready BER + outage arrays. Memoize on params. */
export function deriveBer(p: BerParams): BerDerived {
  const rayleighBer = p.modulation === 'orthogonal' ? rayleighBerOrthogonal : rayleighBerAntipodal;

  const awgn = EB_N0.map((db) => awgnBerAntipodal(db));
  const rayleigh = EB_N0.map((db) => rayleighBer(db));
  const mrc = EB_N0.map((db) => mrcBerAntipodal(db, p.diversityL));

  const sigmas = OUTAGE_SIGMAS.includes(p.shadowingSigmaDb)
    ? OUTAGE_SIGMAS
    : [...OUTAGE_SIGMAS, p.shadowingSigmaDb];
  const curves = sigmas.map((sigmaDb) => ({
    sigmaDb,
    pout: GAMMA_BAR.map((db) => compositeOutage(p.outageThreshDb, db, sigmaDb)),
  }));

  return { ebN0: EB_N0, awgn, rayleigh, mrc, outage: { gammaBar: GAMMA_BAR, curves } };
}
