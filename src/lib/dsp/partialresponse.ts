// Ref: Proakis & Salehi, Communication Systems Engineering §10.3.2 (partial-response
// signaling) and §10.4 (detection of partial-response signals).
import { sinc, qfunc } from './math';

// ── §10.3.2  Controlled-ISI (partial-response) pulses ───────────────────────

// Duobinary pulse, x(nT)=1 for n=0,1 (Eq. 10.3.24). With T=1/2W:
//   x(t) = sinc(2Wt) + sinc(2Wt − 1)                                 (Eq. 10.3.28)
export function duobinaryPulse(W: number, t: number[]): number[] {
  return t.map((ti) => sinc(2 * W * ti) + sinc(2 * W * ti - 1));
}

// Duobinary magnitude spectrum: |X(f)| = (1/W)·cos(πf/2W), |f|<W; else 0 (Eq. 10.3.27).
export function duobinarySpectrum(W: number, f: number[]): number[] {
  return f.map((fi) => (Math.abs(fi) < W ? (1 / W) * Math.cos((Math.PI * fi) / (2 * W)) : 0));
}

// Modified duobinary pulse, x(nT)=1 (n=−1), −1 (n=1) (Eq. 10.3.29). With T=1/2W:
//   x(t) = sinc((t+T)/T) − sinc((t−T)/T)                             (Eq. 10.3.30)
export function modifiedDuobinaryPulse(W: number, t: number[]): number[] {
  const T = 1 / (2 * W);
  return t.map((ti) => sinc((ti + T) / T) - sinc((ti - T) / T));
}

// Modified duobinary magnitude spectrum: |X(f)| = (1/W)·|sin(πf/W)|, |f|≤W; else 0
// (Eq. 10.3.31). Note the spectral null at f=0 — suitable for channels without DC.
export function modifiedDuobinarySpectrum(W: number, f: number[]): number[] {
  return f.map((fi) => (Math.abs(fi) <= W ? (1 / W) * Math.abs(Math.sin((Math.PI * fi) / W)) : 0));
}

// ── §10.4  Detection of partial-response signals ────────────────────────────

// Precoding for the duobinary system: p_m = d_m ⊖ p_{m−1} (mod 2); a_m = 2p_m − 1
// (Eq. 10.4.2). Precoding maps the data directly onto the received level so a
// detection error cannot propagate.
export function precode(d: number[]): { p: number[]; a: number[] } {
  const p: number[] = [];
  let prev = 0;
  for (const dm of d) {
    const pm = (((dm - prev) % 2) + 2) % 2;
    p.push(pm);
    prev = pm;
  }
  return { p, a: p.map((pm) => 2 * pm - 1) };
}

// Noise-free received samples b_m = a_m + a_{m−1} ∈ {−2,0,2} (Eq. 10.4.1/10.4.3).
// The precoder is primed with p_{-1}=0, i.e. the startup symbol a_{-1} = 2·0 − 1 = −1,
// so the very first received sample is already a valid three-level value.
export function duobinaryReceive(a: number[]): number[] {
  return a.map((am, m) => am + (m > 0 ? a[m - 1] : -1));
}

// Symbol-by-symbol detection with precoding: d̂_m = (b_m/2 + 1) mod 2, i.e. levels
// near ±2 → 0 and level near 0 → 1, comparing y_m to thresholds ±1 (Eq. 10.4.5/10.4.6).
export function symbolBySymbolDetect(y: number[]): number[] {
  return y.map((ym) => (Math.abs(ym) >= 1 ? 0 : 1));
}

// Demonstration of error propagation WITHOUT precoding: the receiver estimates
// â_m = b_m − â_{m−1} by subtraction; a single injected detection error reinforces
// itself in later symbols. Returns per-symbol error flags (1 = mismatch).
export function errorPropagationDemo(a: number[], flipIndex: number): number[] {
  const b = duobinaryReceive(a);
  const aHat: number[] = [];
  let prev = 0;
  for (let m = 0; m < b.length; m++) {
    let est = b[m] - prev;
    if (m === flipIndex) est = -est; // injected detection error
    const q = est >= 0 ? 1 : -1;
    aHat.push(q);
    prev = q;
  }
  return a.map((am, m) => (am === aHat[m] ? 0 : 1));
}

// Maximum-likelihood sequence detection on the 2-state partial-response trellis
// (§10.4.3). States are the previous transmitted symbol a_{m−1} ∈ {−1,+1}; each
// branch predicts b = a_m + a_{m−1} and accumulates squared-error metric. Separate
// from the convolutional-code Viterbi in convcodes.ts.
export function viterbiPR(
  received: number[],
  _system: 'duobinary' | 'modified-duobinary' = 'duobinary',
): { decoded: number[]; path: number[] } {
  const states = [-1, 1];
  const INF = 1e9;
  let metric = [0, INF]; // assume the sequence starts from a_{-1} = −1
  const back: number[][] = [];
  for (const b of received) {
    const nm = [INF, INF];
    const bk = [0, 0];
    for (let s = 0; s < 2; s++) {
      for (let q = 0; q < 2; q++) {
        const expected = states[q] + states[s];
        const cost = metric[s] + (b - expected) ** 2;
        if (cost < nm[q]) {
          nm[q] = cost;
          bk[q] = s;
        }
      }
    }
    metric = nm;
    back.push(bk);
  }
  let s = metric[0] <= metric[1] ? 0 : 1;
  const path: number[] = [];
  for (let i = back.length - 1; i >= 0; i--) {
    path.unshift(states[s]);
    s = back[i][s];
  }
  return { decoded: path.map((aSym) => (aSym > 0 ? 1 : 0)), path };
}

// Error-rate curves vs Eb/N0 (dB). Zero-ISI binary PAM reference P_b = Q(√(2 Eb/N0)).
// Symbol-by-symbol duobinary detection costs ≈ 2.1 dB; ML sequence detection recovers
// most of it, leaving ≈ 0.34 dB (§10.4.2/§10.4.4, Eq. 10.4.41).
export function prBerCurves(ebN0dB: number[]): {
  zeroIsi: number[];
  symbolBySymbol: number[];
  mlsd: number[];
} {
  const lin = (db: number) => 10 ** (db / 10);
  const PENALTY_SBS_DB = 2.1;
  const PENALTY_MLSD_DB = 0.34;
  const zeroIsi = ebN0dB.map((db) => qfunc(Math.sqrt(2 * lin(db))));
  const symbolBySymbol = ebN0dB.map((db) => qfunc(Math.sqrt(2 * lin(db) * 10 ** (-PENALTY_SBS_DB / 10))));
  const mlsd = ebN0dB.map((db) => qfunc(Math.sqrt(2 * lin(db) * 10 ** (-PENALTY_MLSD_DB / 10))));
  return { zeroIsi, symbolBySymbol, mlsd };
}
