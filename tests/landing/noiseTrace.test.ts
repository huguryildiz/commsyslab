import { describe, expect, it } from 'vitest';
import { advanceNoiseTrace, makeNoiseTrace } from '@/pages/landing/viz/noiseTrace';

describe('noiseTrace', () => {
  it('makeNoiseTrace fills a buffer of the requested length', () => {
    let i = 0;
    const buf = makeNoiseTrace(4, () => i++);
    expect(buf).toEqual([0, 1, 2, 3]);
  });

  it('advanceNoiseTrace keeps length, drops oldest, appends newest', () => {
    let i = 0;
    const buf = makeNoiseTrace(3, () => i++); // [0, 1, 2], i === 3
    advanceNoiseTrace(buf, () => i++); // drop 0, push 3 → [1, 2, 3]
    expect(buf).toEqual([1, 2, 3]);
    advanceNoiseTrace(buf, () => 99); // [2, 3, 99]
    expect(buf).toEqual([2, 3, 99]);
  });
});
