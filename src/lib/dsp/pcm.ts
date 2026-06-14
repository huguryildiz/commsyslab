import { clamp } from './math';
import { numLevels, type QuantizerType } from './quantize';
import type { Bit } from '@/lib/sim/sources';

/** PCM codeword bit-to-symbol mapping. */
export type PcmCoding = 'nbc' | 'gray';

/**
 * Quantizer code index in [0, L-1] for a value, where L = 2^bits.
 * Mirrors the level selection in `quantize`: midrise uses floor, midtread
 * uses round; both clamp the integer level k to [-L/2, L/2-1] and offset by
 * L/2 so the smallest level maps to 0 and the largest to L-1.
 */
export function codeIndex(value: number, mMax: number, bits: number, type: QuantizerType): number {
  const L = numLevels(bits);
  const d = (2 * mMax) / L;
  const k =
    type === 'midrise'
      ? clamp(Math.floor(value / d), -L / 2, L / 2 - 1)
      : clamp(Math.round(value / d), -L / 2, L / 2 - 1);
  return k + L / 2;
}

/** Natural binary code: index -> bits, MSB first, fixed width. */
export function toNBC(index: number, bits: number): Bit[] {
  const out: Bit[] = [];
  for (let b = bits - 1; b >= 0; b--) out.push(((index >> b) & 1) as Bit);
  return out;
}

/** Reflected binary (Gray) code of an index. */
export function toGray(index: number): number {
  return index ^ (index >> 1);
}

/** Encode one sample to an R-bit PCM codeword under the chosen coding. */
export function pcmCodeword(
  value: number,
  mMax: number,
  bits: number,
  type: QuantizerType,
  coding: PcmCoding,
): Bit[] {
  const idx = codeIndex(value, mMax, bits, type);
  const symbol = coding === 'gray' ? toGray(idx) : idx;
  return toNBC(symbol, bits);
}

/** Encode a sequence of samples into a flat PCM bitstream. */
export function pcmStream(
  values: number[],
  mMax: number,
  bits: number,
  type: QuantizerType,
  coding: PcmCoding,
): Bit[] {
  const out: Bit[] = [];
  for (const v of values) out.push(...pcmCodeword(v, mMax, bits, type, coding));
  return out;
}

/** Inverse of `toGray`: reflected-binary code -> natural integer. */
export function fromGray(code: number): number {
  let num = code;
  for (let mask = code >> 1; mask > 0; mask >>= 1) num ^= mask;
  return num;
}

/** Decode one NBC PCM codeword (MSB-first) back to its quantizer code index. */
export function indexFromCodeword(bits: Bit[], coding: PcmCoding): number {
  let symbol = 0;
  for (const b of bits) symbol = (symbol << 1) | b;
  return coding === 'gray' ? fromGray(symbol) : symbol;
}
