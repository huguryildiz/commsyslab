import { describe, it, expect } from 'vitest';
import { buildFdmView, buildQamView } from '@/modules/analog-am/model';

describe('buildFdmView', () => {
  it('returns a composite spectrum and a recovered channel signal', () => {
    const v = buildFdmView({ messageFreqs: [1000, 1500, 2000], spacing: 20000, bandwidth: 3000, selected: 1 });
    expect(v.specFreq.length).toBe(v.specMag.length);
    expect(v.specFreq.length).toBeGreaterThan(0);
    expect(v.recovered.length).toBe(v.time.length);
    expect(v.overlap).toBe(false);
  });
  it('flags overlap when spacing is below 2·bandwidth', () => {
    const v = buildFdmView({ messageFreqs: [1000, 1500, 2000], spacing: 4000, bandwidth: 3000, selected: 0 });
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
