/**
 * Web Audio engine for the Filter Studio: play a source (waveform / multi-tone
 * / noise) through a BiquadFilter so the student hears the filtering live.
 */

import type { StudioFilterType, StudioSource } from '@/modules/fourier/filterStudio';

export interface BiquadSettings {
  type: BiquadFilterType;
  frequency: number;
  Q: number;
}

/** Map a studio filter type + cutoffs to Web Audio BiquadFilter settings. */
export function biquadParams(type: StudioFilterType, fc: number, fc2: number): BiquadSettings {
  switch (type) {
    case 'lpf': return { type: 'lowpass', frequency: fc, Q: 0.707 };
    case 'hpf': return { type: 'highpass', frequency: fc, Q: 0.707 };
    case 'bpf':
    case 'bsf': {
      const f1 = Math.min(fc, fc2), f2 = Math.max(fc, fc2);
      const f0 = Math.sqrt(f1 * f2), B = Math.max(f2 - f1, 1e-6);
      return { type: type === 'bpf' ? 'bandpass' : 'notch', frequency: f0, Q: f0 / B };
    }
  }
}

type Ctor = typeof AudioContext;
function ctxCtor(): Ctor | null {
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}
export function audioSupported(): boolean {
  return typeof window !== 'undefined' && ctxCtor() !== null;
}

export interface FilteredSourceOpts {
  source: StudioSource;
  /** One cycle (waves) or a representative buffer (multi-tone) of normalized samples. */
  wavetable: number[];
  pitchHz: number;          // loop pitch for wavetable sources
  filter: BiquadSettings;
  gain?: number;
}

export interface FilteredSourceHandle {
  setFilter: (s: BiquadSettings) => void;
  setBypass: (bypass: boolean) => void;
  stop: () => void;
}

/** Start playback; returns a live handle. Must be called from a user gesture. */
export function playFilteredSource(opts: FilteredSourceOpts): FilteredSourceHandle | null {
  const Ctor = ctxCtor();
  if (!Ctor) return null;
  const ctx = new Ctor();
  const sr = ctx.sampleRate;
  const gainVal = opts.gain ?? 0.18;

  // Build a ~2 s looping buffer.
  const frames = Math.floor(sr * 2);
  const buffer = ctx.createBuffer(1, frames, sr);
  const ch = buffer.getChannelData(0);
  if (opts.source === 'white' || opts.source === 'pink') {
    let prev = 0;
    for (let i = 0; i < frames; i++) {
      const wn = Math.random() * 2 - 1;
      prev = 0.97 * prev + 0.03 * wn;
      ch[i] = (opts.source === 'pink' ? prev * 3 : wn) * gainVal;
    }
  } else {
    const tbl = opts.wavetable.length ? opts.wavetable : [0];
    const peak = tbl.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-9);
    const cycleFrames = Math.max(1, Math.floor(sr / Math.max(opts.pitchHz, 20)));
    for (let i = 0; i < frames; i++) {
      const phase = (i % cycleFrames) / cycleFrames;
      ch[i] = (tbl[Math.floor(phase * tbl.length) % tbl.length] / peak) * gainVal;
    }
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  const biquad = ctx.createBiquadFilter();
  biquad.type = opts.filter.type;
  biquad.frequency.value = opts.filter.frequency;
  biquad.Q.value = opts.filter.Q;

  // dry/wet switch via two gains feeding the destination.
  const wet = ctx.createGain(); wet.gain.value = 1;
  const dry = ctx.createGain(); dry.gain.value = 0;
  src.connect(biquad); biquad.connect(wet); wet.connect(ctx.destination);
  src.connect(dry); dry.connect(ctx.destination);
  src.start();

  return {
    setFilter: (s) => {
      biquad.type = s.type;
      biquad.frequency.setTargetAtTime(s.frequency, ctx.currentTime, 0.01);
      biquad.Q.setTargetAtTime(s.Q, ctx.currentTime, 0.01);
    },
    setBypass: (bypass) => {
      wet.gain.setTargetAtTime(bypass ? 0 : 1, ctx.currentTime, 0.01);
      dry.gain.setTargetAtTime(bypass ? 1 : 0, ctx.currentTime, 0.01);
    },
    stop: () => { try { src.stop(); } catch { /* already stopped */ } void ctx.close(); },
  };
}
