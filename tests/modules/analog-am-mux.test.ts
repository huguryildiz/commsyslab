import { describe, it, expect } from 'vitest';
import { buildFdmView, buildQamView } from '@/modules/analog-am/model';

describe('buildFdmView', () => {
  it('returns a composite spectrum and a recovered channel signal', () => {
    const v = buildFdmView({ channels: 3, spacing: 20000, bandwidth: 3000, selected: 1 });
    expect(v.specFreq.length).toBe(v.specMag.length);
    expect(v.specFreq.length).toBeGreaterThan(0);
    expect(v.recovered.length).toBe(v.time.length);
    expect(v.original.length).toBe(v.time.length);
    expect(v.carriers.length).toBe(3);
    expect(v.bands.length).toBe(3);
    expect(v.selected).toBe(1);
    expect(v.overlap).toBe(false);
  });
  it('builds K carriers stacked from f0 by the carrier spacing', () => {
    const v = buildFdmView({ channels: 4, spacing: 10000, bandwidth: 3000, selected: 0 });
    expect(v.carriers).toEqual([20000, 30000, 40000, 50000]);
  });
  it('clamps the selected channel to the available range', () => {
    const v = buildFdmView({ channels: 2, spacing: 20000, bandwidth: 3000, selected: 5 });
    expect(v.selected).toBe(1);
  });
  it('flags overlap when spacing is below 2·bandwidth', () => {
    const v = buildFdmView({ channels: 3, spacing: 4000, bandwidth: 3000, selected: 0 });
    expect(v.overlap).toBe(true);
  });
});

describe('buildQamView', () => {
  it('recovers both channels with no phase error', () => {
    const v = buildQamView({ m1Freq: 1000, m2Freq: 2000, carrierFreq: 20000, phaseErrorDeg: 0 });
    expect(v.m1Hat.length).toBe(v.time.length);
    expect(v.m2Hat.length).toBe(v.time.length);
    expect(v.crosstalkDb).toBeLessThan(-15);
  });
  it('reports high crosstalk at 45° phase error', () => {
    const v = buildQamView({ m1Freq: 1000, m2Freq: 2000, carrierFreq: 20000, phaseErrorDeg: 45 });
    expect(v.crosstalkDb).toBeGreaterThan(-15);
  });
});
