import { describe, it, expect } from 'vitest';
import { baselineLines, replicaLines, hasAliasing } from '@/lib/dsp/spectrum';

describe('baselineLines', () => {
  it('a cosine yields two lines at +/-f with magnitude amp/2', () => {
    const lines = baselineLines([{ freq: 2, amp: 1 }]);
    expect(lines).toHaveLength(2);
    const freqs = lines.map((l) => l.freq).sort((a, b) => a - b);
    expect(freqs).toEqual([-2, 2]);
    expect(lines[0].mag).toBeCloseTo(0.5, 12);
  });
});

describe('replicaLines', () => {
  it('shifts the baseband lines by every multiple of fs', () => {
    const lines = replicaLines([{ freq: 2, amp: 1 }], 8, 1); // n in {-1,0,1}
    expect(lines).toHaveLength(2 * 3); // 2 baseband lines x 3 replicas
    const freqs = lines.map((l) => l.freq);
    expect(freqs).toContain(2);
    expect(freqs).toContain(2 - 8);
    expect(freqs).toContain(2 + 8);
  });
});

describe('hasAliasing', () => {
  it('false when fs > 2W', () => {
    expect(hasAliasing([{ freq: 3, amp: 1 }], 8)).toBe(false); // 3 < 4
  });
  it('true when fs < 2W', () => {
    expect(hasAliasing([{ freq: 5, amp: 1 }], 8)).toBe(true); // 5 > 4
  });
});
