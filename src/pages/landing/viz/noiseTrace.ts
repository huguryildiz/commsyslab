/**
 * Ring-buffer model for a scrolling noise trace: a fixed-length list of samples
 * that advances by dropping the oldest and appending a fresh one. Pure and
 * UI-free so it can be unit-tested independently of canvas drawing.
 */

/** Create a buffer of `len` samples drawn from `sample`. */
export function makeNoiseTrace(len: number, sample: () => number): number[] {
  const buf: number[] = [];
  for (let i = 0; i < len; i += 1) buf.push(sample());
  return buf;
}

/** Advance one step: drop the oldest sample, append a fresh one. Mutates `buf`. */
export function advanceNoiseTrace(buf: number[], sample: () => number): void {
  buf.shift();
  buf.push(sample());
}
