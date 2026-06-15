import { describe, it, expect } from 'vitest';
import { buildBasebandBandpassSignal } from '@/modules/fourier/model';
import { mainLobeBandwidth } from '@/lib/dsp/bandwidth';
import { analyticFt } from '@/lib/dsp/ftpairs';

/** One-sided (DC → first null) and +fc-lobe null-to-null bandwidths used by the UI. */
function bandwidths(view: ReturnType<typeof buildBasebandBandpassSignal>) {
  const pos = view.freqs.map((_, i) => i).filter((i) => view.freqs[i] >= 0);
  const f = pos.map((i) => view.freqs[i]);
  const bb = pos.map((i) => view.baseband[i]);
  const bp = pos.map((i) => view.bandpass[i]);
  return { W: mainLobeBandwidth(f, bb).fHi, twoW: mainLobeBandwidth(f, bp).W };
}

describe('buildBasebandBandpassSignal — Proakis §2.7', () => {
  it('normalizes the baseband peak to 1 at f=0', () => {
    const v = buildBasebandBandpassSignal('rect', 40, 200);
    const peak = Math.max(...v.baseband);
    expect(peak).toBeCloseTo(1, 6);
    const k0 = v.freqs.findIndex((f) => Math.abs(f) === Math.min(...v.freqs.map((x) => Math.abs(x))));
    expect(v.baseband[k0]).toBeGreaterThan(0.99);
  });

  it('rect message: baseband null ≈ F, bandpass transmission band ≈ 2F', () => {
    const F = 40;
    const { W, twoW } = bandwidths(buildBasebandBandpassSignal('rect', F, 200));
    // sinc(f/F) first null at f = F; grid spacing ~2 Hz.
    expect(W).toBeGreaterThan(F - 4);
    expect(W).toBeLessThan(F + 4);
    expect(twoW / W).toBeCloseTo(2, 1);
  });

  it('places the bandpass lobes at ±fc with unit peak', () => {
    const fc = 200;
    const v = buildBasebandBandpassSignal('tri', 40, fc);
    const at = (target: number) => {
      let k = 0;
      for (let i = 1; i < v.freqs.length; i++)
        if (Math.abs(v.freqs[i] - target) < Math.abs(v.freqs[k] - target)) k = i;
      return v.bandpass[k];
    };
    expect(at(fc)).toBeCloseTo(1, 1);
    expect(at(-fc)).toBeCloseTo(1, 1);
    expect(at(0)).toBeLessThan(0.05); // no energy at DC for fc ≫ W
  });

  it('supports the curated message set including the new gaussian FT pair', () => {
    for (const kind of ['rect', 'tri', 'sinc', 'gaussian'] as const) {
      const v = buildBasebandBandpassSignal(kind, 40, 200);
      expect(v.baseband.some((x) => x > 0.5)).toBe(true);
      expect(v.bandpass.every((x) => Number.isFinite(x))).toBe(true);
    }
    // Gaussian FT is real, even, peaks at f=0.
    expect(analyticFt('gaussian', 0, 0.5).re).toBeGreaterThan(0);
    expect(analyticFt('gaussian', 1, 0.5).re).toBeCloseTo(analyticFt('gaussian', -1, 0.5).re, 9);
  });
});
