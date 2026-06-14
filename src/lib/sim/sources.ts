export type Bit = 0 | 1;

/** Encode text as ASCII bytes, MSB-first, 8 bits per character. */
export function textToBits(text: string): Bit[] {
  const bits: Bit[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) & 0xff;
    for (let b = 7; b >= 0; b--) bits.push(((code >> b) & 1) as Bit);
  }
  return bits;
}

/** Decode MSB-first 8-bit groups back into text (trailing partial group ignored). */
export function bitsToText(bits: Bit[]): string {
  let s = '';
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let code = 0;
    for (let b = 0; b < 8; b++) code = (code << 1) | bits[i + b];
    s += String.fromCharCode(code);
  }
  return s;
}

/** mulberry32 — small deterministic PRNG returning floats in [0,1). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A reproducible Bernoulli(0.5) bit source. */
export function randomBitSource(seed = 1): () => Bit {
  const rng = makeRng(seed);
  return () => (rng() < 0.5 ? 0 : 1);
}

/** Pack bits into symbol indices, k bits per symbol, MSB-first, zero-padded. */
export function bitsToSymbols(bits: Bit[], k: number): number[] {
  const syms: number[] = [];
  for (let i = 0; i < bits.length; i += k) {
    let v = 0;
    for (let b = 0; b < k; b++) v = (v << 1) | (i + b < bits.length ? bits[i + b] : 0);
    syms.push(v);
  }
  return syms;
}

/** Unpack symbol indices back into bits, k bits per symbol, MSB-first. */
export function symbolsToBits(syms: number[], k: number): Bit[] {
  const bits: Bit[] = [];
  for (const s of syms) for (let b = k - 1; b >= 0; b--) bits.push(((s >> b) & 1) as Bit);
  return bits;
}
