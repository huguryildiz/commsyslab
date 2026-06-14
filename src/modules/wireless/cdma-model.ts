import { cdmaSir, cdmaBer, userCapacity } from '@/lib/dsp/cdma';
import { linspace } from '@/lib/dsp/math';

export interface CdmaParams {
  processingGain: number; // L_c = W/R
  nUsers: number; // active users
  ebN0Db: number; // E_b/N_0 (dB)
  nearFarDb: number; // interferer power excess Γ (dB); 0 = perfect power control
}

export const DEFAULT_CDMA_PARAMS: CdmaParams = {
  processingGain: 63,
  nUsers: 15,
  ebN0Db: 12,
  nearFarDb: 0,
};

const TARGET_BER = 1e-3;
const MAX_USERS = 80;

export interface CdmaDerived {
  nearFarRatio: number;
  sirDb: number;
  berAtOp: number;
  capacity: number;
  targetBer: number;
  userSweep: number[];
  berVsUsers: number[]; // equal-power BER vs user count at the operating E_b/N_0
  ebN0Sweep: number[];
  berPc: number[]; // perfect power control (Γ=1)
  berNf: number[]; // near-far (Γ from slider)
}

const EB_N0 = linspace(0, 20, 101);

/** Pure derivation of CDMA plot data. Memoize on params. */
export function deriveCdma(p: CdmaParams): CdmaDerived {
  const nearFarRatio = 10 ** (p.nearFarDb / 10);
  const userSweep = Array.from({ length: MAX_USERS }, (_, i) => i + 1);
  return {
    nearFarRatio,
    sirDb: 10 * Math.log10(cdmaSir(p.processingGain, p.nUsers, nearFarRatio)),
    berAtOp: cdmaBer(p.processingGain, p.nUsers, p.ebN0Db, nearFarRatio),
    capacity: userCapacity(p.processingGain, p.ebN0Db, TARGET_BER, nearFarRatio),
    targetBer: TARGET_BER,
    userSweep,
    berVsUsers: userSweep.map((n) => cdmaBer(p.processingGain, n, p.ebN0Db, 1)),
    ebN0Sweep: EB_N0,
    berPc: EB_N0.map((e) => cdmaBer(p.processingGain, p.nUsers, e, 1)),
    berNf: EB_N0.map((e) => cdmaBer(p.processingGain, p.nUsers, e, nearFarRatio)),
  };
}
