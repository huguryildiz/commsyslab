// Analog-waveform link source: sample (Ch4) -> quantize + PCM (Ch6) -> bits, and back.
import { sample } from '@/lib/dsp/sampling';
import { quantizeSignal, levelValues, sqnrMeasuredDb, type QuantizerType } from '@/lib/dsp/quantize';
import { pcmStream, indexFromCodeword, type PcmCoding } from '@/lib/dsp/pcm';
import type { Tone } from '@/lib/dsp/signals';
import type { Bit } from './sources';

export interface AnalogSourceParams {
  tones: Tone[];
  fs: number; // sample rate (Hz)
  tEnd: number; // window [0, tEnd] seconds
  mMax: number; // quantizer full-scale
  bits: number; // bits per sample (R)
  type: QuantizerType;
  coding: PcmCoding;
}

export interface AnalogMeta {
  bits: number;
  mMax: number;
  type: QuantizerType;
  coding: PcmCoding;
  sampleCount: number;
}

export interface AnalogEncoded {
  original: number[]; // sampled signal values
  times: number[];
  quantized: number[]; // tx-side quantized levels
  bits: Bit[];
  meta: AnalogMeta;
}

/** Sample -> quantize -> PCM-encode the waveform into a flat bitstream. */
export function encodeAnalog(p: AnalogSourceParams): AnalogEncoded {
  const s = sample(p.tones, p.fs, 0, p.tEnd);
  const quantized = quantizeSignal(s.values, p.mMax, p.bits, p.type);
  const bits = pcmStream(s.values, p.mMax, p.bits, p.type, p.coding);
  return {
    original: s.values,
    times: s.times,
    quantized,
    bits,
    meta: { bits: p.bits, mMax: p.mMax, type: p.type, coding: p.coding, sampleCount: s.values.length },
  };
}

/** Decode a PCM bitstream back into reconstructed quantizer levels. */
export function decodeAnalog(bits: Bit[], meta: AnalogMeta): number[] {
  const levels = levelValues(meta.mMax, meta.bits, meta.type);
  const out: number[] = [];
  for (let s = 0; s < meta.sampleCount; s++) {
    const word = bits.slice(s * meta.bits, s * meta.bits + meta.bits);
    if (word.length < meta.bits) break;
    const idx = indexFromCodeword(word, meta.coding);
    out.push(levels[idx]);
  }
  return out;
}

/** SQNR (dB) of the recovered waveform vs the original (Proakis §6.6). */
export function analogSqnrDb(original: number[], recovered: number[]): number {
  return sqnrMeasuredDb(original, recovered);
}
