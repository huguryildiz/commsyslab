import { describe, it, expect } from 'vitest';
import {
  buildFamily,
  orthogonalPe,
  simplexPe,
  simplexGainDb,
  dMinOf,
  energyAvgOf,
} from '@/lib/dsp/multidim';
import { theoreticalSer } from '@/lib/dsp/ser';

describe('multidim family builders', () => {
  it('orthogonal: M points in M-D, equal energy, d_min = sqrt(2·Es)', () => {
    const f = buildFamily('orthogonal', 4, 1);
    expect(f.points).toHaveLength(4);
    expect(f.dim).toBe(4);
    expect(energyAvgOf(f.points)).toBeCloseTo(1, 9);
    expect(dMinOf(f.points)).toBeCloseTo(Math.SQRT2, 9);
  });
  it('biorthogonal: M points in (M/2)-D', () => {
    const f = buildFamily('biorthogonal', 8, 1);
    expect(f.points).toHaveLength(8);
    expect(f.dim).toBe(4);
    expect(dMinOf(f.points)).toBeCloseTo(Math.SQRT2, 9);
  });
  it('simplex: energy reduced by (M-1)/M, correlation -1/(M-1)', () => {
    const f = buildFamily('simplex', 4, 1);
    expect(f.points).toHaveLength(4);
    expect(energyAvgOf(f.points)).toBeCloseTo((4 - 1) / 4, 9);
    // correlation between any two simplex vectors / energy = -1/(M-1)
    const e = energyAvgOf(f.points);
    let dot = 0;
    for (let k = 0; k < f.points[0].length; k++) dot += f.points[0][k] * f.points[1][k];
    expect(dot / e).toBeCloseTo(-1 / (4 - 1), 9);
  });
});

describe('multidim error probability', () => {
  it('orthogonal M=2 equals coherent BFSK Q(sqrt(Eb/N0))', () => {
    for (const db of [2, 6, 10]) {
      expect(orthogonalPe(2, db)).toBeCloseTo(theoreticalSer('bfsk', 2, db), 4);
    }
  });
  it('orthogonal Pe decreases with M at fixed Eb/N0 (orthogonal gains with M)', () => {
    expect(orthogonalPe(8, 8)).toBeLessThan(orthogonalPe(2, 8));
  });
  it('simplex gain = 10 log10(M/(M-1)); 3 dB at M=2', () => {
    expect(simplexGainDb(2)).toBeCloseTo(10 * Math.log10(2), 9);
    expect(simplexGainDb(4)).toBeCloseTo(10 * Math.log10(4 / 3), 9);
  });
  it('simplex Pe equals orthogonal Pe shifted left by the simplex gain', () => {
    const M = 4;
    for (const db of [3, 6, 9]) {
      expect(simplexPe(M, db)).toBeCloseTo(orthogonalPe(M, db + simplexGainDb(M)), 9);
    }
  });
});
