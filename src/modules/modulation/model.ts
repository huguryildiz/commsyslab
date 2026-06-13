import { makeConstellation, type Scheme, type Constellation } from '@/lib/dsp/modulation';
import { theoreticalSer } from '@/lib/dsp/ser';
import { n0FromEbN0Db, sigmaFromN0 } from '@/lib/dsp/awgn';
import { mapThreshold1D } from '@/lib/dsp/detector';
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
