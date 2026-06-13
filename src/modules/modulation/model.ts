import { makeConstellation, type Scheme, type Constellation } from '@/lib/dsp/modulation';
import { theoreticalSer } from '@/lib/dsp/ser';
import { n0FromEbN0Db, sigmaFromN0, gaussian } from '@/lib/dsp/awgn';
import { mapThreshold1D, detectML } from '@/lib/dsp/detector';
import {
  matchedFilter,
  matchedFilterOutput,
  runningCorrelation,
  correlate,
  pulseEnergy,
  peakSnr,
} from '@/lib/dsp/matchedfilter';
import { linspace } from '@/lib/dsp/math';

export type Decision = 'ml' | 'map';

export interface ModulationParams {
  scheme: Scheme;
  M: number;
  ebN0Db: number;
  decision: Decision;
  /** Prior of symbol 0 in [0,1]; remaining mass split equally over the others. MAP only. */
  prior0: number;
}

export interface Pt2 {
  x: number;
  y: number;
}

export interface Threshold1D {
  ml: number; // ML boundary (midpoint of adjacent points)
  map: number; // MAP boundary (prior-shifted)
}

export interface Axis1D {
  positions: number[]; // point x-positions, ascending
  order: number[]; // constellation indices in ascending-position order
  thresholds: Threshold1D[]; // length positions.length - 1
}

export interface ModulationView {
  constellation: Constellation;
  drawable: boolean; // dim <= 2
  dim: number;
  points2d: Pt2[]; // projected points (dim===1 -> y=0); empty when !drawable
  labels: string[];
  dMin: number;
  dMinPair: [number, number];
  EsAvg: number;
  bitsPerSymbol: number;
  eb: number;
  n0: number;
  sigma: number;
  priors: number[];
  axis1d?: Axis1D; // present only for dim === 1
  theoreticalSerNow: number;
  serCurve: { ebN0Db: number[]; pe: number[] };
  extent: number; // symmetric half-extent of the 2-D plane (data units)
}

function projectPoints(c: Constellation): Pt2[] {
  if (c.dim === 1) return c.points.map((p) => ({ x: p[0], y: 0 }));
  if (c.dim === 2) return c.points.map((p) => ({ x: p[0], y: p[1] }));
  return [];
}

function buildPriors(M: number, prior0: number): number[] {
  if (M === 1) return [1];
  const rest = (1 - prior0) / (M - 1);
  const out = new Array<number>(M).fill(rest);
  out[0] = prior0;
  return out;
}

function buildAxis1d(c: Constellation, priors: number[], n0: number): Axis1D {
  const xs = c.points.map((p) => p[0]);
  const order = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
  const positions = order.map((i) => xs[i]);
  const thresholds: Threshold1D[] = [];
  for (let k = 0; k < order.length - 1; k++) {
    const a = order[k];
    const b = order[k + 1];
    const s0 = xs[a];
    const s1 = xs[b];
    thresholds.push({
      ml: (s0 + s1) / 2,
      map: mapThreshold1D(s0, s1, priors[a], priors[b], n0),
    });
  }
  return { positions, order, thresholds };
}

function closestPair(points: number[][]): [number, number] {
  let bi = 0;
  let bj = 1;
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      let s = 0;
      for (let d = 0; d < points[i].length; d++) {
        const df = points[i][d] - points[j][d];
        s += df * df;
      }
      if (s < best) {
        best = s;
        bi = i;
        bj = j;
      }
    }
  }
  return [bi, bj];
}

/** Assemble all panel data + scalar metrics for the modulation view. Pure. */
export function buildModulationView(p: ModulationParams): ModulationView {
  const c = makeConstellation(p.scheme, p.M);
  const eb = c.EsAvg / c.bitsPerSymbol;
  const n0 = n0FromEbN0Db(p.ebN0Db, eb);
  const sigma = sigmaFromN0(n0);
  const priors = buildPriors(c.M, p.prior0);
  const points2d = projectPoints(c);

  const maxCoord = points2d.reduce(
    (m, q) => Math.max(m, Math.abs(q.x), Math.abs(q.y)),
    Math.sqrt(eb),
  );
  const extent = maxCoord + 3.5 * sigma;

  const dbAxis = linspace(0, 14, 29);
  const serCurve = {
    ebN0Db: dbAxis,
    pe: dbAxis.map((db) => theoreticalSer(p.scheme, p.M, db)),
  };

  return {
    constellation: c,
    drawable: c.dim <= 2,
    dim: c.dim,
    points2d,
    labels: c.labels,
    dMin: c.dMin,
    dMinPair: closestPair(c.points),
    EsAvg: c.EsAvg,
    bitsPerSymbol: c.bitsPerSymbol,
    eb,
    n0,
    sigma,
    priors,
    axis1d: c.dim === 1 ? buildAxis1d(c, priors, n0) : undefined,
    theoreticalSerNow: theoreticalSer(p.scheme, p.M, p.ebN0Db),
    serCurve,
    extent,
  };
}

// ── Optimum receiver (Phase 1: 1-D binary / PAM), Proakis §7.5–7.6 ──────────────

export interface OptRxSignalSet {
  id: string;
  /** i18n key for the dropdown label. */
  labelKey: string;
  /** Underlying 1-D scheme: 'bpsk' for binary antipodal, 'mask' for M-PAM. */
  scheme: Scheme;
  M: number;
}

/** Data-driven signal-set list. Phase 2/3 entries (2-D, custom) append here. */
export const OPT_RX_SIGNAL_SETS: OptRxSignalSet[] = [
  { id: 'binary', labelKey: 'modulation.optrx.set.binary', scheme: 'bpsk', M: 2 },
  { id: 'pam4', labelKey: 'modulation.optrx.set.pam4', scheme: 'mask', M: 4 },
  { id: 'pam8', labelKey: 'modulation.optrx.set.pam8', scheme: 'mask', M: 8 },
];

export interface OptRxParams {
  signalSetId: string;
  ebN0Db: number;
  /** Index (into ascending amplitudes) of the symbol to display. */
  symbolIndex: number;
  /** Samples per symbol for waveform resolution. */
  sps: number;
}

export interface OptRxView {
  signalSet: OptRxSignalSet;
  M: number;
  amplitudes: number[]; // 1-D coordinates, ascending
  labels: string[]; // Gray labels aligned to ascending amplitudes
  thresholds: number[]; // M-1 midpoints between adjacent amplitudes
  basis: number[]; // unit-energy φ[n], length sps
  matchedIR: number[]; // h[n] = φ reversed (display)
  symbolWaveform: number[]; // amplitudes[symbolIndex] · φ[n]
  eb: number;
  n0: number;
  sigmaW: number; // per-sample time-domain noise std = √(N0/2)
  symbolEnergy: number; // energy of the displayed symbol waveform
  peakSnr: number; // 2E/N0 for the displayed symbol
  theoreticalPe: number;
  extent: number; // half-extent of the decision axis (data units)
}

/** Assemble the optimum-receiver view for a 1-D signal set. Pure. */
export function buildOptRxView(p: OptRxParams): OptRxView {
  const set = OPT_RX_SIGNAL_SETS.find((s) => s.id === p.signalSetId) ?? OPT_RX_SIGNAL_SETS[0];
  const c = makeConstellation(set.scheme, set.M);
  const eb = c.EsAvg / c.bitsPerSymbol;
  const n0 = n0FromEbN0Db(p.ebN0Db, eb);
  const sigmaW = sigmaFromN0(n0);

  // Sort symbols by 1-D coordinate ascending; carry Gray labels along.
  const order = c.points.map((_, i) => i).sort((a, b) => c.points[a][0] - c.points[b][0]);
  const amplitudes = order.map((i) => c.points[i][0]);
  const labels = order.map((i) => c.labels[i]);
  const thresholds: number[] = [];
  for (let k = 0; k < amplitudes.length - 1; k++) {
    thresholds.push((amplitudes[k] + amplitudes[k + 1]) / 2);
  }

  // Unit-energy rectangular basis φ[n] = 1/√sps  (Σ φ² = 1), so the correlator
  // output ∫r·φ has noise variance σ_w²·Σφ² = N0/2, matching the signal-space model.
  const basis = new Array<number>(p.sps).fill(1 / Math.sqrt(p.sps));
  const matchedIR = matchedFilter(basis);

  const idx = Math.min(Math.max(p.symbolIndex, 0), amplitudes.length - 1);
  const symbolWaveform = basis.map((b) => amplitudes[idx] * b);
  const symbolEnergy = pulseEnergy(symbolWaveform);

  const maxAmp = Math.max(...amplitudes.map((a) => Math.abs(a)), Math.sqrt(eb));
  const extent = maxAmp + 3.5 * sigmaW;

  return {
    signalSet: set,
    M: c.M,
    amplitudes,
    labels,
    thresholds,
    basis,
    matchedIR,
    symbolWaveform,
    eb,
    n0,
    sigmaW,
    symbolEnergy,
    peakSnr: peakSnr(symbolEnergy, n0),
    theoreticalPe: theoreticalSer(set.scheme, set.M, p.ebN0Db),
    extent,
  };
}

export interface OptRxReception {
  txIndex: number;
  received: number[]; // r[n] = s[n] + w[n]
  mfOutput: number[]; // matched-filter output (full convolution)
  runningCorr: number[]; // cumulative correlator integral over [0, T]
  statistic: number; // decision statistic = ∫ r·φ
  decided: number; // detected symbol index (into ascending amplitudes)
}

/** One noisy reception of symbol `txIndex` through correlator + matched filter. Pure given rng. */
export function simulateReception(
  view: OptRxView,
  txIndex: number,
  rng: () => number,
): OptRxReception {
  const tx = Math.min(Math.max(txIndex, 0), view.M - 1);
  const s = view.basis.map((b) => view.amplitudes[tx] * b);
  const received = s.map((v) => v + view.sigmaW * gaussian(rng));
  const mfOutput = matchedFilterOutput(received, view.basis);
  const runningCorr = runningCorrelation(received, view.basis);
  const statistic = correlate(received, view.basis);
  const decided = detectML(
    [statistic],
    view.amplitudes.map((a) => [a]),
  );
  return { txIndex: tx, received, mfOutput, runningCorr, statistic, decided };
}

/**
 * Monte-Carlo symbol-error count for the optimum receiver. Uses the statistically
 * identical shortcut T = a_tx + N(0, N0/2) (correlator output, since Σφ² = 1) so the
 * loop is cheap; the displayed reception uses the full waveform path above.
 */
export function monteCarloPe(
  view: OptRxView,
  n: number,
  rng: () => number,
): { errors: number; total: number } {
  const points = view.amplitudes.map((a) => [a]);
  let errors = 0;
  for (let i = 0; i < n; i++) {
    const tx = Math.min(view.M - 1, Math.floor(rng() * view.M));
    const stat = view.amplitudes[tx] + view.sigmaW * gaussian(rng);
    if (detectML([stat], points) !== tx) errors++;
  }
  return { errors, total: n };
}
