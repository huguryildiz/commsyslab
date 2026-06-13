import { signalBandwidth, type Tone } from './signals';

export interface SpectralLine {
  freq: number;
  mag: number;
}

/** Baseband line spectrum: each cosine -> two lines at +/-freq, magnitude amp/2.
 *  A DC term (freq 0) yields a single line of magnitude |amp|. */
export function baselineLines(tones: Tone[]): SpectralLine[] {
  const lines: SpectralLine[] = [];
  for (const tone of tones) {
    if (tone.freq === 0) {
      lines.push({ freq: 0, mag: Math.abs(tone.amp) });
    } else {
      lines.push({ freq: tone.freq, mag: Math.abs(tone.amp) / 2 });
      lines.push({ freq: -tone.freq, mag: Math.abs(tone.amp) / 2 });
    }
  }
  return lines;
}

/** Sampled-spectrum replicas: baseband lines shifted by n*fs for n in [-numReplicas, numReplicas]. */
export function replicaLines(tones: Tone[], fs: number, numReplicas: number): SpectralLine[] {
  const base = baselineLines(tones);
  const out: SpectralLine[] = [];
  for (let n = -numReplicas; n <= numReplicas; n++) {
    for (const l of base) out.push({ freq: l.freq + n * fs, mag: l.mag });
  }
  return out;
}

/** Aliasing occurs when the bandwidth exceeds the folding frequency fs/2 (i.e., fs < 2W). */
export function hasAliasing(tones: Tone[], fs: number): boolean {
  return signalBandwidth(tones) > fs / 2;
}
