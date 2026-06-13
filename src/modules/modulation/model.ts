import { makeConstellation, type Scheme, type Constellation } from '@/lib/dsp/modulation';
import { theoreticalSer, unionBoundSer } from '@/lib/dsp/ser';
import { gramSchmidt } from '@/lib/dsp/gram-schmidt';
import { expandPiecewise, signalLabels, DEFAULT_CUSTOM_AMPLITUDES } from './custom-signals';
import { n0FromEbN0Db, sigmaFromN0, gaussian, addAwgn } from '@/lib/dsp/awgn';
import { mapThreshold1D, detectML } from '@/lib/dsp/detector';
import {
  matchedFilterOutput,
  runningCorrelation,
  correlate,
  pulseEnergy,
  peakSnr,
} from '@/lib/dsp/matchedfilter';
import { linspace } from '@/lib/dsp/math';
import { quadratureBasis, fskBasis } from '@/lib/dsp/carrierbasis';

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

// ── Optimum receiver (Proakis §7.5–7.6), generalized to N dimensions ──────────────

export type OptRxKind = '1d' | '2d' | 'orthogonal' | 'custom';

export interface OptRxSignalSet {
  id: string;
  /** i18n key for the dropdown label. */
  labelKey: string;
  scheme: Scheme;
  M: number;
  kind: OptRxKind;
  /** Carrier cycles per symbol for 2d/orthogonal bases; ignored for 1d. */
  cycles?: number;
}

/** Data-driven signal-set list. Phase 3 "custom" entry appends here. */
export const OPT_RX_SIGNAL_SETS: OptRxSignalSet[] = [
  { id: 'binary', labelKey: 'modulation.optrx.set.binary', scheme: 'bpsk', M: 2, kind: '1d' },
  { id: 'pam4', labelKey: 'modulation.optrx.set.pam4', scheme: 'mask', M: 4, kind: '1d' },
  { id: 'pam8', labelKey: 'modulation.optrx.set.pam8', scheme: 'mask', M: 8, kind: '1d' },
  { id: 'qpsk', labelKey: 'modulation.optrx.set.qpsk', scheme: 'mpsk', M: 4, kind: '2d' },
  { id: 'psk8', labelKey: 'modulation.optrx.set.psk8', scheme: 'mpsk', M: 8, kind: '2d' },
  { id: 'qam16', labelKey: 'modulation.optrx.set.qam16', scheme: 'mqam', M: 16, kind: '2d' },
  { id: 'bfsk', labelKey: 'modulation.optrx.set.bfsk', scheme: 'bfsk', M: 2, kind: 'orthogonal' },
  { id: 'fsk4', labelKey: 'modulation.optrx.set.fsk4', scheme: 'mfsk', M: 4, kind: 'orthogonal' },
  // Phase 3: user-defined waveforms → Gram-Schmidt. scheme/M are placeholders (GS derives them).
  { id: 'custom', labelKey: 'modulation.optrx.set.custom', scheme: 'bpsk', M: 0, kind: 'custom' },
];

export interface OptRxParams {
  signalSetId: string;
  ebN0Db: number;
  /** Index (into the view's points) of the symbol to display. */
  symbolIndex: number;
  /** Samples per symbol for waveform resolution. */
  sps: number;
  /** Carrier cycles per symbol (2d/orthogonal); ignored for 1d. */
  cycles: number;
  /** Phase 3 only: M×L piecewise-constant amplitudes for the custom Gram-Schmidt path. */
  custom?: { amplitudes: number[][] };
}

export interface OptRxView {
  signalSet: OptRxSignalSet;
  kind: OptRxKind;
  M: number;
  dim: number; // number of basis functions N
  points: number[][]; // M signal-space points, each length dim (1d sorted ascending)
  labels: string[]; // labels aligned to points
  basis: number[][]; // dim basis waveforms, each length sps (unit energy, ~orthonormal)
  symbolWaveform: number[]; // Σ_k points[symbolIndex][k]·basis[k], length sps
  thresholds: number[]; // 1d only: M-1 midpoints; [] otherwise
  eb: number;
  n0: number;
  sigmaW: number; // per-sample time-domain noise std = √(N0/2)
  symbolEnergy: number; // energy of the displayed symbol waveform
  peakSnr: number; // 2E/N0 for the displayed symbol
  theoreticalPe: number;
  extent: number; // half-extent of the decision axis/plane (data units)
  /** Custom path only: per-signal linear-dependence flags (length M). */
  dependent?: boolean[];
}

/**
 * Synthesize the orthonormal basis waveforms for a signal set.
 * - 2d: quadrature carrier φ₁=cos, φ₂=sin (Proakis §7.3).
 * - orthogonal: M orthogonal FSK tones (Proakis §7.4).
 * - 1d: single unit-energy rectangular pulse.
 */
function buildBasis(set: OptRxSignalSet, sps: number, cycles: number): number[][] {
  if (set.kind === '2d') return quadratureBasis(sps, cycles);
  if (set.kind === 'orthogonal') return fskBasis(set.M, sps, cycles);
  return [new Array<number>(sps).fill(1 / Math.sqrt(sps))];
}

/** Assemble the optimum-receiver view for a signal set. Pure. */
export function buildOptRxView(p: OptRxParams): OptRxView {
  const set = OPT_RX_SIGNAL_SETS.find((s) => s.id === p.signalSetId) ?? OPT_RX_SIGNAL_SETS[0];
  if (set.kind === 'custom') return buildCustomOptRxView(set, p);
  const c = makeConstellation(set.scheme, set.M);
  const eb = c.EsAvg / c.bitsPerSymbol;
  const n0 = n0FromEbN0Db(p.ebN0Db, eb);
  const sigmaW = sigmaFromN0(n0);

  // 1d: order ascending by coordinate so the decision axis reads left→right; else keep order.
  const order =
    set.kind === '1d'
      ? c.points.map((_, i) => i).sort((a, b) => c.points[a][0] - c.points[b][0])
      : c.points.map((_, i) => i);
  const points = order.map((i) => c.points[i]);
  const labels = order.map((i) => c.labels[i]);

  const thresholds: number[] = [];
  if (set.kind === '1d') {
    for (let k = 0; k < points.length - 1; k++) {
      thresholds.push((points[k][0] + points[k + 1][0]) / 2);
    }
  }

  const basis = buildBasis(set, p.sps, set.cycles ?? p.cycles);
  const dim = basis.length;

  const idx = Math.min(Math.max(p.symbolIndex, 0), points.length - 1);
  const coords = points[idx];
  const symbolWaveform = new Array<number>(p.sps).fill(0);
  for (let k = 0; k < dim; k++) {
    const ck = coords[k] ?? 0;
    for (let n = 0; n < p.sps; n++) symbolWaveform[n] += ck * basis[k][n];
  }
  const symbolEnergy = pulseEnergy(symbolWaveform);

  const maxCoord = points.reduce(
    (m, q) => Math.max(m, ...q.map((v) => Math.abs(v))),
    Math.sqrt(eb),
  );
  const extent = maxCoord + 3.5 * sigmaW;

  return {
    signalSet: set,
    kind: set.kind,
    M: c.M,
    dim,
    points,
    labels,
    basis,
    symbolWaveform,
    thresholds,
    eb,
    n0,
    sigmaW,
    symbolEnergy,
    peakSnr: peakSnr(symbolEnergy, n0),
    theoreticalPe: theoreticalSer(set.scheme, set.M, p.ebN0Db),
    extent,
  };
}

/** Build the optimum-receiver view for a user-defined signal set via Gram-Schmidt (§7.1). Pure. */
function buildCustomOptRxView(set: OptRxSignalSet, p: OptRxParams): OptRxView {
  const amplitudes = p.custom?.amplitudes ?? DEFAULT_CUSTOM_AMPLITUDES;
  const signals = expandPiecewise(amplitudes, p.sps);
  const gs = gramSchmidt(signals);
  const M = signals.length;
  const dim = gs.dim;

  // Order ascending for the 1-D axis; otherwise keep signal order. Keep labels/dependent aligned.
  let points = gs.coeffs;
  let labels = signalLabels(M);
  let dependent = gs.dependent;
  const thresholds: number[] = [];
  if (dim === 1) {
    const order = points.map((_, i) => i).sort((a, b) => points[a][0] - points[b][0]);
    points = order.map((i) => gs.coeffs[i]);
    labels = order.map((i) => signalLabels(M)[i]);
    dependent = order.map((i) => gs.dependent[i]);
    for (let k = 0; k < points.length - 1; k++) {
      thresholds.push((points[k][0] + points[k + 1][0]) / 2);
    }
  }

  const EsAvg = gs.energies.reduce((s, e) => s + e, 0) / Math.max(M, 1);
  const bitsPerSymbol = Math.log2(Math.max(M, 2));
  const eb = EsAvg / bitsPerSymbol;
  const n0 = n0FromEbN0Db(p.ebN0Db, eb);
  const sigmaW = sigmaFromN0(n0);

  const idx = Math.min(Math.max(p.symbolIndex, 0), Math.max(points.length - 1, 0));
  const coords = points[idx] ?? [];
  const symbolWaveform = new Array<number>(p.sps).fill(0);
  for (let k = 0; k < dim; k++) {
    const ck = coords[k] ?? 0;
    for (let n = 0; n < p.sps; n++) symbolWaveform[n] += ck * gs.basis[k][n];
  }
  const symbolEnergy = pulseEnergy(symbolWaveform);

  const maxCoord = points.reduce(
    (m, q) => Math.max(m, ...q.map((v) => Math.abs(v))),
    Math.sqrt(Math.max(eb, 1e-6)),
  );
  const extent = maxCoord + 3.5 * sigmaW;

  return {
    signalSet: set,
    kind: 'custom',
    M,
    dim,
    points,
    labels,
    basis: gs.basis,
    symbolWaveform,
    thresholds,
    eb,
    n0,
    sigmaW,
    symbolEnergy,
    peakSnr: peakSnr(symbolEnergy, n0),
    theoreticalPe: unionBoundSer(points, n0),
    extent,
    dependent,
  };
}

export interface OptRxReception {
  txIndex: number;
  received: number[]; // r[n] = s[n] + w[n]
  branchCorr: number[][]; // per-basis cumulative correlator integral
  branchMf: number[][] | null; // per-basis matched-filter output (1d only, for equivalence)
  statistic: number[]; // decision statistic vector r = (∫ r·φ_k)
  decided: number; // detectML(statistic, points)
}

/** One noisy reception of symbol `txIndex` through the correlator bank. Pure given rng. */
export function simulateReception(
  view: OptRxView,
  txIndex: number,
  rng: () => number,
): OptRxReception {
  const tx = Math.min(Math.max(txIndex, 0), view.M - 1);
  const coords = view.points[tx];
  const sps = view.basis[0].length;
  const s = new Array<number>(sps).fill(0);
  for (let k = 0; k < view.dim; k++) {
    const ck = coords[k] ?? 0;
    for (let n = 0; n < sps; n++) s[n] += ck * view.basis[k][n];
  }
  const received = s.map((v) => v + view.sigmaW * gaussian(rng));
  const branchCorr = view.basis.map((phi) => runningCorrelation(received, phi));
  const statistic = view.basis.map((phi) => correlate(received, phi));
  const branchMf =
    view.kind === '1d' ? view.basis.map((phi) => matchedFilterOutput(received, phi)) : null;
  const decided = detectML(statistic, view.points);
  return { txIndex: tx, received, branchCorr, branchMf, statistic, decided };
}

/**
 * Monte-Carlo symbol-error count. Uses the statistically identical signal-space shortcut:
 * draw a transmitted point, add i.i.d. N(0, N0/2)=sigmaW² per dimension, detect by min-distance.
 * (The correlator output ∫r·φ_k has exactly this distribution because the basis is orthonormal.)
 */
export function monteCarloPe(
  view: OptRxView,
  n: number,
  rng: () => number,
): { errors: number; total: number } {
  let errors = 0;
  for (let i = 0; i < n; i++) {
    const tx = Math.min(view.M - 1, Math.floor(rng() * view.M));
    const r = addAwgn(view.points[tx], view.sigmaW, rng);
    if (detectML(r, view.points) !== tx) errors++;
  }
  return { errors, total: n };
}
