import { describe, it, expect } from 'vitest';
import { sinc } from '@/lib/dsp/math';

describe('sinc (normalized: sin(pi x)/(pi x))', () => {
  it('sinc(0) = 1', () => {
    expect(sinc(0)).toBeCloseTo(1, 12);
  });
  it('sinc(integer) = 0', () => {
    expect(sinc(1)).toBeCloseTo(0, 12);
    expect(sinc(-3)).toBeCloseTo(0, 12);
  });
  it('sinc(0.5) = 2/pi', () => {
    expect(sinc(0.5)).toBeCloseTo(2 / Math.PI, 12);
  });
});
