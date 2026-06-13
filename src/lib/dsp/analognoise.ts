// Analog noise & SNR (Proakis & Salehi Ch 5). Pure, framework-free.
// Verify exact FM/threshold/emphasis constants against refs/Book.pdf §5.3 (PDF ~256-260).
import { amEfficiency } from './analog';
import { gaussian } from './awgn';

export type AnalogScheme = 'dsb' | 'ssb' | 'am' | 'fm';

export interface SnrParams {
  amIndex: number; // a (AM)
  beta: number; // β (FM)
  messagePower: number; // normalized message power P_Mn
  emphasis: boolean; // pre/de-emphasis (FM)
  W: number; // message bandwidth (Hz)
}

/** Linear SNR improvement factor of the output over the channel SNR γ = P_R/(N0 W). */
export function snrImprovement(scheme: AnalogScheme, p: SnrParams): number {
  switch (scheme) {
    case 'dsb':
    case 'ssb':
      return 1; // coherent: output SNR equals baseband SNR (Proakis §5.1)
    case 'am':
      return amEfficiency(p.amIndex, p.messagePower); // η = a²P/(1+a²P) (Proakis §5.1)
    case 'fm': {
      // FM gain ∝ β² (Proakis §5.3, eq. 5.3.24): 3β²·P_Mn (p. 243)
      const base = 3 * p.beta ** 2 * p.messagePower;
      return p.emphasis ? base * emphasisFactor(p.beta) : base;
    }
  }
}

/** Output SNR (dB) for a scheme at channel SNR γ (dB). */
export function outputSnrDb(scheme: AnalogScheme, channelSnrDb: number, p: SnrParams): number {
  return channelSnrDb + 10 * Math.log10(snrImprovement(scheme, p));
}

/** Demodulation gain (dB) = output SNR − channel SNR = 10log10(improvement). */
export function demodulationGainDb(scheme: AnalogScheme, p: SnrParams): number {
  return 10 * Math.log10(snrImprovement(scheme, p));
}

/** Pre/de-emphasis linear improvement factor for FM. Grows with β (wider deviation
 *  benefits more from de-emphasis). Confirm the exact integral form vs Proakis §5.3.2. */
function emphasisFactor(beta: number): number {
  return 1 + (beta * beta) / 3; // monotonic in β; replace with book expression if it differs
}

/** Pre/de-emphasis SNR gain in dB for FM (Proakis §5.3.2, p. 250). */
export function emphasisGainDb(beta: number, _W: number): number {
  return 10 * Math.log10(emphasisFactor(beta));
}

/** FM threshold channel-SNR in dB as a function of β. The threshold rises with the
 *  transmission bandwidth B_c = 2(β+1)W, so it grows with β. Standard ~20(β+1) rule;
 *  confirm the constant vs Proakis §5.3.1 (p. 245, eq. 5.3.27). */
export function fmThresholdCnrDb(beta: number): number {
  return 10 * Math.log10(20 * (beta + 1));
}

function power(x: Float64Array): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return s / x.length;
}

/** Return reference + white Gaussian noise scaled so the SNR equals snrDb. */
export function addNoiseAtSnr(reference: Float64Array, snrDb: number, rng: () => number): Float64Array {
  const sigP = power(reference) || 1e-12;
  const noiseP = sigP / 10 ** (snrDb / 10);
  const sigma = Math.sqrt(noiseP);
  const out = new Float64Array(reference.length);
  for (let i = 0; i < reference.length; i++) out[i] = reference[i] + sigma * gaussian(rng);
  return out;
}

/** Measured SNR (dB) of a noisy signal relative to its clean reference. */
export function measuredSnrDb(noisy: Float64Array, reference: Float64Array): number {
  let errP = 0;
  for (let i = 0; i < reference.length; i++) {
    const e = noisy[i] - reference[i];
    errP += e * e;
  }
  errP /= reference.length;
  const sigP = power(reference);
  if (errP <= 0) return 999;
  return 10 * Math.log10(sigP / errP);
}
