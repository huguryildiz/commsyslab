import { describe, it, expect } from 'vitest';
import {
  productParams,
  spcProductEncode,
  rowSyndromes,
  colSyndromes,
  spcProductDecode,
} from '@/lib/dsp/productcodes';

describe('product codes (§13.4.1)', () => {
  it('product parameters multiply: (7,4,3)² → (49,16) d_min=9, t=4', () => {
    expect(productParams(7, 4, 3, 7, 4, 3)).toEqual({
      n: 49,
      k: 16,
      dmin: 9,
      t: 4,
      rate: 16 / 49,
    });
  });

  it('SPC product encode makes every row and column even parity', () => {
    const data = [
      [1, 0, 1],
      [1, 1, 0],
    ];
    const g = spcProductEncode(data);
    expect(g.length).toBe(3); // m+1
    expect(g[0].length).toBe(4); // n+1
    expect(rowSyndromes(g).every((b) => !b)).toBe(true);
    expect(colSyndromes(g).every((b) => !b)).toBe(true);
  });

  it('locates and corrects a single bit error at the failing row∩column', () => {
    const data = [
      [1, 0, 1],
      [0, 1, 1],
    ];
    const g = spcProductEncode(data);
    g[1][2] ^= 1; // inject one error
    const dec = spcProductDecode(g);
    expect(dec.status).toBe('corrected');
    expect(dec.pos).toEqual([1, 2]);
    expect(rowSyndromes(dec.grid).every((b) => !b)).toBe(true);
    expect(colSyndromes(dec.grid).every((b) => !b)).toBe(true);
  });

  it('clean grid decodes to clean; two errors in a row are uncorrectable', () => {
    const data = [
      [1, 1, 0],
      [0, 1, 1],
    ];
    const g = spcProductEncode(data);
    expect(spcProductDecode(g).status).toBe('clean');
    g[0][0] ^= 1;
    g[0][1] ^= 1; // two errors in row 0 → row syndrome clears, columns fail → uncorrectable
    expect(spcProductDecode(g).status).toBe('uncorrectable');
  });
});
