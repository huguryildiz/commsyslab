import { describe, it, expect } from 'vitest';
import { lzParse, lzDecode } from '@/lib/dsp/lz78';

const INPUT = '0100001100001010000010100000110000010100001001001';
const CONTENTS = [
  '0', '1', '00', '001', '10', '000', '101', '0000',
  '01', '010', '00001', '100', '0001', '0100', '0010', '01001',
];
const CODEWORDS = [
  '00000', '00001', '00010', '00111', '00100', '00110', '01011', '01100',
  '00011', '10010', '10001', '01010', '01101', '10100', '01000', '11101',
];

describe('lzParse (book Table 6.1)', () => {
  const r = lzParse(INPUT);

  it('parses into 16 phrases with 4 index bits', () => {
    expect(r.phrases).toHaveLength(16);
    expect(r.indexBits).toBe(4);
  });

  it('reproduces the dictionary contents', () => {
    expect(r.phrases.map((p) => p.contents)).toEqual(CONTENTS);
  });

  it('reproduces the Table 6.1 codewords', () => {
    expect(r.phrases.map((p) => p.codeword)).toEqual(CODEWORDS);
  });

  it('maps a 49-bit input to an 80-bit encoding', () => {
    expect(r.inputLength).toBe(49);
    expect(r.encodedLength).toBe(80);
    expect(r.encoded).toBe(CODEWORDS.join(''));
  });
});

describe('lzDecode', () => {
  it('losslessly reconstructs the book input', () => {
    expect(lzDecode(lzParse(INPUT))).toBe(INPUT);
  });

  it('round-trips an arbitrary bit string (with a trailing repeated phrase)', () => {
    const x = '011010011001110';
    expect(lzDecode(lzParse(x))).toBe(x);
  });
});
