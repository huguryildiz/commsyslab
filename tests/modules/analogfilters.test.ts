import { describe, it, expect } from 'vitest';
import {
  chebyT,
  butterworthMag,
  butterworthResponse,
  chebyshev1Mag,
  chebyshev2Mag,
} from '@/lib/dsp/analogfilters';

const near = (a: number, b: number, eps = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('chebyT (Chebyshev polynomial of the first kind)', () => {
  it('matches the low-order closed forms', () => {
    for (const x of [-1, -0.4, 0, 0.3, 1, 2]) {
      near(chebyT(0, x), 1);
      near(chebyT(1, x), x);
      near(chebyT(2, x), 2 * x * x - 1);
      near(chebyT(3, x), 4 * x * x * x - 3 * x);
    }
  });

  it('satisfies T_n(1) = 1 and T_n(-1) = (-1)^n', () => {
    for (let n = 0; n <= 8; n++) {
      near(chebyT(n, 1), 1);
      near(chebyT(n, -1), (-1) ** n);
    }
  });

  it('grows for |x| > 1 (cosh branch): T_2(2) = 7, T_3(2) = 26', () => {
    near(chebyT(2, 2), 7);
    near(chebyT(3, 2), 26);
  });
});

describe('butterworthMag', () => {
  it('is unity at DC and -3 dB (1/√2) at the cutoff for every order', () => {
    for (const n of [1, 2, 4, 8]) {
      near(butterworthMag(0, 30, n), 1);
      near(butterworthMag(30, 30, n), 1 / Math.SQRT2, 1e-9);
    }
  });

  it('is maximally flat and monotonically decreasing', () => {
    let prev = Infinity;
    for (let f = 0; f <= 120; f += 2) {
      const m = butterworthMag(f, 30, 4);
      expect(m).toBeLessThanOrEqual(prev + 1e-12);
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(1 + 1e-12);
      prev = m;
    }
  });

  it('rolls off faster as the order increases (steeper stopband)', () => {
    const low = butterworthMag(60, 30, 2);
    const high = butterworthMag(60, 30, 8);
    expect(high).toBeLessThan(low);
  });
});

describe('chebyshev1Mag (equiripple passband)', () => {
  it('hits the ripple edge 10^(-Rp/20) exactly at the cutoff', () => {
    const rp = 1; // dB
    for (const n of [1, 2, 3, 5]) {
      near(chebyshev1Mag(30, 30, n, rp), Math.pow(10, -rp / 20), 1e-9);
    }
  });

  it('passband magnitude oscillates within [10^(-Rp/20), 1]', () => {
    const rp = 1.5;
    const floor = Math.pow(10, -rp / 20);
    for (let f = 0; f <= 30; f += 0.5) {
      const m = chebyshev1Mag(f, 30, 5, rp);
      expect(m).toBeGreaterThanOrEqual(floor - 1e-9);
      expect(m).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('starts at unity (DC) for odd order and at the ripple floor for even order', () => {
    const rp = 1;
    near(chebyshev1Mag(0, 30, 3, rp), 1, 1e-9); // odd: T_n(0) = 0
    near(chebyshev1Mag(0, 30, 4, rp), Math.pow(10, -rp / 20), 1e-9); // even: |T_n(0)| = 1
  });
});

describe('chebyshev2Mag (equiripple stopband, flat passband)', () => {
  it('is unity at DC (maximally flat passband)', () => {
    for (const n of [2, 3, 5]) {
      near(chebyshev2Mag(0, 30, n, 40), 1, 1e-9);
    }
  });

  it('reaches the stopband attenuation 10^(-Rs/20) exactly at the cutoff', () => {
    const rs = 40; // dB
    for (const n of [2, 3, 5]) {
      near(chebyshev2Mag(30, 30, n, rs), Math.pow(10, -rs / 20), 1e-9);
    }
  });

  it('stays at or below the stopband bound 10^(-Rs/20) beyond the cutoff', () => {
    const rs = 40;
    const bound = Math.pow(10, -rs / 20);
    for (let f = 30; f <= 200; f += 1) {
      expect(chebyshev2Mag(f, 30, 4, rs)).toBeLessThanOrEqual(bound + 1e-9);
    }
  });
});

describe('butterworthResponse (LPF/HPF/BPF/BSF magnitudes)', () => {
  it('lowpass: unity at DC, -3 dB at fc, →0 well above', () => {
    near(butterworthResponse('lpf', 0, 30, 0, 4), 1);
    near(butterworthResponse('lpf', 30, 30, 0, 4), 1 / Math.SQRT2, 1e-9);
    expect(butterworthResponse('lpf', 300, 30, 0, 4)).toBeLessThan(0.01);
  });

  it('highpass: zero at DC, -3 dB at fc, →1 well above', () => {
    near(butterworthResponse('hpf', 0, 30, 0, 4), 0);
    near(butterworthResponse('hpf', 30, 30, 0, 4), 1 / Math.SQRT2, 1e-9);
    expect(butterworthResponse('hpf', 300, 30, 0, 4)).toBeGreaterThan(0.99);
  });

  it('bandpass: ~unity at center f0=√(fc·fc2), -3 dB at the band edges', () => {
    const fc = 40, fc2 = 90, f0 = Math.sqrt(fc * fc2);
    expect(butterworthResponse('bpf', f0, fc, fc2, 2)).toBeGreaterThan(0.99);
    near(butterworthResponse('bpf', fc, fc, fc2, 2), 1 / Math.SQRT2, 1e-6);
    near(butterworthResponse('bpf', fc2, fc, fc2, 2), 1 / Math.SQRT2, 1e-6);
    near(butterworthResponse('bpf', 0, fc, fc2, 2), 0);
  });

  it('bandstop: zero at center, -3 dB at the band edges, →1 far away', () => {
    const fc = 40, fc2 = 90, f0 = Math.sqrt(fc * fc2);
    near(butterworthResponse('bsf', f0, fc, fc2, 2), 0, 1e-6);
    near(butterworthResponse('bsf', fc, fc, fc2, 2), 1 / Math.SQRT2, 1e-6);
    expect(butterworthResponse('bsf', 1000, fc, fc2, 2)).toBeGreaterThan(0.99);
    near(butterworthResponse('bsf', 0, fc, fc2, 2), 1, 1e-6);
  });
});
