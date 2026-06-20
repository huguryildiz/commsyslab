/**
 * Plot-ready derivation for the PN Codes tab. Delegates to the pure PN DSP in
 * `@/lib/dsp/pnseq` (and `pnAutocorrelation` from `spread`). Proakis §15.4, p.840.
 */
import { pnAutocorrelation } from '@/lib/dsp/spread';
import {
  mSequenceStates,
  mSequenceTaps,
  balance,
  goldCode,
  crossCorrelation,
  goldThreeValuedSet,
} from '@/lib/dsp/pnseq';

export interface PnParams {
  n: number; // LFSR register length (5..7)
  goldShift: number; // shift selecting the second Gold code for cross-correlation
}

export const DEFAULT_PN_PARAMS: PnParams = {
  n: 5,
  goldShift: 1,
};

export interface PnDerived {
  n: number;
  period: number; // 2^n - 1
  taps: number[]; // feedback tap positions
  seq: number[]; // m-sequence chips (±1)
  states: number[][]; // register snapshots for the LFSR animation
  autocorr: number[]; // thumbtack autocorrelation
  crossCorr: number[]; // Gold cross-correlation (bounded, three-valued)
  crossPeak: number; // max |crossCorr|
  threeValued: number[]; // {-1, -t(n), t(n)-2}
  balance: { ones: number; zeros: number };
  processingGainDb: number;
}

/** Pure derivation of PN-code plot data. Memoize on params. */
export function derivePn(p: PnParams): PnDerived {
  const { seq, states } = mSequenceStates(p.n);
  const period = seq.length;
  const autocorr = pnAutocorrelation(seq);
  const shift = Math.max(1, p.goldShift);
  const crossCorr = crossCorrelation(goldCode(p.n, 0), goldCode(p.n, shift));
  const crossPeak = Math.max(...crossCorr.map((v) => Math.abs(v)));
  return {
    n: p.n,
    period,
    taps: mSequenceTaps(p.n),
    seq,
    states,
    autocorr,
    crossCorr,
    crossPeak,
    threeValued: goldThreeValuedSet(p.n),
    balance: balance(seq),
    processingGainDb: 10 * Math.log10(period),
  };
}
