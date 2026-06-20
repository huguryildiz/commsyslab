// Pure view-model for the "Signal space (Gram-Schmidt)" tab (Proakis §7.1).
// No React. The orthonormalization math lives in @/lib/dsp/gram-schmidt.
import { gramSchmidtTrace } from '@/lib/dsp/gram-schmidt';
import { expandPiecewise, signalLabels, DEFAULT_CUSTOM_AMPLITUDES } from './custom-signals';

/** A named signal set for the preset menu. `custom` carries no amplitudes (uses the editor). */
export interface SigSpacePreset {
  id: string;
  labelKey: string;
  amplitudes: number[][];
}

export const SIGSPACE_PRESETS: SigSpacePreset[] = [
  // Two colinear waveforms ⇒ N = 1 (axis renderer).
  { id: 'antipodal', labelKey: 'modulation.sigspace.preset.antipodal', amplitudes: [[1, 1], [-1, -1]] },
  // Two orthogonal pulses + their negatives ⇒ N = 2 (plane renderer).
  {
    id: 'qpsk',
    labelKey: 'modulation.sigspace.preset.qpsk',
    amplitudes: [[1, 0], [0, 1], [-1, 0], [0, -1]],
  },
  { id: 'orthogonal', labelKey: 'modulation.sigspace.preset.orthogonal', amplitudes: [[1, 1], [1, -1]] },
  // Proakis Example 7.1.1: s₄ dependent ⇒ N = 3 (bars renderer).
  { id: 'example711', labelKey: 'modulation.sigspace.preset.example711', amplitudes: DEFAULT_CUSTOM_AMPLITUDES },
  { id: 'custom', labelKey: 'modulation.sigspace.preset.custom', amplitudes: [] },
];

export type SigSpaceKind = 'axis' | 'plane' | 'bars' | 'degenerate';
export type SigSpacePhase = 'consider' | 'project' | 'normalize';

/** One animation frame of the walkthrough. */
export interface SigSpaceFrame {
  signalIndex: number;
  phase: SigSpacePhase;
  /** Projection index for 'project' frames, else -1. */
  projIndex: number;
  /** Waveform shown as the current residual gₘ for this frame. */
  residual: number[];
  /** How many basis vectors exist in the gallery at this frame. */
  basisCount: number;
  /** Projection coefficient (project frames), else null. */
  coeff: number | null;
  /** Removed component waveform (project frames), else null. */
  component: number[] | null;
  /** Whether this signal ends up dependent (meaningful on the normalize frame). */
  dependent: boolean;
}

export interface SignalSpaceView {
  kind: SigSpaceKind;
  dim: number;
  M: number;
  sps: number;
  labels: string[];
  dependent: boolean[];
  basis: number[][];
  coeffs: number[][];
  energies: number[];
  signals: number[][];
  frames: SigSpaceFrame[];
}

function kindForDim(dim: number): SigSpaceKind {
  if (dim <= 0) return 'degenerate';
  if (dim === 1) return 'axis';
  if (dim === 2) return 'plane';
  return 'bars';
}

export function buildSignalSpaceView(input: {
  presetId: string;
  customAmplitudes: number[][];
  sps: number;
}): SignalSpaceView {
  const { presetId, customAmplitudes, sps } = input;
  const preset = SIGSPACE_PRESETS.find((p) => p.id === presetId);
  const amplitudes =
    presetId === 'custom' || !preset || preset.amplitudes.length === 0
      ? customAmplitudes
      : preset.amplitudes;

  const signals = expandPiecewise(amplitudes, sps);
  const trace = gramSchmidtTrace(signals);
  const M = signals.length;
  const labels = signalLabels(M);
  const dependent = trace.steps.map((s) => s.dependent);
  const energies = signals.map((s) => s.reduce((acc, v) => acc + v * v, 0));

  // Build animation frames: per signal → consider, one frame per projection, normalize.
  const frames: SigSpaceFrame[] = [];
  let basisSoFar = 0; // independent signals seen before the current one
  for (const step of trace.steps) {
    frames.push({
      signalIndex: step.signalIndex,
      phase: 'consider',
      projIndex: -1,
      residual: step.source.slice(),
      basisCount: basisSoFar,
      coeff: null,
      component: null,
      dependent: step.dependent,
    });
    // Show the running residual after removing each projection in turn.
    const partial = step.source.slice();
    step.projections.forEach((p, j) => {
      for (let i = 0; i < partial.length; i++) partial[i] -= p.component[i];
      frames.push({
        signalIndex: step.signalIndex,
        phase: 'project',
        projIndex: j,
        residual: partial.slice(),
        basisCount: basisSoFar,
        coeff: p.coeff,
        component: p.component.slice(),
        dependent: step.dependent,
      });
    });
    if (!step.dependent) basisSoFar += 1;
    frames.push({
      signalIndex: step.signalIndex,
      phase: 'normalize',
      projIndex: -1,
      residual: step.residual.slice(),
      basisCount: basisSoFar,
      coeff: null,
      component: null,
      dependent: step.dependent,
    });
  }

  return {
    kind: kindForDim(trace.dim),
    dim: trace.dim,
    M,
    sps,
    labels,
    dependent,
    basis: trace.basis,
    coeffs: trace.coeffs,
    energies,
    signals,
    frames,
  };
}
