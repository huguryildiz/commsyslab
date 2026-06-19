import { describe, it, expect } from 'vitest';
import { lloydMaxDesign, uniformDistortion } from '@/lib/dsp/lloydmax';

describe('lloydMaxDesign', () => {
  it('on a uniform source reduces to the uniform quantizer (D ≈ Δ²/12)', () => {
    // Uniform(-√3,√3), N=4: Δ = 2√3/4, Δ²/12 = 0.0625
    const r = lloydMaxDesign('uniform', 4);
    expect(r.distortion).toBeCloseTo(0.0625, 3);
  });
  it('reproduces the 2-level Gaussian optimum D = 1 − 2/π ≈ 0.3634', () => {
    const r = lloydMaxDesign('gaussian', 2);
    expect(r.distortion).toBeCloseTo(1 - 2 / Math.PI, 2);
    expect(r.levels[0]).toBeCloseTo(-Math.sqrt(2 / Math.PI), 2);
    expect(r.levels[1]).toBeCloseTo(Math.sqrt(2 / Math.PI), 2);
  });
  it('returns levels+1 boundaries and `levels` representation points', () => {
    const r = lloydMaxDesign('gaussian', 8);
    expect(r.boundaries).toHaveLength(9);
    expect(r.levels).toHaveLength(8);
  });
  it('never does worse than a comparable uniform quantizer', () => {
    const r = lloydMaxDesign('gaussian', 8);
    const uni = uniformDistortion('gaussian', 8, 4); // ±4σ loading
    expect(r.distortion).toBeLessThanOrEqual(uni + 1e-9);
  });
});

describe('uniformDistortion', () => {
  it('matches Δ²/12 for a uniform source loaded to its full range', () => {
    // range = √3 → spans the whole support; N=4 → Δ²/12 = 0.0625
    expect(uniformDistortion('uniform', 4, Math.sqrt(3))).toBeCloseTo(0.0625, 3);
  });
});
