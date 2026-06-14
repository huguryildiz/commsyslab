import { describe, it, expect } from 'vitest';
import { transferMag } from '@/lib/dsp/fourier';

describe('transferMag band-stop', () => {
  it('bsf passes outside [f1,f2] and rejects inside', () => {
    expect(transferMag('bsf', 10, 30, 70)).toBe(1); // below band
    expect(transferMag('bsf', 50, 30, 70)).toBe(0); // inside band
    expect(transferMag('bsf', 90, 30, 70)).toBe(1); // above band
  });
  it('bsf is the complement of bpf', () => {
    for (const f of [5, 35, 50, 65, 95]) {
      expect(transferMag('bsf', f, 30, 70) + transferMag('bpf', f, 30, 70)).toBe(1);
    }
  });
});
