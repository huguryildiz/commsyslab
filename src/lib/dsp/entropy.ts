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

// Ref: Proakis & Salehi §12.1.2–12.1.3. A 2-D joint PMF is pxy[x][y] = p(X=x, Y=y)
// (rows = X, cols = Y). Callers pass a normalized matrix; zero terms are skipped (0·log0 = 0).

/** Joint entropy H(X,Y) = −ΣΣ p(x,y) log2 p(x,y), bits. Eq. 12.1.5. */
export function jointEntropy(pxy: number[][]): number {
  let h = 0;
  for (const row of pxy) for (const p of row) if (p > 0) h -= p * Math.log2(p);
  return h;
}

/** Marginal PMFs px[x] = Σ_y p(x,y) and py[y] = Σ_x p(x,y). */
export function marginals(pxy: number[][]): { px: number[]; py: number[] } {
  const nx = pxy.length;
  const ny = pxy[0]?.length ?? 0;
  const px = new Array<number>(nx).fill(0);
  const py = new Array<number>(ny).fill(0);
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      px[x] += pxy[x][y];
      py[y] += pxy[x][y];
    }
  }
  return { px, py };
}

/**
 * Conditional entropies via the chain rule (Eq. 12.1.8–12.1.9):
 * H(X|Y) = H(X,Y) − H(Y) and H(Y|X) = H(X,Y) − H(X).
 */
export function conditionalEntropies(pxy: number[][]): {
  hXgivenY: number;
  hYgivenX: number;
} {
  const { px, py } = marginals(pxy);
  const hxy = jointEntropy(pxy);
  return { hXgivenY: hxy - entropy(py), hYgivenX: hxy - entropy(px) };
}

/** Mutual information I(X;Y) = ΣΣ p(x,y) log2( p(x,y) / (p(x)p(y)) ), bits. Eq. 12.1.16. */
export function mutualInformationJoint(pxy: number[][]): number {
  const { px, py } = marginals(pxy);
  let I = 0;
  for (let x = 0; x < pxy.length; x++) {
    for (let y = 0; y < pxy[x].length; y++) {
      const p = pxy[x][y];
      if (p > 0 && px[x] > 0 && py[y] > 0) I += p * Math.log2(p / (px[x] * py[y]));
    }
  }
  return I;
}
