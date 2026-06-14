import { describe, it, expect } from 'vitest';
import {
  makeConvCode,
  nextState,
  branchOutputs,
  buildTrellis,
  encodeConv,
  BOOK_CODE,
} from '@/lib/dsp/convcodes';

describe('convolutional encoder FSM', () => {
  it('BOOK_CODE is the (2,1,3) g1=[1,0,1], g2=[1,1,1] code', () => {
    expect(BOOK_CODE.L).toBe(3);
    expect(BOOK_CODE.g1).toEqual([1, 0, 1]);
    expect(BOOK_CODE.g2).toEqual([1, 1, 1]);
    expect(BOOK_CODE.nStates).toBe(4);
  });
  it('branchOutputs match the book trellis (state 0, input 1 -> 11)', () => {
    expect(branchOutputs(0, 1, BOOK_CODE)).toEqual([1, 1]);
    expect(branchOutputs(2, 0, BOOK_CODE)).toEqual([0, 1]);
    expect(branchOutputs(1, 1, BOOK_CODE)).toEqual([0, 0]);
  });
  it('nextState shifts the input into the top memory bit', () => {
    expect(nextState(0, 1, 3)).toBe(2);
    expect(nextState(2, 0, 3)).toBe(1);
    expect(nextState(1, 1, 3)).toBe(2);
  });
  it('buildTrellis exposes both branches per state', () => {
    const tr = buildTrellis(BOOK_CODE);
    expect(tr.length).toBe(4);
    expect(tr[0][1]).toEqual({ input: 1, next: 2, out: [1, 1] });
    expect(tr[0][0]).toEqual({ input: 0, next: 0, out: [0, 0] });
  });
  it('encodeConv runs the FSM and flushes with L-1 tail zeros back to state 0', () => {
    // Hand-worked from Fig 9.25: input [1,0,1,1] + tail [0,0]
    expect(encodeConv([1, 0, 1, 1], BOOK_CODE)).toEqual([
      1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1,
    ]);
  });
});
