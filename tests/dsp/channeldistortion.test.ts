import { describe, it, expect } from 'vitest';
import { channelResponse, envelopeDelay, distortPulse, designFilters } from '@/lib/dsp/channeldistortion';

// Ref: Proakis & Salehi §10.5.
describe('channel distortion (§10.5)', () => {
  it('flat channel ⇒ |C|=1 and zero phase', () => {
    const c = channelResponse([-1, 0, 1], 0, 0);
    c.mag.forEach((m) => expect(m).toBeCloseTo(1, 6));
    c.phase.forEach((p) => expect(p).toBeCloseTo(0, 6));
  });

  it('linear phase ⇒ constant envelope delay (Eq. 10.5.2)', () => {
    const f = [-2, -1, 0, 1, 2];
    const phase = f.map((fi) => -3 * fi); // linear in f
    const tau = envelopeDelay(phase, f);
    const mid = tau.slice(1, -1); // ignore one-sided edges
    mid.forEach((v) => expect(v).toBeCloseTo(mid[0], 6));
  });

  it('nonlinear (quadratic) phase ⇒ envelope delay varies with f', () => {
    const f = [-2, -1, 0, 1, 2];
    const { phase } = channelResponse(f, 0, 1); // quadratic phase
    const tau = envelopeDelay(phase, f);
    expect(Math.abs(tau[1] - tau[3])).toBeGreaterThan(1e-3);
  });

  it('flat channel ⇒ distortPulse ≈ identity', () => {
    const p = [0, 0.2, 1, 0.2, 0];
    const n = p.length;
    const out = distortPulse(p, new Array(n).fill(1), new Array(n).fill(0));
    out.forEach((v, i) => expect(v).toBeCloseTo(p[i], 4));
  });

  it('designFilters reconstructs X_rc through the channel (Eq. 10.5.1)', () => {
    const C = { mag: [1, 1.5, 1, 0.5, 1], phase: [0, 0, 0, 0, 0] };
    const Xrc = [0.2, 0.6, 1, 0.6, 0.2];
    const { gT, gR } = designFilters(C, Xrc);
    Xrc.forEach((x, i) => expect(gT[i] * C.mag[i] * gR[i]).toBeCloseTo(x, 6));
  });
});
