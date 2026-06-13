/** Kraft sum Σ 2^(−lₖ). A prefix code requires this to be ≤ 1 (necessary, not sufficient). */
export function kraftSum(lengths: number[]): number {
  return lengths.reduce((s, l) => s + 2 ** -l, 0);
}

/** True if no codeword is a prefix of any other (instantaneous / prefix code). */
export function isPrefixFree(codewords: string[]): boolean {
  for (let i = 0; i < codewords.length; i++) {
    for (let j = 0; j < codewords.length; j++) {
      if (i !== j && codewords[j].startsWith(codewords[i])) return false;
    }
  }
  return true;
}

/** Average codeword length L̄ = Σ pₖ·lₖ. */
export function avgLength(probs: number[], lengths: number[]): number {
  let s = 0;
  for (let i = 0; i < probs.length; i++) s += probs[i] * lengths[i];
  return s;
}

/** Coding efficiency η = H / L̄. */
export function efficiency(H: number, Lbar: number): number {
  return Lbar === 0 ? 0 : H / Lbar;
}

/**
 * Unique decodability via the Sardinas–Patterson algorithm.
 * Builds successive dangling-suffix sets; the code is NOT uniquely decodable
 * iff some dangling suffix is itself a codeword.
 */
export function isUniquelyDecodable(codewords: string[]): boolean {
  const inC = new Set(codewords);
  let S = new Set<string>();
  // S1: proper-prefix dangling suffixes within C.
  for (const a of codewords) {
    for (const b of codewords) {
      if (a !== b && b.startsWith(a)) S.add(b.slice(a.length));
    }
  }
  const seen = new Set<string>();
  while (S.size > 0) {
    for (const s of S) if (inC.has(s)) return false;
    const key = [...S].sort().join('|');
    if (seen.has(key)) break; // cycle → stabilized without finding a codeword
    seen.add(key);
    const next = new Set<string>();
    for (const w of codewords) {
      for (const s of S) {
        if (w !== s && w.startsWith(s)) next.add(w.slice(s.length));
        if (w !== s && s.startsWith(w)) next.add(s.slice(w.length));
      }
    }
    S = next;
  }
  return true;
}

/**
 * Greedy prefix-code decode of a bit string. Returns the concatenated symbols,
 * or null if the bit string is not a valid encoding (leftover undecoded bits).
 */
export function decodePrefix(bits: string, codeToSymbol: Record<string, string>): string | null {
  let out = '';
  let cur = '';
  for (const b of bits) {
    cur += b;
    const sym = codeToSymbol[cur];
    if (sym !== undefined) {
      out += sym;
      cur = '';
    }
  }
  return cur === '' ? out : null;
}
