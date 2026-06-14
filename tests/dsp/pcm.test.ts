import { describe, it, expect } from 'vitest';
import { codeIndex, toNBC, toGray, pcmCodeword, pcmStream, fromGray, indexFromCodeword } from '@/lib/dsp/pcm';

describe('codeIndex (mMax=1, bits=2 -> L=4, delta=0.5)', () => {
  it('midrise maps the four sub-ranges to indices 0..3', () => {
    expect(codeIndex(-0.9, 1, 2, 'midrise')).toBe(0);
    expect(codeIndex(-0.1, 1, 2, 'midrise')).toBe(1);
    expect(codeIndex(0.1, 1, 2, 'midrise')).toBe(2);
    expect(codeIndex(0.9, 1, 2, 'midrise')).toBe(3);
  });
  it('clamps out-of-range to the top index', () => {
    expect(codeIndex(99, 1, 2, 'midrise')).toBe(3);
    expect(codeIndex(-99, 1, 2, 'midrise')).toBe(0);
  });
  it('midtread spans all four indices', () => {
    expect(codeIndex(-0.9, 1, 2, 'midtread')).toBe(0); // -1.0 level
    expect(codeIndex(-0.3, 1, 2, 'midtread')).toBe(1); // -0.5
    expect(codeIndex(0.1, 1, 2, 'midtread')).toBe(2); // 0
    expect(codeIndex(0.3, 1, 2, 'midtread')).toBe(3); // +0.5
  });
});

describe('toNBC (natural binary, MSB first)', () => {
  it('encodes an index to a fixed-width bit array', () => {
    expect(toNBC(0, 2)).toEqual([0, 0]);
    expect(toNBC(1, 2)).toEqual([0, 1]);
    expect(toNBC(2, 2)).toEqual([1, 0]);
    expect(toNBC(3, 2)).toEqual([1, 1]);
    expect(toNBC(5, 3)).toEqual([1, 0, 1]);
  });
});

describe('toGray', () => {
  it('produces the reflected binary Gray code sequence', () => {
    expect([0, 1, 2, 3].map(toGray)).toEqual([0, 1, 3, 2]);
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(toGray)).toEqual([0, 1, 3, 2, 6, 7, 5, 4]);
  });
});

describe('pcmCodeword', () => {
  it('NBC codeword has length=bits and matches the natural index', () => {
    expect(pcmCodeword(0.9, 1, 2, 'midrise', 'nbc')).toEqual([1, 1]); // index 3
  });
  it('Gray codeword applies the Gray map to the index', () => {
    // index 3 -> gray 2 -> [1,0]
    expect(pcmCodeword(0.9, 1, 2, 'midrise', 'gray')).toEqual([1, 0]);
    // index 2 -> gray 3 -> [1,1]
    expect(pcmCodeword(0.1, 1, 2, 'midrise', 'gray')).toEqual([1, 1]);
  });
});

describe('pcmStream', () => {
  it('concatenates one codeword per sample (length = n*bits)', () => {
    const bits = pcmStream([-0.9, 0.9], 1, 2, 'midrise', 'nbc');
    expect(bits).toEqual([0, 0, 1, 1]); // index 0 -> 00, index 3 -> 11
  });
});

describe('fromGray (inverse of toGray)', () => {
  it('round-trips all 4-bit indices', () => {
    for (let i = 0; i < 16; i++) expect(fromGray(toGray(i))).toBe(i);
  });
});

describe('indexFromCodeword (inverse of pcmCodeword index mapping)', () => {
  it('recovers the code index for nbc and gray', () => {
    for (const coding of ['nbc', 'gray'] as const) {
      for (let idx = 0; idx < 8; idx++) {
        // value placed at the idx-th midrise level for mMax=1, bits=3
        const value = ((idx - 4) + 0.5) * (2 / 8);
        const word = pcmCodeword(value, 1, 3, 'midrise', coding);
        expect(indexFromCodeword(word, coding)).toBe(idx);
      }
    }
  });
});
