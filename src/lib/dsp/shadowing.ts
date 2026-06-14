/**
 * Large-scale log-normal shadowing and its effect on outage performance.
 * Proakis & Salehi §10.1.1 (shadowing model, Eq. 10.1.11–10.1.13).
 */

/** dB → linear power ratio. */
function lin(db: number): number {
  return 10 ** (db / 10);
}

/**
 * Shadowing PDF in the dB domain. The dB path loss X = 10·log10(g) is Gaussian
 * with mean `muDb` and standard deviation `sigmaDb` (typical cellular 5–12 dB).
 * Proakis Eq. (10.1.13).
 */
export function shadowingPdfDb(xDb: number, muDb: number, sigmaDb: number): number {
  const z = (xDb - muDb) / sigmaDb;
  return Math.exp(-0.5 * z * z) / (sigmaDb * Math.sqrt(2 * Math.PI));
}

/**
 * Outage probability for Rayleigh fading (no shadowing): the probability that the
 * instantaneous SNR γ falls below the threshold γ_th given average SNR γ̄:
 *   P_out = 1 − exp(−γ_th/γ̄).
 */
export function rayleighOutage(gammaThDb: number, gammaBarDb: number): number {
  return 1 - Math.exp(-lin(gammaThDb) / lin(gammaBarDb));
}
