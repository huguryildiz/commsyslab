import { rayleighBerAntipodal, awgnBerAntipodal, mrcBerAntipodal } from '@/lib/dsp/diversity';
import { alamoutiBerAntipodal, mimoCapacity, mimoSpatialMuxBer } from '@/lib/dsp/mimo';
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

/* ── Space-Time / Alamouti (§14.4.5) ───────────────────────────────────────── */

export interface AlamoutiParams {
  ebN0Min: number;
  ebN0Max: number;
  points: number;
}

export const DEFAULT_ALAMOUTI_PARAMS: AlamoutiParams = {
  ebN0Min: 0,
  ebN0Max: 25,
  points: 101,
};

export interface AlamoutiDerived {
  ebN0: number[];
  awgn: number[]; // AWGN BPSK (no fading reference)
  siso: number[]; // Rayleigh, diversity order 1
  alamouti: number[]; // Alamouti 2×1, diversity order 2 (−3 dB array gain vs MRC)
  mrc1x2: number[]; // 1×2 MRC, diversity order 2
}

/** BER comparison showing Alamouti 2×1 reaches MRC-1×2 diversity at a 3 dB penalty. */
export function deriveAlamouti(p: AlamoutiParams): AlamoutiDerived {
  const ebN0 = linspace(p.ebN0Min, p.ebN0Max, p.points);
  return {
    ebN0,
    awgn: ebN0.map((e) => awgnBerAntipodal(e)),
    siso: ebN0.map((e) => rayleighBerAntipodal(e)),
    alamouti: ebN0.map((e) => alamoutiBerAntipodal(e, 1)),
    mrc1x2: ebN0.map((e) => mrcBerAntipodal(e, 2)),
  };
}

/* ── Spatial-multiplexing error rate (§14.4.4) ─────────────────────────────── */

export interface MimoErrParams {
  nt: number;
  nr: number;
  snrMin: number;
  snrMax: number;
  points: number;
  trials: number;
  seed: number;
}

export const DEFAULT_MIMO_ERR_PARAMS: MimoErrParams = {
  nt: 2,
  nr: 2,
  snrMin: 0,
  snrMax: 20,
  points: 11,
  trials: 200,
  seed: 3,
};

export interface MimoErrDerived {
  snr: number[];
  zf: number[];
  mmse: number[];
  nt: number;
  nr: number;
}

/** ZF vs MMSE BER for uncoded BPSK spatial multiplexing. N_r is clamped ≥ N_t. */
export function deriveMimoErrorRate(p: MimoErrParams): MimoErrDerived {
  const nr = Math.max(p.nr, p.nt); // spatial multiplexing needs N_r ≥ N_t
  const snr = linspace(p.snrMin, p.snrMax, p.points);
  return {
    snr,
    zf: snr.map((s) => mimoSpatialMuxBer(s, p.nt, nr, 'zf', p.trials, p.seed)),
    mmse: snr.map((s) => mimoSpatialMuxBer(s, p.nt, nr, 'mmse', p.trials, p.seed)),
    nt: p.nt,
    nr,
  };
}
