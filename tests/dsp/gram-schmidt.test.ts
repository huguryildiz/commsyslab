import { describe, it, expect } from 'vitest';
import { gramSchmidt } from '@/lib/dsp/gram-schmidt';

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

describe('gramSchmidt', () => {
  it('two orthogonal unit signals → dim 2, identity-like basis, none dependent', () => {
    const r = gramSchmidt([
      [1, 0],
      [0, 1],
    ]);
    expect(r.dim).toBe(2);
    expect(r.dependent).toEqual([false, false]);
    expect(dot(r.basis[0], r.basis[0])).toBeCloseTo(1, 12);
    expect(dot(r.basis[1], r.basis[1])).toBeCloseTo(1, 12);
    expect(dot(r.basis[0], r.basis[1])).toBeCloseTo(0, 12);
  });

  it('a scaled duplicate is linearly dependent → dim 1', () => {
    const r = gramSchmidt([
      [1, 1],
      [2, 2],
    ]);
    expect(r.dim).toBe(1);
    expect(r.dependent).toEqual([false, true]);
    // second signal lies entirely on φ₁: its only coefficient² equals its energy
    expect(r.coeffs[1][0] ** 2).toBeCloseTo(r.energies[1], 10);
  });

  it('a zero signal adds no dimension and is marked dependent', () => {
    const r = gramSchmidt([
      [1, 0],
      [0, 0],
    ]);
    expect(r.dim).toBe(1);
    expect(r.dependent).toEqual([false, true]);
    expect(r.energies[1]).toBeCloseTo(0, 12);
  });

  it('reproduces Proakis Example 7.1.1 exactly (N=3, s₄ dependent)', () => {
    // Figure 7.1(a) waveforms as 3 unit-width segment amplitudes.
    const r = gramSchmidt([
      [1, 1, 0], // s₁
      [1, -1, 0], // s₂
      [-1, 1, 1], // s₃
      [1, 1, 1], // s₄ = s₁+s₂+s₃ (dependent)
    ]);
    expect(r.dim).toBe(3);
    expect(r.dependent).toEqual([false, false, false, true]);
    const SQRT2 = Math.sqrt(2);
    // Book coefficients: s₁=(√2,0,0), s₂=(0,√2,0), s₃=(0,−√2,1), s₄=(√2,0,1)
    expect(r.coeffs[0][0]).toBeCloseTo(SQRT2, 10);
    expect(r.coeffs[0][1]).toBeCloseTo(0, 10);
    expect(r.coeffs[0][2]).toBeCloseTo(0, 10);
    expect(r.coeffs[1][0]).toBeCloseTo(0, 10);
    expect(r.coeffs[1][1]).toBeCloseTo(SQRT2, 10);
    expect(r.coeffs[1][2]).toBeCloseTo(0, 10);
    expect(r.coeffs[2][0]).toBeCloseTo(0, 10);
    expect(r.coeffs[2][1]).toBeCloseTo(-SQRT2, 10);
    expect(r.coeffs[2][2]).toBeCloseTo(1, 10);
    expect(r.coeffs[3][0]).toBeCloseTo(SQRT2, 10);
    expect(r.coeffs[3][1]).toBeCloseTo(0, 10);
    expect(r.coeffs[3][2]).toBeCloseTo(1, 10);
  });

  it('preserves energy (Eq. 7.1.11) and reconstructs each signal (Eq. 7.1.10)', () => {
    const signals = [
      [1, 1, 0],
      [1, -1, 0],
      [-1, 1, 1],
      [1, 1, 1],
    ];
    const r = gramSchmidt(signals);
    for (let m = 0; m < signals.length; m++) {
      // energy = Σ coeffs²
      const ec = r.coeffs[m].reduce((s, c) => s + c * c, 0);
      expect(ec).toBeCloseTo(r.energies[m], 10);
      // reconstruction sₘ ≈ Σ coeffs[m][n]·φₙ
      const recon = new Array(signals[m].length).fill(0) as number[];
      for (let n = 0; n < r.dim; n++) {
        for (let i = 0; i < recon.length; i++) recon[i] += r.coeffs[m][n] * r.basis[n][i];
      }
      for (let i = 0; i < recon.length; i++) expect(recon[i]).toBeCloseTo(signals[m][i], 10);
    }
  });

  it('throws on ragged (unequal-length) input', () => {
    expect(() => gramSchmidt([[1, 0, 0], [1, 0]])).toThrow(/equal length/);
  });

  it('empty signal set → dim 0 with empty outputs', () => {
    const r = gramSchmidt([]);
    expect(r.dim).toBe(0);
    expect(r.basis).toEqual([]);
    expect(r.coeffs).toEqual([]);
    expect(r.energies).toEqual([]);
    expect(r.dependent).toEqual([]);
  });
});
