import { toGray, toNBC } from './pcm';

export type Scheme = 'bpsk' | 'bask' | 'bfsk' | 'mpsk' | 'mask' | 'mqam' | 'mfsk';

export interface Constellation {
  scheme: Scheme;
  M: number;
  dim: number;
  points: number[][];
  labels: string[];
  bitsPerSymbol: number;
  dMin: number;
  EsAvg: number;
}

function grayLabels(M: number): string[] {
  const bits = Math.round(Math.log2(M));
  const out: string[] = [];
  for (let i = 0; i < M; i++) out.push(toNBC(toGray(i), bits).join(''));
  return out;
}

function minDistance(points: number[][]): number {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      let s = 0;
      for (let d = 0; d < points[i].length; d++) {
        const diff = points[i][d] - points[j][d];
        s += diff * diff;
      }
      best = Math.min(best, Math.sqrt(s));
    }
  }
  return best;
}

function avgEnergy(points: number[][]): number {
  let s = 0;
  for (const p of points) for (const c of p) s += c * c;
  return s / points.length;
}

export function makeConstellation(scheme: Scheme, M: number, eb = 1): Constellation {
  const bitsPerSymbol = Math.round(Math.log2(M));
  let dim: number;
  let points: number[][];

  switch (scheme) {
    case 'bpsk': {
      dim = 1;
      points = [[Math.sqrt(eb)], [-Math.sqrt(eb)]];
      break;
    }
    case 'bask': {
      dim = 1;
      points = [[0], [Math.sqrt(2 * eb)]];
      break;
    }
    case 'bfsk': {
      dim = 2;
      points = [
        [Math.sqrt(eb), 0],
        [0, Math.sqrt(eb)],
      ];
      break;
    }
    case 'mpsk': {
      dim = 2;
      const Es = eb * bitsPerSymbol;
      const r = Math.sqrt(Es);
      points = [];
      for (let i = 0; i < M; i++) {
        const theta = (2 * Math.PI * i) / M;
        points.push([r * Math.cos(theta), -r * Math.sin(theta)]);
      }
      break;
    }
    case 'mask': {
      dim = 1;
      const A = Math.sqrt((3 * eb * bitsPerSymbol) / (M * M - 1));
      points = [];
      for (let i = 0; i < M; i++) points.push([(2 * i + 1 - M) * A]);
      break;
    }
    case 'mqam': {
      dim = 2;
      const L = Math.round(Math.sqrt(M));
      const E0 = (3 * eb * bitsPerSymbol) / (2 * (M - 1));
      const s = Math.sqrt(E0);
      points = [];
      for (let row = 0; row < L; row++) {
        for (let col = 0; col < L; col++) {
          const a = 2 * col - (L - 1);
          const b = 2 * row - (L - 1);
          points.push([s * a, s * b]);
        }
      }
      break;
    }
    case 'mfsk': {
      dim = M;
      const Es = eb * bitsPerSymbol;
      const r = Math.sqrt(Es);
      points = [];
      for (let i = 0; i < M; i++) {
        const p = new Array<number>(M).fill(0);
        p[i] = r;
        points.push(p);
      }
      break;
    }
    default: {
      throw new Error(`unknown scheme: ${scheme as string}`);
    }
  }

  return {
    scheme,
    M,
    dim,
    points,
    labels: grayLabels(M),
    bitsPerSymbol,
    dMin: minDistance(points),
    EsAvg: avgEnergy(points),
  };
}
