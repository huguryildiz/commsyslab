import { describe, it, expect } from 'vitest';
import {
  buildConvCurve,
  buildConvOverlap,
  CONV_T_MIN,
  CONV_T_MAX,
} from '@/modules/fourier/model';

describe('convolution lab model (Proakis §2.1.5)', () => {
  it('rect ∗ rect peaks at t=0 with full-overlap area 1 (triangular result)', () => {
    const curve = buildConvCurve('rect', 'rect');
    const i0 = curve.t.findIndex((tt) => Math.abs(tt) < 1e-9);
    // ≈1 (small discretization overshoot from the inclusive rect endpoints).
    expect(curve.y[i0]).toBeCloseTo(1, 1); // full overlap of two unit-area, unit-width pulses

    // Result is triangular: about half the peak at t = ±0.5.
    const iHalf = curve.t.findIndex((tt) => Math.abs(tt - 0.5) < 1e-9);
    expect(curve.y[iHalf]).toBeCloseTo(0.5, 1);
  });

  it('overlap area equals the y(t) curve point at the same slide position', () => {
    const curve = buildConvCurve('tri', 'exp');
    const slideT = 0.5; // lands exactly on a grid sample
    const idx = curve.t.findIndex((tt) => Math.abs(tt - slideT) < 1e-9);
    const overlap = buildConvOverlap(curve, slideT);
    // Both use the same direct discrete summation → identical by construction.
    expect(overlap.yAtSlide).toBeCloseTo(curve.y[idx], 10);
  });

  it('convolution is ~0 outside the combined support', () => {
    const curve = buildConvCurve('rect', 'rect');
    expect(Math.abs(curve.y[0])).toBeLessThan(1e-6); // t = CONV_T_MIN
    expect(Math.abs(curve.y[curve.y.length - 1])).toBeLessThan(1e-6); // t = CONV_T_MAX
  });

  it('convolving with a unit impulse keeps the input shape (peak in, zero out)', () => {
    // x ∗ δ is a scaled copy of x: nonzero inside the rect, ~0 well outside.
    const curve = buildConvCurve('rect', 'impulse');
    const i0 = curve.t.findIndex((tt) => Math.abs(tt) < 1e-9);
    const iOut = curve.t.findIndex((tt) => Math.abs(tt - 2) < 1e-9);
    expect(curve.y[i0]).toBeGreaterThan(0.05); // inside the rect
    expect(Math.abs(curve.y[iOut])).toBeLessThan(1e-6); // outside the rect
  });

  it('grid spans the declared window', () => {
    const curve = buildConvCurve('rect', 'exp');
    expect(curve.t[0]).toBeCloseTo(CONV_T_MIN, 10);
    expect(curve.t[curve.t.length - 1]).toBeCloseTo(CONV_T_MAX, 10);
  });
});
