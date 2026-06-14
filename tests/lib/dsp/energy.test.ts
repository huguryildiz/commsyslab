import { describe, it, expect } from 'vitest';
import { signalEnergy, signalPowerRMS, parsevalSeries } from '@/lib/dsp/energy';

describe('energy & power', () => {
  it('signalEnergy = Σ|x|² dt', () => {
    expect(signalEnergy([1, 1, 1, 1], 0.5)).toBeCloseTo(2, 6);
  });
  it('signalPowerRMS = (1/T) Σ|x|² dt', () => {
    // constant 2 over T=4 → power 4
    expect(signalPowerRMS([2, 2, 2, 2], 1, 4)).toBeCloseTo(4, 6);
  });
  it('parsevalSeries: average power equals Σ|cn|² for partial set', () => {
    // cn = {0:1, ±1:0.5} → Σ|cn|² = 1 + 0.25 + 0.25 = 1.5
    const mags = [0.5, 1, 0.5];
    expect(parsevalSeries(mags)).toBeCloseTo(1.5, 6);
  });
});
