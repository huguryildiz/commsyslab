import { describe, it, expect } from 'vitest';
import { biquadParams } from '@/lib/audio/filter-audio';

describe('biquadParams', () => {
  it('maps studio filter types to Web Audio biquad types', () => {
    expect(biquadParams('lpf', 200, 500).type).toBe('lowpass');
    expect(biquadParams('hpf', 200, 500).type).toBe('highpass');
    expect(biquadParams('bpf', 200, 500).type).toBe('bandpass');
    expect(biquadParams('bsf', 200, 500).type).toBe('notch');
  });

  it('LPF/HPF use the cutoff as frequency', () => {
    expect(biquadParams('lpf', 200, 500).frequency).toBe(200);
    expect(biquadParams('hpf', 350, 500).frequency).toBe(350);
  });

  it('BPF/BSF center on √(fc·fc2) with Q = f0/B', () => {
    const r = biquadParams('bpf', 100, 400);
    expect(r.frequency).toBeCloseTo(200, 6); // √(100·400)
    expect(r.Q).toBeCloseTo(200 / 300, 6);   // f0 / (fc2−fc)
  });
});
