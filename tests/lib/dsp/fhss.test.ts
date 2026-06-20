import { describe, it, expect } from 'vitest';
import { fastFhBerBfsk } from '@/lib/dsp/fhss';
import { dsssDetectorPe } from '@/lib/dsp/spread';

describe('fast FH', () => {
  it('more hops/bit lowers BER under partial-band jamming (diversity)', () => {
    const l1 = fastFhBerBfsk(10, 1, 0.3);
    const l4 = fastFhBerBfsk(10, 4, 0.3);
    expect(l4).toBeLessThan(l1);
  });
});

describe('DS-SS detector Pe', () => {
  it('larger processing gain lowers Pe at fixed JSR', () => {
    expect(dsssDetectorPe(6, 20, 127)).toBeLessThan(dsssDetectorPe(6, 20, 31));
  });
});
