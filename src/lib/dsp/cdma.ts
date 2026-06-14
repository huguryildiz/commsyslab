/**
 * DS-CDMA multiple access. Many users share the band with distinct PN codes; each
 * contributes multiple-access interference (MAI). The standard Gaussian
 * approximation (Pursley) gives the BER; unequal received powers create the
 * near-far problem. Proakis & Salehi §10.3.3.
 */
import { qfunc } from '@/lib/dsp/math';

/**
 * Signal-to-interference ratio (interference only) for N_u equal-power users with
 * processing gain L_c: SIR = 3·L_c/((N_u−1)·Γ), Γ ≥ 1 the near-far power ratio of
 * the interferers (Γ = 1 = perfect power control). Infinite for a single user.
 */
export function cdmaSir(Lc: number, nUsers: number, nearFarRatio: number): number {
  if (nUsers <= 1) return Infinity;
  return (3 * Lc) / ((nUsers - 1) * nearFarRatio);
}

/**
 * CDMA BPSK BER (Gaussian/Pursley approximation): P_e = Q(√SINR) with
 * 1/SINR = (N_u−1)·Γ/(3·L_c) + 1/(2·γ_b), γ_b = E_b/N_0. A single user reduces to
 * AWGN BPSK Q(√(2γ_b)). Proakis §10.3.3.
 */
export function cdmaBer(Lc: number, nUsers: number, ebN0Db: number, nearFarRatio: number): number {
  const gammaB = 10 ** (ebN0Db / 10);
  const invSinr = ((nUsers - 1) * nearFarRatio) / (3 * Lc) + 1 / (2 * gammaB);
  return qfunc(Math.sqrt(1 / invSinr));
}

/**
 * Largest number of users whose BER still meets the target, for the given
 * processing gain, E_b/N_0, and near-far ratio. Returns 0 if even one user fails.
 */
export function userCapacity(
  Lc: number,
  ebN0Db: number,
  targetBer: number,
  nearFarRatio: number,
): number {
  if (cdmaBer(Lc, 1, ebN0Db, nearFarRatio) > targetBer) return 0;
  let n = 1;
  while (n < 5000 && cdmaBer(Lc, n + 1, ebN0Db, nearFarRatio) <= targetBer) n++;
  return n;
}
