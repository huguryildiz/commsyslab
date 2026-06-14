import { describe, it, expect } from 'vitest';
import { uncodedBerBpsk } from '@/lib/dsp/blockcodes';
import {
  blockBerHardBound,
  rsBerBound,
  requiredEbN0ForBer,
  codingGainDb,
  shannonGapDb,
  COMPARISON_CODES,
} from '@/lib/dsp/codingcompare';

describe('codingcompare bounds', () => {
  it('block & RS bounds are monotone-decreasing and beat uncoded at 8 dB', () => {
    expect(blockBerHardBound(7, 4, 1, 4)).toBeGreaterThan(blockBerHardBound(7, 4, 1, 8));
    expect(rsBerBound(15, 11, 4, 4)).toBeGreaterThan(rsBerBound(15, 11, 4, 8));
    for (const ber of [
      blockBerHardBound(7, 4, 1, 8),
      blockBerHardBound(15, 5, 3, 8),
      rsBerBound(15, 11, 4, 8),
    ]) {
      expect(ber).toBeGreaterThan(0);
      expect(ber).toBeLessThan(uncodedBerBpsk(8));
    }
  });

  it('requiredEbN0ForBer inverts the BER curve', () => {
    const r = requiredEbN0ForBer(uncodedBerBpsk, 1e-5);
    expect(uncodedBerBpsk(r)).toBeGreaterThan(0.8e-5);
    expect(uncodedBerBpsk(r)).toBeLessThan(1.2e-5);
    // smaller target BER needs more Eb/N0
    expect(requiredEbN0ForBer(uncodedBerBpsk, 1e-6)).toBeGreaterThan(
      requiredEbN0ForBer(uncodedBerBpsk, 1e-3),
    );
  });

  it('every coded entry has positive coding gain and positive Shannon gap at 1e-5', () => {
    const coded = COMPARISON_CODES.filter((c) => c.id !== 'uncoded');
    for (const c of coded) {
      expect(codingGainDb(c, 1e-5)).toBeGreaterThan(0);
      expect(shannonGapDb(c, 1e-5)).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(COMPARISON_CODES.map((c) => [c.id, c]));
    // convolutional soft is the strongest of the set
    expect(codingGainDb(byId.conv_soft, 1e-5)).toBeGreaterThan(codingGainDb(byId.hamming74, 1e-5));
    expect(codingGainDb(byId.conv_soft, 1e-5)).toBeGreaterThan(codingGainDb(byId.bch155, 1e-5));
  });

  it('registry has the five expected codes', () => {
    expect(COMPARISON_CODES.map((c) => c.id)).toEqual([
      'uncoded',
      'hamming74',
      'conv_soft',
      'bch155',
      'rs1511',
    ]);
  });
});
