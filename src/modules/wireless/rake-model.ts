import { exponentialPdp } from '@/lib/dsp/fading';
import { rayleighBerAntipodal, awgnBerAntipodal } from '@/lib/dsp/diversity';
import { resolvableFingers, rakeBerAntipodal } from '@/lib/dsp/rake';
import { linspace } from '@/lib/dsp/math';

export interface RakeParams {
  nTaps: number; // multipath taps in the profile
  tauRmsNs: number; // RMS delay spread (ns)
  tapSpacingNs: number; // spacing between taps (ns)
  chipRateMcps: number; // chip rate (Mcps) → chip duration Tc = 1/W
  ebN0Db: number; // operating point for the per-finger SNR bars
}

export const DEFAULT_RAKE_PARAMS: RakeParams = {
  nTaps: 6,
  tauRmsNs: 500,
  tapSpacingNs: 200,
  chipRateMcps: 3,
  ebN0Db: 12,
};

export interface RakeDerived {
  tapDelaysNs: number[];
  tapPowers: number[];
  chipDurationNs: number;
  fingerCount: number;
  fingerPowers: number[];
  fingerSnrsDb: number[];
  ebN0Sweep: number[];
  berNoRake: number[];
  berRake: number[];
  berAwgn: number[];
}

const EB_N0 = linspace(0, 30, 121);

/** Pure derivation of RAKE plot-ready data. Memoize on params. */
export function deriveRake(p: RakeParams): RakeDerived {
  const taps = exponentialPdp(p.nTaps, p.tauRmsNs * 1e-9, p.tapSpacingNs * 1e-9);
  const chipDurationS = 1 / (p.chipRateMcps * 1e6);
  const fingerPowers = resolvableFingers(taps, chipDurationS);
  const fingerCount = fingerPowers.length;

  return {
    tapDelaysNs: taps.map((t) => t.delay * 1e9),
    tapPowers: taps.map((t) => t.power),
    chipDurationNs: chipDurationS * 1e9,
    fingerCount,
    fingerPowers,
    fingerSnrsDb: fingerPowers.map((pw) => p.ebN0Db + 10 * Math.log10(pw)),
    ebN0Sweep: EB_N0,
    berNoRake: EB_N0.map((e) => rayleighBerAntipodal(e)),
    berRake: EB_N0.map((e) => rakeBerAntipodal(e, fingerCount)),
    berAwgn: EB_N0.map((e) => awgnBerAntipodal(e)),
  };
}
