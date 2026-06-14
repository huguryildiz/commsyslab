import {
  processingGainDb,
  partialBandBerBfsk,
  fullBandBerBfsk,
  worstCaseBeta,
  worstCaseBerBfsk,
  hopPattern,
} from '@/lib/dsp/fhss';
import { linspace } from '@/lib/dsp/math';

export interface FhssParams {
  nHopChannels: number; // number of hopping frequency slots (W/R)
  nHops: number; // hops shown in the time-frequency plot
  beta: number; // partial-band jamming fraction (0..1)
  ebN0JDb: number; // E_b/N_J operating point (dB)
  seed: number; // hop-pattern RNG seed
}

export const DEFAULT_FHSS_PARAMS: FhssParams = {
  nHopChannels: 32,
  nHops: 40,
  beta: 0.1,
  ebN0JDb: 15,
  seed: 5,
};

export interface FhssDerived {
  processingGainDb: number;
  worstBetaAtOp: number;
  worstBerAtOp: number;
  betaBerAtOp: number;
  hopIdx: number[];
  ebN0JSweep: number[];
  berFull: number[];
  berBeta: number[];
  berWorst: number[];
}

const EB_N0J = linspace(0, 30, 121);

/** Pure derivation of FH-SS plot data. Memoize on params. */
export function deriveFhss(p: FhssParams): FhssDerived {
  return {
    processingGainDb: processingGainDb(p.nHopChannels),
    worstBetaAtOp: worstCaseBeta(p.ebN0JDb),
    worstBerAtOp: worstCaseBerBfsk(p.ebN0JDb),
    betaBerAtOp: partialBandBerBfsk(p.ebN0JDb, p.beta),
    hopIdx: hopPattern(p.nHopChannels, p.nHops, p.seed),
    ebN0JSweep: EB_N0J,
    berFull: EB_N0J.map((e) => fullBandBerBfsk(e)),
    berBeta: EB_N0J.map((e) => partialBandBerBfsk(e, p.beta)),
    berWorst: EB_N0J.map((e) => worstCaseBerBfsk(e)),
  };
}
