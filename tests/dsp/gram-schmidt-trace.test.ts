import { describe, it, expect } from 'vitest';
import { gramSchmidt, gramSchmidtTrace } from '@/lib/dsp/gram-schmidt';

const PROAKIS_711 = [
  [1, 1, 0],
  [1, -1, 0],
  [-1, 1, 1],
  [1, 1, 1],
];

describe('gramSchmidtTrace', () => {
  it('agrees with gramSchmidt on final basis, coeffs, and dim (Proakis Ex. 7.1.1)', () => {
    const ref = gramSchmidt(PROAKIS_711);
    const tr = gramSchmidtTrace(PROAKIS_711);
    expect(tr.dim).toBe(ref.dim);
    expect(tr.basis.length).toBe(ref.basis.length);
    tr.basis.forEach((phi, k) =>
      phi.forEach((v, i) => expect(v).toBeCloseTo(ref.basis[k][i], 10)),
    );
    tr.coeffs.forEach((row, m) =>
      row.forEach((v, n) => expect(v).toBeCloseTo(ref.coeffs[m][n], 10)),
    );
  });

  it('records one step per signal with the 4th signal dependent (N=3)', () => {
    const tr = gramSchmidtTrace(PROAKIS_711);
    expect(tr.steps).toHaveLength(4);
    expect(tr.steps.map((s) => s.dependent)).toEqual([false, false, false, true]);
    expect(tr.dim).toBe(3);
    // dependent step adds no basis vector
    expect(tr.steps[3].basis).toBeNull();
    expect(tr.steps[3].residualNorm).toBeCloseTo(0, 9);
  });

  it('projection count grows with the running basis and residual is orthogonal to prior basis', () => {
    const tr = gramSchmidtTrace(PROAKIS_711);
    expect(tr.steps[0].projections).toHaveLength(0); // first signal: no prior basis
    expect(tr.steps[1].projections).toHaveLength(1);
    expect(tr.steps[2].projections).toHaveLength(2);
    // residual of step 2 ⟂ each prior basis vector
    const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
    for (const phi of tr.basis.slice(0, 2)) {
      expect(dot(tr.steps[2].residual, phi)).toBeCloseTo(0, 9);
    }
  });

  it('orthogonal pair → dim 2, both independent', () => {
    const tr = gramSchmidtTrace([
      [1, 1],
      [1, -1],
    ]);
    expect(tr.dim).toBe(2);
    expect(tr.steps.map((s) => s.dependent)).toEqual([false, false]);
  });

  it('scaled duplicate → dim 1, second dependent', () => {
    const tr = gramSchmidtTrace([
      [1, 0],
      [3, 0],
    ]);
    expect(tr.dim).toBe(1);
    expect(tr.steps[1].dependent).toBe(true);
  });

  it('throws on ragged input', () => {
    expect(() => gramSchmidtTrace([[1, 0], [1]])).toThrow();
  });

  it('empty input → empty trace, dim 0', () => {
    const tr = gramSchmidtTrace([]);
    expect(tr.steps).toEqual([]);
    expect(tr.basis).toEqual([]);
    expect(tr.dim).toBe(0);
  });
});
