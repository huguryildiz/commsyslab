import { describe, it, expect } from 'vitest';
import { pamPsd, symbolPsd, rectNrzMag } from '@/lib/dsp/psd';

// Ref: Proakis & Salehi §10.2.
describe('power spectrum of digitally modulated signals (§10.2)', () => {
  it('zero-mean ⇒ no discrete lines; non-zero mean ⇒ a line at f=0 (Eq. 10.2.9/10.2.10)', () => {
    const g = rectNrzMag(1, 1);
    const f = [-2, -1, 0, 1, 2];
    expect(pamPsd(g, 1, 0, 1, f).lines.length).toBe(0);
    expect(pamPsd(g, 1, 1, 1, f).lines.some((l) => Math.abs(l.f) < 1e-9)).toBe(true);
  });

  it('rectangular NRZ |G_T| has nulls at multiples of 1/T (Example 10.2.1)', () => {
    const g = rectNrzMag(1, 1);
    expect(Math.abs(g(1))).toBeLessThan(1e-9);
    expect(Math.abs(g(2))).toBeLessThan(1e-9);
    expect(g(0)).toBeCloseTo(1, 6);
  });

  it('correlated preset reproduces S_a(f) = 4cos²(πfT) (Example 10.2.2)', () => {
    const Ra = [2, 1]; // R_a[0]=2, R_a[±1]=1  ⇒  a_n = b_n + b_{n-1}
    const f = [0, 0.25, 0.5];
    const got = symbolPsd(Ra, 1, f);
    f.forEach((fi, i) => expect(got[i]).toBeCloseTo(4 * Math.cos(Math.PI * fi) ** 2, 6));
  });

  it('continuous spectrum scales with σ_a² and |G_T(f)|²', () => {
    const g = rectNrzMag(1, 1);
    const { continuous } = pamPsd(g, 2, 0, 1, [0]);
    expect(continuous[0]).toBeCloseTo((2 / 1) * g(0) ** 2, 6); // = 2
  });
});
