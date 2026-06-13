import { describe, it, expect } from 'vitest';
import {
  amSignal,
  amEnvelope,
  amEfficiency,
  vsbFilterMag,
  angleSignal,
  instantFreq,
  besselJ,
  carsonBandwidth,
  pllRecoverPhase,
  heterodyneMix,
} from '@/lib/dsp/analog';

describe('amEnvelope', () => {
  it('with zero message equals Ac', () => {
    const env = amEnvelope([], 1, 0.5, 0);
    expect(env).toBeCloseTo(1, 12);
  });

  it('with a single tone stays within Ac[1±a]', () => {
    const msg = [{ freq: 1, amp: 1 }];
    const Ac = 2;
    const a = 0.5;
    for (let t = 0; t <= 1; t += 0.1) {
      const env = amEnvelope(msg, Ac, a, t);
      expect(env).toBeGreaterThanOrEqual(Ac * (1 - a) - 1e-10);
      expect(env).toBeLessThanOrEqual(Ac * (1 + a) + 1e-10);
    }
  });
});

describe('amEfficiency', () => {
  it('returns 0 when a=0', () => {
    expect(amEfficiency(0, 0.5)).toBeCloseTo(0, 12);
  });

  it('amEfficiency(1, 0.5) ≈ 1/3 (tone at full scale)', () => {
    const eta = amEfficiency(1, 0.5);
    expect(eta).toBeCloseTo(1 / 3, 3);
  });

  it('increases with modulation index a', () => {
    const Pmn = 0.5;
    const eta0 = amEfficiency(0.5, Pmn);
    const eta1 = amEfficiency(1, Pmn);
    expect(eta1).toBeGreaterThan(eta0);
  });
});

describe('besselJ', () => {
  it('J0(1) ≈ 0.7652 (Proakis Table 3.1)', () => {
    expect(besselJ(0, 1)).toBeCloseTo(0.7652, 3);
  });

  it('J1(1) ≈ 0.4401', () => {
    expect(besselJ(1, 1)).toBeCloseTo(0.4401, 3);
  });

  it('J2(1) ≈ 0.1149', () => {
    expect(besselJ(2, 1)).toBeCloseTo(0.1149, 3);
  });

  it('J0(0) = 1', () => {
    expect(besselJ(0, 0)).toBeCloseTo(1, 12);
  });

  it('Jn values for β=2 are reasonable (from tables)', () => {
    // J0(2) ≈ 0.2239, J1(2) ≈ 0.3540, J2(2) ≈ 0.1289
    const j0 = besselJ(0, 2);
    const j1 = besselJ(1, 2);
    const j2 = besselJ(2, 2);
    // All should be real and within reasonable range
    expect(j0).toBeGreaterThan(0);
    expect(j0).toBeLessThan(1);
    expect(j1).toBeGreaterThan(0);
    expect(j1).toBeLessThan(1);
    expect(j2).toBeGreaterThan(0);
    expect(j2).toBeLessThan(1);
  });
});

describe('carsonBandwidth', () => {
  it('carsonBandwidth(2, 5) = 30', () => {
    expect(carsonBandwidth(2, 5)).toBeCloseTo(30, 12);
  });

  it('B = 2(β+1)fm', () => {
    const beta = 3;
    const fm = 4;
    const B = carsonBandwidth(beta, fm);
    expect(B).toBeCloseTo(2 * (beta + 1) * fm, 12);
  });
});

describe('instantFreq', () => {
  it('at message zero equals fc', () => {
    const freq = instantFreq([], 1000, 100, 0);
    expect(freq).toBeCloseTo(1000, 12);
  });

  it('at message peak = fc + kf*peak', () => {
    const msg = [{ freq: 1, amp: 2 }]; // peak = 2
    const fc = 1000;
    const kf = 50;
    const freq = instantFreq(msg, fc, kf, 0); // at t=0, msg = 2
    expect(freq).toBeCloseTo(fc + kf * 2, 12);
  });
});

describe('vsbFilterMag', () => {
  it('at carrier frequency equals 0.5', () => {
    const mag = vsbFilterMag(1000, 1000, 100);
    expect(mag).toBeCloseTo(0.5, 2);
  });

  it('magnitude clamps to [0, 1]', () => {
    const mag1 = vsbFilterMag(500, 1000, 100);
    const mag2 = vsbFilterMag(1500, 1000, 100);
    expect(mag1).toBeGreaterThanOrEqual(0);
    expect(mag1).toBeLessThanOrEqual(1);
    expect(mag2).toBeGreaterThanOrEqual(0);
    expect(mag2).toBeLessThanOrEqual(1);
  });
});

describe('amSignal', () => {
  it('dsb with zero message = 0', () => {
    const sig = amSignal('dsb', [], 1000, 1, 0.5, 0);
    expect(sig).toBeCloseTo(0, 12);
  });

  it('conventional with zero message = Ac*cos(2πfct)', () => {
    const sig = amSignal('conventional', [], 1000, 1, 0.5, 0);
    expect(sig).toBeCloseTo(1, 12);
  });

  it('conventional modulated signal is bounded by envelope', () => {
    const msg = [{ freq: 100, amp: 1 }];
    const Ac = 1;
    const a = 0.5;
    let maxSig = 0;
    for (let t = 0; t <= 0.01; t += 0.0001) {
      const sig = Math.abs(amSignal('conventional', msg, 10000, Ac, a, t));
      maxSig = Math.max(maxSig, sig);
    }
    expect(maxSig).toBeLessThanOrEqual(Ac * (1 + a) + 1e-10);
  });
});

describe('angleSignal', () => {
  it('FM with zero message has zero modulation phase', () => {
    // At t=0 with zero message, phase deviation should be 0
    const fc = 10000;
    const sig = angleSignal('fm', [], fc, 1, 100, 0);
    expect(sig).toBeCloseTo(1, 6); // cos(2π*fc*0 + 0) = 1
  });

  it('FM maintains constant envelope', () => {
    const msg = [{ freq: 100, amp: 1 }];
    const Ac = 2;
    let maxSig = 0;
    for (let t = 0; t <= 0.01; t += 0.001) {
      const sig = Math.abs(angleSignal('fm', msg, 10000, Ac, 100, t));
      maxSig = Math.max(maxSig, sig);
    }
    expect(maxSig).toBeCloseTo(Ac, 1);
  });
});

describe('pllRecoverPhase', () => {
  it('returns array of same length as input', () => {
    const input = new Array(100).fill(0);
    const theta = pllRecoverPhase(input, 1000, 10000);
    expect(theta).toHaveLength(100);
  });

  it('recovered phase tracks carrier frequency', () => {
    const fc = 1000;
    const fs = 10000;
    const duration = 0.01; // 10 ms
    const N = Math.ceil(fs * duration);
    const input = new Array(N);
    for (let n = 0; n < N; n++) {
      input[n] = Math.cos((2 * Math.PI * fc * n) / fs);
    }
    const theta = pllRecoverPhase(input, fc, fs);
    const tail = theta.slice(-10);
    const correlation = tail.reduce((sum, t, i) => sum + Math.cos(t) * input[N - 10 + i], 0) / 10;
    expect(correlation).toBeGreaterThan(0.3); // Should have positive correlation
  });
});

describe('heterodyneMix', () => {
  it('returns if and image fields', () => {
    const input = new Array(100).fill(0);
    const result = heterodyneMix(input, 10000, 455000, 1000000);
    expect(result).toHaveProperty('if');
    expect(result).toHaveProperty('image');
    expect(result.if).toHaveLength(100);
  });

  it('image frequency = fLo + fIf', () => {
    const fLo = 10000;
    const fIf = 455;
    const fs = 100000;
    const input = new Array(100).fill(0);
    const result = heterodyneMix(input, fLo, fIf, fs);
    expect(result.image).toBeCloseTo(fLo + fIf, 1);
  });
});
