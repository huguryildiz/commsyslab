/** Eb/N0 (dB) -> linear ratio. */
export function ebN0Linear(ebN0Db: number): number {
  return 10 ** (ebN0Db / 10);
}

/** Noise PSD N0 from Eb/N0 (dB) and energy-per-bit Eb: N0 = Eb / (Eb/N0)_lin. */
export function n0FromEbN0Db(ebN0Db: number, eb: number): number {
  return eb / ebN0Linear(ebN0Db);
}

/** Per-dimension noise standard deviation: sigma = sqrt(N0/2). */
export function sigmaFromN0(n0: number): number {
  return Math.sqrt(n0 / 2);
}

/** One standard-normal sample via Box-Muller, drawn from rng() in [0,1). */
export function gaussian(rng: () => number): number {
  let u = rng();
  if (u < 1e-12) u = 1e-12;
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Add i.i.d. N(0, sigma^2) noise to each dimension of a signal-space point. */
export function addAwgn(point: number[], sigma: number, rng: () => number): number[] {
  if (sigma === 0) return point.slice();
  return point.map((c) => c + sigma * gaussian(rng));
}
