import { describe, it, expect } from 'vitest';
import { buildModulationView, type ModulationParams } from '@/modules/modulation/model';

const base: ModulationParams = {
  scheme: 'bpsk',
  M: 2,
  ebN0Db: 8,
  decision: 'ml',
  prior0: 0.5,
};

describe('buildModulationView', () => {
  it('projects a 2-D scheme to drawable points', () => {
    const v = buildModulationView({ ...base, scheme: 'mpsk', M: 4 });
    expect(v.drawable).toBe(true);
    expect(v.dim).toBe(2);
    expect(v.points2d).toHaveLength(4);
    expect(v.labels).toHaveLength(4);
  });

  it('flags >2-D schemes as not drawable but still gives a SER curve', () => {
    const v = buildModulationView({ ...base, scheme: 'mfsk', M: 4 });
    expect(v.drawable).toBe(false);
    expect(v.points2d).toHaveLength(0);
    expect(v.serCurve.pe.length).toBe(v.serCurve.ebN0Db.length);
  });

  it('puts 1-D schemes on the y=0 axis with thresholds', () => {
    const v = buildModulationView(base); // BPSK
    expect(v.dim).toBe(1);
    expect(v.points2d.every((p) => p.y === 0)).toBe(true);
    expect(v.axis1d).toBeDefined();
    expect(v.axis1d!.thresholds[0].ml).toBeCloseTo(0, 6);
  });

  it('shifts the MAP threshold toward the less-likely symbol', () => {
    const v = buildModulationView({ ...base, decision: 'map', prior0: 0.8 });
    const th = v.axis1d!.thresholds[0];
    expect(th.ml).toBeCloseTo(0, 6);
    expect(th.map).toBeLessThan(0);
  });

  it('builds priors that sum to 1 with prior0 on symbol 0', () => {
    const v = buildModulationView({ ...base, scheme: 'mpsk', M: 4, decision: 'map', prior0: 0.4 });
    expect(v.priors[0]).toBeCloseTo(0.4, 6);
    expect(v.priors.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('produces a monotonically non-increasing theoretical SER curve', () => {
    const v = buildModulationView({ ...base, scheme: 'mpsk', M: 8 });
    const pe = v.serCurve.pe;
    for (let i = 1; i < pe.length; i++) expect(pe[i]).toBeLessThanOrEqual(pe[i - 1] + 1e-12);
  });

  it('reports the closest pair for the d_min annotation', () => {
    const v = buildModulationView({ ...base, scheme: 'mqam', M: 16 });
    expect(v.dMinPair[0]).not.toBe(v.dMinPair[1]);
    expect(v.dMin).toBeGreaterThan(0);
  });
});
