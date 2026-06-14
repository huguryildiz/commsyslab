import { cpfskPhaseTree, mskPsdDb, qpskPsdDb } from '@/lib/dsp/cpm';
import { linspace } from '@/lib/dsp/math';

export interface CpmParams {
  modIndexH: number; // CPM modulation index h (0.5 = MSK)
  treeDepth: number; // symbols deep for the phase tree (2^depth trajectories)
}

export const DEFAULT_CPM_PARAMS: CpmParams = {
  modIndexH: 0.5,
  treeDepth: 4,
};

export interface CpmDerived {
  treeTime: number[]; // t/T axis for the phase tree
  phaseTree: number[][]; // φ/π trajectories (2^depth of them)
  psdFreqT: number[]; // f·T axis
  mskPsd: number[]; // MSK PSD (dB)
  qpskPsd: number[]; // QPSK PSD (dB)
  peakPhaseDeg: number; // per-symbol phase change h·180°
  isMsk: boolean;
}

const SPS = 20;
const PSD_FREQ = linspace(0, 3, 241);

/** Pure derivation of CPM/MSK plot data. Memoize on params. */
export function deriveCpm(p: CpmParams): CpmDerived {
  const tree = cpfskPhaseTree(p.modIndexH, SPS, p.treeDepth);
  const len = p.treeDepth * SPS;
  const treeTime = Array.from({ length: len }, (_, n) => n / SPS);
  return {
    treeTime,
    phaseTree: tree.map((traj) => traj.map((v) => v / Math.PI)),
    psdFreqT: PSD_FREQ,
    mskPsd: PSD_FREQ.map((f) => mskPsdDb(f)),
    qpskPsd: PSD_FREQ.map((f) => qpskPsdDb(f)),
    peakPhaseDeg: p.modIndexH * 180,
    isMsk: Math.abs(p.modIndexH - 0.5) < 1e-9,
  };
}
