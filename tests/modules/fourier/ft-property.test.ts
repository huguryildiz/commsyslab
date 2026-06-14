import { describe, it, expect } from 'vitest';
import { buildFtProperty } from '@/modules/fourier/model';

describe('buildFtProperty', () => {
  it('time-shift leaves |X(f)| unchanged vs the base pair', () => {
    const base = buildFtProperty('rect', 'shift', { t0: 0, fcShift: 0, scale: 1, amp: 1 });
    const shifted = buildFtProperty('rect', 'shift', { t0: 0.1, fcShift: 0, scale: 1, amp: 1 });
    for (let i = 0; i < base.freqDomain.mag.length; i++) {
      expect(shifted.freqDomain.mag[i]).toBeCloseTo(base.freqDomain.mag[i], 6);
    }
  });

  it('amplitude scaling scales the spectrum magnitude', () => {
    const base = buildFtProperty('rect', 'amp', { t0: 0, fcShift: 0, scale: 1, amp: 1 });
    const scaled = buildFtProperty('rect', 'amp', { t0: 0, fcShift: 0, scale: 1, amp: 2 });
    const iMax = base.freqDomain.mag.indexOf(Math.max(...base.freqDomain.mag));
    expect(scaled.freqDomain.mag[iMax]).toBeCloseTo(2 * base.freqDomain.mag[iMax], 6);
  });

  it('returns matching-length time and freq arrays', () => {
    const v = buildFtProperty('tri', 'scale', { t0: 0, fcShift: 0, scale: 0.5, amp: 1 });
    expect(v.timeDomain.t.length).toBe(v.timeDomain.transformed.length);
    expect(v.freqDomain.f.length).toBe(v.freqDomain.mag.length);
  });
});
