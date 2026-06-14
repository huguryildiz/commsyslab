import { describe, it, expect } from 'vitest';
import { convolve } from '@/lib/dsp/convolution';

describe('convolve', () => {
  it('convolves two unit impulses-as-samples with dt scaling', () => {
    // [1,2,3] * [1,1] with dt=1 → [1,3,5,3]
    expect(convolve([1, 2, 3], [1, 1], 1)).toEqual([1, 3, 5, 3]);
  });

  it('scales the sum by the sample step dt', () => {
    // Two rect samples of height 1, dt=0.5 → trapezoid area scaling
    expect(convolve([1, 1], [1, 1], 0.5)).toEqual([0.5, 1, 0.5]);
  });

  it('returns length N+M-1', () => {
    expect(convolve([1, 1, 1], [1, 1], 1)).toHaveLength(4);
  });
});
