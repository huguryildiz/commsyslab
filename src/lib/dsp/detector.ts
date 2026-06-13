function dist2(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

/** Maximum-likelihood (minimum-distance) detection. Returns the index of the nearest point. */
export function detectML(r: number[], points: number[][]): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = dist2(r, points[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** MAP detection: argmin_i { ||r - s_i||^2 - N0 * ln P(s_i) }. */
export function detectMAP(
  r: number[],
  points: number[][],
  priors: number[],
  n0: number,
): number {
  let best = 0;
  let bestMetric = Infinity;
  for (let i = 0; i < points.length; i++) {
    const p = priors[i] > 0 ? priors[i] : 1e-12;
    const metric = dist2(r, points[i]) - n0 * Math.log(p);
    if (metric < bestMetric) {
      bestMetric = metric;
      best = i;
    }
  }
  return best;
}

/**
 * Binary 1-D MAP decision boundary between s0 and s1 (assumes s0 < s1).
 * x* = (s0+s1)/2 + N0*ln(p0/p1) / (2*(s1-s0)).
 * Reduces to the midpoint when p0 = p1.
 */
export function mapThreshold1D(
  s0: number,
  s1: number,
  p0: number,
  p1: number,
  n0: number,
): number {
  return (s0 + s1) / 2 + (n0 * Math.log(p0 / p1)) / (2 * (s1 - s0));
}
