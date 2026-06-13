// Ref: Proakis & Salehi §6.3.2 (The Lempel-Ziv Source-Coding Algorithm). Bkz. docs/book-reference.md.

export interface LzPhrase {
  location: number; // 1-based dictionary index
  contents: string; // the phrase bits
  prefixIndex: number; // dictionary location of the prefix phrase (0 = empty prefix)
  newBit: string; // the appended bit ('' for a trailing phrase that repeats an existing entry)
  codeword: string; // indexBits-wide binary of prefixIndex, then newBit
}

export interface LzResult {
  phrases: LzPhrase[];
  indexBits: number;
  encoded: string;
  inputLength: number;
  encodedLength: number;
}

function toBinary(value: number, width: number): string {
  return value.toString(2).padStart(width, '0');
}

/**
 * Lempel-Ziv (LZ78) parse: split the bit string into phrases of smallest length
 * not seen before; each new phrase = an existing phrase + one new bit.
 * indexBits is sized to the final phrase count, matching the book's fixed-width scheme.
 */
export function lzParse(bits: string): LzResult {
  interface Raw {
    contents: string;
    prefixIndex: number;
    newBit: string;
  }
  const dict = new Map<string, number>(); // contents → location (1-based)
  const raw: Raw[] = [];
  let cur = '';
  for (const b of bits) {
    cur += b;
    if (!dict.has(cur)) {
      const prefix = cur.slice(0, -1);
      const prefixIndex = prefix === '' ? 0 : (dict.get(prefix) as number);
      dict.set(cur, raw.length + 1);
      raw.push({ contents: cur, prefixIndex, newBit: cur.slice(-1) });
      cur = '';
    }
  }
  // Trailing partial phrase: it equals an already-seen phrase; emit it with no new bit.
  if (cur !== '') {
    raw.push({ contents: cur, prefixIndex: dict.get(cur) as number, newBit: '' });
  }

  const indexBits = Math.max(1, Math.ceil(Math.log2(raw.length)));
  const phrases: LzPhrase[] = raw.map((p, i) => ({
    location: i + 1,
    contents: p.contents,
    prefixIndex: p.prefixIndex,
    newBit: p.newBit,
    codeword: toBinary(p.prefixIndex, indexBits) + p.newBit,
  }));
  const encoded = phrases.map((p) => p.codeword).join('');

  return {
    phrases,
    indexBits,
    encoded,
    inputLength: bits.length,
    encodedLength: encoded.length,
  };
}

/** Reconstruct the original bit string from a parse result (lossless). */
export function lzDecode(result: LzResult): string {
  const byLocation: Record<number, string> = { 0: '' };
  let out = '';
  for (const p of result.phrases) {
    const contents = byLocation[p.prefixIndex] + p.newBit;
    byLocation[p.location] = contents;
    out += contents;
  }
  return out;
}
