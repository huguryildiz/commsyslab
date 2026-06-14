import { rayleighBerAntipodal } from '@/lib/dsp/diversity';
import { alamoutiBerAntipodal, mimoCapacity } from '@/lib/dsp/mimo';
import { linspace } from '@/lib/dsp/math';

export interface MimoParams {
  nt: number; // transmit antennas (capacity)
  nr: number; // receive antennas (capacity + SIMO curve)
  trials: number; // Monte-Carlo trials for ergodic capacity
  seed: number; // RNG seed (deterministic)
}

export const DEFAULT_MIMO_PARAMS: MimoParams = {
  nt: 2,
  nr: 2,
  trials: 300,
  seed: 12345,
};

export interface MimoDerived {
  ebN0Sweep: number[];
  berSiso: number[];
  berAlamouti21: number[];
  berAlamouti22: number[];
  snrSweep: number[];
  capSiso: number[];
  capSimo: number[]; // 1 × Nr
  capMimo: number[]; // Nt × Nr
  capLabelSimo: string;
  capLabelMimo: string;
}

const EB_N0 = linspace(0, 30, 121);
const SNR = linspace(0, 30, 31);

/** Pure derivation of MIMO plot-ready data. Memoize on params. */
export function deriveMimo(p: MimoParams): MimoDerived {
  return {
    ebN0Sweep: EB_N0,
    berSiso: EB_N0.map((e) => rayleighBerAntipodal(e)),
    berAlamouti21: EB_N0.map((e) => alamoutiBerAntipodal(e, 1)),
    berAlamouti22: EB_N0.map((e) => alamoutiBerAntipodal(e, 2)),
    snrSweep: SNR,
    capSiso: SNR.map((s) => mimoCapacity(s, 1, 1, p.trials, p.seed)),
    capSimo: SNR.map((s) => mimoCapacity(s, 1, p.nr, p.trials, p.seed)),
    capMimo: SNR.map((s) => mimoCapacity(s, p.nt, p.nr, p.trials, p.seed)),
    capLabelSimo: `1×${p.nr}`,
    capLabelMimo: `${p.nt}×${p.nr}`,
  };
}
