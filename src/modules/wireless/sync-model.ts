/**
 * Plot-ready derivation for the SS Synchronization tab. Delegates to the pure
 * sync DSP in `@/lib/dsp/ssync`. Proakis & Salehi §15.6, p.849.
 */
import { mSequence } from '@/lib/dsp/spread';
import { searchProfile, meanAcqTimeCells, dllSCurve } from '@/lib/dsp/ssync';

export interface SyncParams {
  n: number; // PN register length (5..7)
  pd: number; // detection probability
  pfa: number; // false-alarm probability
  delta: number; // early-late gate spacing (chips)
}

export const DEFAULT_SYNC_PARAMS: SyncParams = {
  n: 5,
  pd: 0.9,
  pfa: 0.01,
  delta: 0.5,
};

export interface SyncDerived {
  profile: number[]; // serial-search correlation vs code-phase offset
  trueOffset: number; // offset of the correlation peak
  threshold: number; // detection threshold drawn on the search plot
  meanAcqCells: number; // mean acquisition time (cells)
  period: number;
  sCurve: { tau: number; disc: number }[]; // DLL discriminator S-curve
  delta: number;
}

const TAUS: number[] = [];
for (let x = -1.5; x <= 1.5001; x += 0.05) TAUS.push(Math.round(x * 1000) / 1000);

/** Pure derivation of synchronization plot data. Memoize on params. */
export function deriveSync(p: SyncParams): SyncDerived {
  const pn = mSequence(p.n);
  const profile = searchProfile(pn);
  const period = pn.length;
  // Peak (true offset) is at lag 0 for the aligned replica.
  let trueOffset = 0;
  let best = -Infinity;
  for (let k = 0; k < profile.length; k++) {
    if (profile[k] > best) {
      best = profile[k];
      trueOffset = k;
    }
  }
  const disc = dllSCurve(TAUS, p.delta);
  return {
    profile,
    trueOffset,
    threshold: period * 0.5, // half the peak — a typical acquisition threshold
    meanAcqCells: meanAcqTimeCells(period, p.pd, p.pfa, 1),
    period,
    sCurve: TAUS.map((tau, i) => ({ tau, disc: disc[i] })),
    delta: p.delta,
  };
}
