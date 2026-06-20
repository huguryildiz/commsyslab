import { describe, it, expect } from 'vitest';
import {
  paprDb,
  paprCcdfTheoretical,
  paprCcdfEmpirical,
  clipEnvelope,
  oversampledOfdmEnvelope,
} from '@/lib/dsp/papr';
import type { Complex } from '@/lib/dsp/fft';

const c = (re: number, im = 0): Complex => ({ re, im });

describe('papr', () => {
  it('single active subcarrier has near-constant envelope → ~0 dB PAPR', () => {
    const syms: Complex[] = [c(1), c(0), c(0), c(0)];
    expect(paprDb(syms, 8)).toBeLessThan(0.5);
  });
  it('theoretical CCDF is in [0,1], decreasing in γ and increasing in N', () => {
    expect(paprCcdfTheoretical(0, 64)).toBeCloseTo(1, 5);
    expect(paprCcdfTheoretical(8, 64)).toBeLessThan(paprCcdfTheoretical(4, 64));
    expect(paprCcdfTheoretical(8, 256)).toBeGreaterThan(paprCcdfTheoretical(8, 64));
  });
  it('empirical CCDF is monotonically non-increasing and brackets a realistic knee', () => {
    const pts = paprCcdfEmpirical(64, 400, 7, 4);
    for (let i = 1; i < pts.length; i++) expect(pts[i].ccdf).toBeLessThanOrEqual(pts[i - 1].ccdf + 1e-9);
    const at10 = pts.find((p) => p.gammaDb >= 10);
    expect(at10!.ccdf).toBeLessThan(0.5);
  });
  it('clipping reduces PAPR and raises EVM', () => {
    const env = oversampledOfdmEnvelope([c(1), c(1), c(1), c(1)], 8);
    const before = paprDb([c(1), c(1), c(1), c(1)], 8);
    const { paprDb: after, evm } = clipEnvelope(env, 3);
    expect(after).toBeLessThan(before);
    expect(evm).toBeGreaterThan(0);
  });
});
