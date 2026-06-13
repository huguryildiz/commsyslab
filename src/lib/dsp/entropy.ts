// Ref: Proakis & Salehi, Communication Systems Engineering §6.1 (6.1.1 Measure of
// Information, 6.1.2 Joint & Conditional Entropy). Bkz. docs/book-reference.md.

/** Self-information I(p) = −log2(p), in bits. p≤0 returns 0 (a never-occurring symbol conveys no surprise). */
export function selfInfo(p: number): number {
  return p <= 0 ? 0 : -Math.log2(p);
}

/** Entropy H(S) = −Σ p·log2(p), bits/symbol. Zero-probability terms are skipped (0·log0 = 0). */
export function entropy(probs: number[]): number {
  let h = 0;
  for (const p of probs) if (p > 0) h -= p * Math.log2(p);
  return h;
}

/** Maximum entropy log2(K) for a K-symbol alphabet (equiprobable). */
export function maxEntropy(K: number): number {
  return Math.log2(K);
}

/** Binary entropy H_b(p) = −p log2 p − (1−p) log2(1−p); 0 at p∈{0,1}. */
export function binaryEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

/** Entropy of the n-th extension of a DMS: H(Sⁿ) = n·H(S). */
export function extendedEntropy(probs: number[], n: number): number {
  return n * entropy(probs);
}
