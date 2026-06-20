// Ref: Proakis & Salehi, Communication Systems Engineering §10.5 — system design in the
// presence of channel distortion (amplitude & phase/delay distortion; Eq. 10.5.1/10.5.2).

// Channel transfer function C(f) with amplitude and/or phase distortion (Fig. 10.18).
//  - amplitude distortion: |C(f)| tilts away from a flat response (Fig. 10.18a)
//  - phase distortion: θ_c(f) is nonlinear (quadratic ⇒ linear envelope delay, Fig. 10.18b)
export function channelResponse(
  f: number[],
  ampDistort: number,
  phaseDistort: number,
): { mag: number[]; phase: number[] } {
  const fmax = Math.max(1e-9, ...f.map((v) => Math.abs(v)));
  const mag = f.map((fi) => 1 + ampDistort * (fi / fmax));
  const phase = f.map((fi) => phaseDistort * (fi / fmax) ** 2);
  return { mag, phase };
}

// Envelope (group) delay τ(f) = −(1/2π) dθ_c/df (Eq. 10.5.2), by central difference.
// Constant for linear phase (no delay distortion); varies with f when phase is nonlinear.
export function envelopeDelay(phase: number[], f: number[]): number[] {
  return phase.map((_, i) => {
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(phase.length - 1, i + 1);
    const df = f[i1] - f[i0];
    if (Math.abs(df) < 1e-12) return 0;
    return (-1 / (2 * Math.PI)) * ((phase[i1] - phase[i0]) / df);
  });
}

// Pass a zero-ISI pulse through C(f): DFT → multiply by mag·e^{jθ} → inverse DFT (real
// part). The shifted zero-crossings show how delay distortion reintroduces ISI (Fig. 10.19).
export function distortPulse(rcPulse: number[], mag: number[], phase: number[]): number[] {
  const N = rcPulse.length;
  const Re: number[] = new Array(N);
  const Im: number[] = new Array(N);
  for (let k = 0; k < N; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const ang = (-2 * Math.PI * k * n) / N;
      re += rcPulse[n] * Math.cos(ang);
      im += rcPulse[n] * Math.sin(ang);
    }
    const m = mag[k % mag.length];
    const th = phase[k % phase.length];
    Re[k] = (re * Math.cos(th) - im * Math.sin(th)) * m;
    Im[k] = (re * Math.sin(th) + im * Math.cos(th)) * m;
  }
  const out: number[] = new Array(N).fill(0);
  for (let n = 0; n < N; n++) {
    let re = 0;
    for (let k = 0; k < N; k++) {
      const ang = (2 * Math.PI * k * n) / N;
      re += Re[k] * Math.cos(ang) - Im[k] * Math.sin(ang);
    }
    out[n] = re / N;
  }
  return out;
}

// Transmit/receive filter design for a known channel: split the target raised-cosine
// spectrum and pre-compensate the channel amplitude so that |G_T(f)|·|C(f)|·|G_R(f)| =
// X_rc(f) with zero ISI and maximum SNR (Eq. 10.5.1). With |G_T|=|G_R| the balanced
// solution is |G_T(f)| = |G_R(f)| = sqrt(X_rc(f) / |C(f)|).
export function designFilters(
  C: { mag: number[]; phase: number[] },
  Xrc: number[],
): { gT: number[]; gR: number[] } {
  const g = Xrc.map((x, i) => {
    const c = Math.max(1e-6, C.mag[i] ?? 1);
    return Math.sqrt(Math.max(0, x) / c);
  });
  return { gT: g, gR: g.slice() };
}
