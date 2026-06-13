import { describe, it, expect } from 'vitest';
import { buildHuffman, huffmanEncode, huffmanDecode } from '@/lib/dsp/huffman';

const SYM = ['s0', 's1', 's2', 's3', 's4'];
const P = [0.4, 0.2, 0.2, 0.1, 0.1];

function sortedLengths(lengths: Record<string, number>): number[] {
  return Object.values(lengths).sort((a, b) => a - b);
}

describe('buildHuffman', () => {
  it('reproduces the slide L̄ = 2.2, H ≈ 2.12, η ≈ 0.96', () => {
    const r = buildHuffman(SYM, P);
    expect(r.Lbar).toBeCloseTo(2.2, 10);
    expect(r.H).toBeCloseTo(2.12, 2);
    expect(r.efficiency).toBeCloseTo(0.96, 2);
  });

  it('default build is the skewed code: lengths {1,2,3,4,4}, variance 1.36', () => {
    const r = buildHuffman(SYM, P);
    expect(sortedLengths(r.lengths)).toEqual([1, 2, 3, 4, 4]);
    expect(r.variance).toBeCloseTo(1.36, 10);
  });

  it('minVariance build is balanced: lengths {2,2,2,3,3}, variance 0.16', () => {
    const r = buildHuffman(SYM, P, { minVariance: true });
    expect(sortedLengths(r.lengths)).toEqual([2, 2, 2, 3, 3]);
    expect(r.variance).toBeCloseTo(0.16, 10);
  });

  it('produces a valid prefix code (Kraft = 1 for a full binary Huffman tree)', () => {
    const r = buildHuffman(SYM, P);
    const k = Object.values(r.lengths).reduce((s, l) => s + 2 ** -l, 0);
    expect(k).toBeCloseTo(1, 10);
  });
});

describe('huffman encode/decode round-trip', () => {
  it('round-trips an arbitrary symbol sequence', () => {
    const r = buildHuffman(SYM, P);
    const msg = ['s0', 's4', 's2', 's1', 's3', 's0', 's0'];
    const bits = huffmanEncode(msg, r.codes);
    expect(/^[01]+$/.test(bits)).toBe(true);
    expect(huffmanDecode(bits, r.root)).toEqual(msg);
  });

  it('handles a single-symbol alphabet (code "0")', () => {
    const r = buildHuffman(['a'], [1]);
    expect(r.codes.a).toBe('0');
    expect(huffmanDecode(huffmanEncode(['a', 'a'], r.codes), r.root)).toEqual(['a', 'a']);
  });
});
