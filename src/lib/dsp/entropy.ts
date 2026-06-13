/**
 * Calculate Shannon entropy of a probability distribution.
 * H = -Σ p_i * log₂(p_i)
 * @param probs - probability array (assumed to sum to 1)
 * @returns entropy in bits
 */
export function entropy(probs: number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p > 0) {
      h -= p * Math.log2(p);
    }
  }
  return h;
}
