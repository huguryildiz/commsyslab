import { useState, useEffect, useRef } from 'react';
import { Panel, Slider, Select, Segmented, TheoryBox, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, drawAxes, drawLine, drawScatter, drawVLine, drawBandwidthSpan, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { mainLobeBandwidth } from '@/lib/dsp/bandwidth';
import { t } from '@/i18n';
import {
  buildIQRepresentation,
  buildBasebandBandpassSignal,
  buildHilbertView,
  SIGNAL_GROUPS,
  type BasebandKind,
  type BasicKind,
} from '../model';
import type { SectionProps } from './types';

const PAD = { l: 50, r: 20, t: 20, b: 40 };
const PAD_W = { l: 62, r: 20, t: 20, b: 40 };

// Signals suitable for Hilbert Transform demo — exclude energy-unbounded signals
const HILBERT_EXCLUDE: BasicKind[] = ['impulse', 'step', 'ramp', 'sgn', 'dirac_comb'];
const HILBERT_OPTIONS = SIGNAL_GROUPS.flatMap((g) =>
  g.options
    .filter((o) => !(HILBERT_EXCLUDE as string[]).includes(o.value))
    .map((o) => ({ value: o.value as BasicKind, label: o.label })),
);

const MSG_KINDS: BasebandKind[] = ['rect', 'tri', 'sinc', 'gaussian'];
const MSG_OPTIONS = SIGNAL_GROUPS.flatMap((g) => g.options)
  .filter((o) => (MSG_KINDS as string[]).includes(o.value))
  .map((o) => ({ value: o.value as BasebandKind, label: o.label }));

const DEFAULTS = {
  hilbertKind: 'sine' as BasicKind,
  hilbertF: 2,
  kind: 'rect' as BasebandKind,
  F: 40,
  fcBP: 200,
};

type SubTab = 'hilbert' | 'lowpass' | 'iq';

// ---- Sub-tab 1: Hilbert Transform ----
function HilbertPanel(_props: SectionProps) {
  const [kind, setKind] = useState<BasicKind>(DEFAULTS.hilbertKind);
  const [F, setF] = useState(DEFAULTS.hilbertF);

  // Time window: periodic signals look best over a few cycles; aperiodic over [-3, 3]
  const T_MIN = -3;
  const T_MAX = 3;
  const data = buildHilbertView(kind, F, T_MIN, T_MAX);

  const [tLo, tHi, onWheel, resetZoom, onPan] = useZoom(T_MIN, T_MAX, {
    minSpan: 0.1,
    maxSpan: (T_MAX - T_MIN) * 4,
  });

  function handleReset() {
    setKind(DEFAULTS.hilbertKind);
    setF(DEFAULTS.hilbertF);
    resetZoom();
  }

  const drawTrace =
    (yArr: number[], color: string, yLabel: string) =>
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);
      const peak = Math.max(Math.max(...yArr.map(Math.abs)), 0.5);
      const ax: Axes = {
        x: linScale([tLo, tHi], [PAD_W.l, w - PAD_W.r]),
        y: linScale([-peak * 1.2, peak * 1.2], [h - PAD_W.b, PAD_W.t]),
      };
      drawAxes(ctx, ax, [tLo, tHi], { xLabel: '$t\\,(\\mathrm{s})$', yLabel });
      drawLine(ctx, ax, data.time, yArr, color, 1.5);
    };

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.bandpass.sub.hilbert')}>
          <Select
            label={t('fourier.sig.kind')}
            value={kind}
            options={HILBERT_OPTIONS}
            onChange={(v) => setKind(v as BasicKind)}
          />
          <Slider label={t('fourier.sig.F')} value={F} min={0.5} max={8} step={0.5} unit="Hz" onChange={setF} />
          <div className="transport">
            <button type="button" onClick={handleReset}>{t('fourier.filter.reset')}</button>
          </div>
        </Panel>
      </aside>

      <div className="fourier__content">
        <Panel title={t('fourier.bandpass.hilbert.title')}>
          <figure className="fourier__spectrum">
            <figcaption className="fourier__plot-title">
              <HintText text={t('fourier.bandpass.hilbert.orig')} />
            </figcaption>
            <Canvas
              height={160}
              ariaLabel="Signal x(t)"
              deps={[data, tLo, tHi]}
              onWheel={onWheel}
              onPan={onPan}
              draw={drawTrace(data.signal, CHART.green, '$x(t)$')}
            />
          </figure>
          <figure className="fourier__spectrum">
            <figcaption className="fourier__plot-title">
              <HintText text={t('fourier.bandpass.hilbert.xhat')} />
            </figcaption>
            <Canvas
              height={160}
              ariaLabel="Hilbert transform x-hat(t)"
              deps={[data, tLo, tHi]}
              onWheel={onWheel}
              onPan={onPan}
              draw={drawTrace(data.xhat, CHART.blue, '$\\hat{x}(t)$')}
            />
          </figure>
        </Panel>

        {/* Hilbert Transform reference cards — Proakis & Salehi §2.6 (p. 95) */}
        <div className="sig-cards">

          {/* Card 1: Definition */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">
              Hilbert Transform
            </h3>
            <div className="sig-card__body">
              <p>
                The Hilbert transform of <Formula tex="x(t)" /> is its convolution with <Formula tex="1/(\pi t)" />:
              </p>
              <div className="sig-card__formula">
                <Formula tex="\hat{x}(t)=\mathcal{H}\{x(t)\}=\frac{1}{\pi}\int_{-\infty}^{\infty}\frac{x(\tau)}{t-\tau}\,d\tau" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                It is a <em>90° phase shifter</em>: every sinusoidal component at frequency <Formula tex="f" /> is shifted
                by <Formula tex="-\pi/2" /> radians, leaving its amplitude unchanged.
              </p>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li><Formula tex="\cos(2\pi f t)\;\xrightarrow{\mathcal{H}}\;\sin(2\pi f t)" /></li>
                <li><Formula tex="\sin(2\pi f t)\;\xrightarrow{\mathcal{H}}\;-\cos(2\pi f t)" /></li>
              </ul>
            </div>
          </div>

          {/* Card 2: Frequency-Domain View */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">
              Frequency-Domain View
            </h3>
            <div className="sig-card__body">
              <p>
                In the frequency domain the Hilbert transform is a multiplication by the ideal
                <Formula tex="-90°" /> phase-shift filter:
              </p>
              <div className="sig-card__formula">
                <Formula tex="H_{\mathcal{H}}(f)=-j\,\mathrm{sgn}(f)=\begin{cases}-j,&f>0\\+j,&f<0\end{cases}" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                So <Formula tex="\hat{X}(f)=H_{\mathcal{H}}(f)\cdot X(f)" />. The magnitude is preserved
                (<Formula tex="|H_{\mathcal{H}}(f)|=1" />); only the phase is altered by <Formula tex="\pm\pi/2" />.
              </p>
            </div>
          </div>

          {/* Card 3: Analytic Signal */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--blue">
              Analytic Signal
            </h3>
            <div className="sig-card__body">
              <p>
                Combining <Formula tex="x(t)" /> and <Formula tex="\hat{x}(t)" /> forms the <em>analytic signal</em>:
              </p>
              <div className="sig-card__formula">
                <Formula tex="z(t)=x(t)+j\,\hat{x}(t)" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                Its Fourier transform is <em>one-sided</em>: it contains only positive frequencies.
              </p>
              <div className="sig-card__formula">
                <Formula tex="Z(f)=\begin{cases}2X(f),&f>0\\X(0),&f=0\\0,&f<0\end{cases}" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                This property makes the analytic signal the natural tool for extracting the envelope and
                instantaneous phase of a bandpass signal.
              </p>
            </div>
          </div>

          {/* Card 4: Envelope & Instantaneous Phase */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">
              Envelope &amp; Instantaneous Phase
            </h3>
            <div className="sig-card__body">
              <p>
                Writing <Formula tex="z(t)" /> in polar form gives two physically meaningful quantities:
              </p>
              <div className="sig-card__formula">
                <Formula tex="z(t)=V(t)\,e^{j\phi(t)}" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li>
                  <span className="sig-card__label">Instantaneous envelope:</span>{' '}
                  <Formula tex="V(t)=|z(t)|=\sqrt{x^2(t)+\hat{x}^2(t)}" />
                </li>
                <li style={{ marginTop: 'var(--space-1)' }}>
                  <span className="sig-card__label">Instantaneous phase:</span>{' '}
                  <Formula tex="\phi(t)=\arg z(t)=\arctan\!\dfrac{\hat{x}(t)}{x(t)}" />
                </li>
                <li style={{ marginTop: 'var(--space-1)' }}>
                  <span className="sig-card__label">Instantaneous frequency:</span>{' '}
                  <Formula tex="f_i(t)=\dfrac{1}{2\pi}\dfrac{d\phi}{dt}" />
                </li>
              </ul>
            </div>
          </div>

          {/* Card 5: Properties */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">
              Key Properties
            </h3>
            <div className="sig-card__body">
              <ul>
                <li>
                  <span className="sig-card__label">Linearity:</span>{' '}
                  <Formula tex="\mathcal{H}\{ax+by\}=a\hat{x}+b\hat{y}" />
                </li>
                <li style={{ marginTop: 'var(--space-1)' }}>
                  <span className="sig-card__label">Self-inverse:</span>{' '}
                  applying <Formula tex="\mathcal{H}" /> twice negates the signal:{' '}
                  <Formula tex="\mathcal{H}\{\hat{x}(t)\}=-x(t)" />
                </li>
                <li style={{ marginTop: 'var(--space-1)' }}>
                  <span className="sig-card__label">Energy preservation:</span>{' '}
                  <Formula tex="\|\hat{x}\|^2=\|x\|^2" /> (Parseval's theorem + unit magnitude of <Formula tex="H_{\mathcal{H}}" />)
                </li>
                <li style={{ marginTop: 'var(--space-1)' }}>
                  <span className="sig-card__label">Orthogonality:</span>{' '}
                  <Formula tex="x(t)" /> and <Formula tex="\hat{x}(t)" /> are orthogonal:{' '}
                  <Formula tex="\int_{-\infty}^{\infty}x(t)\hat{x}(t)\,dt=0" />
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ---- Sub-tab 2: Lowpass & Bandpass ----
function LowpassBandpassPanel() {
  const [kind, setKind] = useState<BasebandKind>(DEFAULTS.kind);
  const [F, setF] = useState(DEFAULTS.F);
  const [fc, setFc] = useState(DEFAULTS.fcBP);
  const bb = buildBasebandBandpassSignal(kind, F, fc, 1000);

  const posIdx = bb.freqs.map((_, i) => i).filter((i) => bb.freqs[i] >= 0);
  const fPos = posIdx.map((i) => bb.freqs[i]);
  const bbPos = posIdx.map((i) => bb.baseband[i]);
  const bpPos = posIdx.map((i) => bb.bandpass[i]);
  const nullBB = mainLobeBandwidth(fPos, bbPos);
  const spanBB = { fLo: 0, fHi: nullBB.fHi, W: nullBB.fHi };
  const spanBP = mainLobeBandwidth(fPos, bpPos);

  const fMax = bb.fs / 2;
  const [lo, hi, onWheel, resetZoom, onPan] = useZoom(-fMax, fMax, {
    minSpan: 10,
    maxSpan: fMax * 2,
  });

  function handleReset() {
    setKind(DEFAULTS.kind);
    setF(DEFAULTS.F);
    setFc(DEFAULTS.fcBP);
    resetZoom();
  }

  const drawSpectrum =
    (mag: number[], color: string, span: { fLo: number; fHi: number }, label: string) =>
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);
      const ax: Axes = {
        x: linScale([lo, hi], [PAD.l, w - PAD.r]),
        y: linScale([0, 1.1], [h - PAD.b, PAD.t]),
      };
      drawBandwidthSpan(ctx, ax, span.fLo, span.fHi, label);
      drawAxes(ctx, ax, [lo, hi], { xLabel: '$f\\,(\\mathrm{Hz})$', yLabel: '$|X(f)|$' });
      drawLine(ctx, ax, bb.freqs, mag, color, 2);
    };

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.panel.bbMessage')}>
          <Select label={t('fourier.bb.signal')} value={kind} options={MSG_OPTIONS} onChange={setKind} />
          <Slider
            label={<HintText text={t('fourier.bb.scale')} />}
            value={F}
            min={20}
            max={100}
            step={5}
            unit="Hz"
            onChange={setF}
          />
          <Slider label={<HintText text={t('fourier.bp.fc')} />} value={fc} min={50} max={500} step={10} unit="Hz" onChange={setFc} />
          <div className="transport">
            <button type="button" onClick={handleReset}>{t('fourier.filter.reset')}</button>
          </div>
        </Panel>
      </aside>

      <div className="fourier__content">
        <Panel title={t('fourier.panel.baseband')}>
          <div className="fourier__spectrum-pair">
            <figure className="fourier__spectrum">
              <figcaption className="fourier__spectrum-cap">
                <HintText text={t('fourier.bb.basebandFig')} />
              </figcaption>
              <Canvas
                height={200}
                ariaLabel="Baseband spectrum centered at zero with null-to-null bandwidth marker"
                deps={[bb, lo, hi]}
                onWheel={onWheel}
                onPan={onPan}
                draw={drawSpectrum(bb.baseband, CHART.green, spanBB, `W ≈ ${spanBB.W.toFixed(0)} Hz`)}
              />
            </figure>
            <figure className="fourier__spectrum">
              <figcaption className="fourier__spectrum-cap">
                <HintText text={t('fourier.bb.bandpassFig')} />
              </figcaption>
              <Canvas
                height={200}
                ariaLabel="Bandpass spectrum shifted to plus/minus fc with null-to-null bandwidth marker"
                deps={[bb, lo, hi]}
                onWheel={onWheel}
                onPan={onPan}
                draw={drawSpectrum(bb.bandpass, CHART.blue, spanBP, `2W ≈ ${spanBP.W.toFixed(0)} Hz`)}
              />
            </figure>
          </div>
          <p className="fourier__hint">
            <HintText text={t('fourier.hint.baseband')} />
          </p>
        </Panel>

        {/* Lowpass & Bandpass reference cards — Proakis & Salehi §2.7 (p. 98) */}
        <div className="sig-cards">

          {/* Card 1: Bandpass Signal */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">
              Bandpass Signal
            </h3>
            <div className="sig-card__body">
              <p>
                A <em>bandpass signal</em> has its energy concentrated in a narrow band around a carrier
                frequency <Formula tex="f_c \gg W" />:
              </p>
              <div className="sig-card__formula">
                <Formula tex="x(t)=x_c(t)\cos(2\pi f_c t)-x_s(t)\sin(2\pi f_c t)" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                where <Formula tex="x_c(t)" /> (in-phase) and <Formula tex="x_s(t)" /> (quadrature) are both
                <em> lowpass</em> signals with bandwidth <Formula tex="W \ll f_c" />.
              </p>
            </div>
          </div>

          {/* Card 2: Lowpass Equivalent */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">
              Lowpass Equivalent
            </h3>
            <div className="sig-card__body">
              <p>
                Every bandpass signal has a <em>complex lowpass equivalent</em> (complex envelope):
              </p>
              <div className="sig-card__formula">
                <Formula tex="x_\ell(t)=x_c(t)+j\,x_s(t)" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                The original bandpass signal is recovered as:
              </p>
              <div className="sig-card__formula">
                <Formula tex="x(t)=\mathrm{Re}\!\left\{x_\ell(t)\,e^{j2\pi f_c t}\right\}" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                <Formula tex="x_\ell(t)" /> carries all the information of <Formula tex="x(t)" /> at
                <em> baseband</em> — centred at <Formula tex="f=0" /> rather than <Formula tex="\pm f_c" />.
              </p>
            </div>
          </div>

          {/* Card 3: Spectrum Shift (Modulation Theorem) */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--blue">
              Modulation Theorem
            </h3>
            <div className="sig-card__body">
              <p>
                Multiplying a baseband signal by a carrier <em>shifts its spectrum</em> to <Formula tex="\pm f_c" />:
              </p>
              <div className="sig-card__formula">
                <Formula tex="X(f)=\tfrac{1}{2}\!\left[X_\ell(f-f_c)+X_\ell^{*}(-f-f_c)\right]" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li>The positive-frequency copy is centred at <Formula tex="+f_c" /></li>
                <li>The negative-frequency copy (conjugate-symmetric) is centred at <Formula tex="-f_c" /></li>
                <li>The spectral <em>shape</em> is preserved exactly; only the centre frequency changes</li>
              </ul>
            </div>
          </div>

          {/* Card 4: Bandwidth W vs 2W */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">
              Bandwidth: <Formula tex="W" /> vs <Formula tex="2W" />
            </h3>
            <div className="sig-card__body">
              <p>
                A baseband message with one-sided bandwidth <Formula tex="W" /> occupies
                <Formula tex="[-W,\,W]" /> — total width <Formula tex="2W" />.
              </p>
              <p style={{ marginTop: 'var(--space-1)' }}>
                After modulation the bandpass signal occupies <Formula tex="[f_c-W,\,f_c+W]" />,
                so its <em>transmission bandwidth</em> is:
              </p>
              <div className="sig-card__formula">
                <Formula tex="B_T=2W" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li><span className="sig-card__label">Baseband:</span> one-sided bandwidth <Formula tex="W" /> (green plot, centred at 0)</li>
                <li><span className="sig-card__label">Bandpass:</span> two-sided bandwidth <Formula tex="2W" /> (blue plot, centred at <Formula tex="\pm f_c" />)</li>
              </ul>
            </div>
          </div>

          {/* Card 5: Why Bandpass Transmission? */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">
              Why Bandpass Transmission?
            </h3>
            <div className="sig-card__body">
              <ul>
                <li>
                  <span className="sig-card__label">Antenna efficiency:</span>{' '}
                  practical antennas need size <Formula tex="\lambda/4" />; high <Formula tex="f_c" /> means
                  small antennas (e.g. 2.4 GHz → 3 cm).
                </li>
                <li style={{ marginTop: 'var(--space-1)' }}>
                  <span className="sig-card__label">Frequency multiplexing:</span>{' '}
                  multiple channels can share the same medium by assigning different <Formula tex="f_c" /> values
                  (FDM / OFDM).
                </li>
                <li style={{ marginTop: 'var(--space-1)' }}>
                  <span className="sig-card__label">Channel matching:</span>{' '}
                  the propagation characteristics of a physical channel (cable, air) are frequency-dependent;
                  choosing <Formula tex="f_c" /> places the signal in a favourable band.
                </li>
              </ul>
            </div>
          </div>

          {/* Card 6: Fractional Bandwidth */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--blue">
              Narrowband Condition
            </h3>
            <div className="sig-card__body">
              <p>
                The bandpass model is valid when the signal is <em>narrowband</em> relative to the carrier:
              </p>
              <div className="sig-card__formula">
                <Formula tex="\frac{W}{f_c}\ll 1" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                Under this condition the envelope <Formula tex="x_\ell(t)" /> varies <em>slowly</em> compared
                to the carrier oscillation, so the two can be treated independently.
              </p>
              <p style={{ marginTop: 'var(--space-1)' }}>
                Example: an audio signal with <Formula tex="W=4\,\mathrm{kHz}" /> on a carrier of
                <Formula tex="f_c=900\,\mathrm{MHz}" /> gives <Formula tex="W/f_c\approx 4\times10^{-6}" /> — highly narrowband.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ---- Sub-tab 3: I/Q Representation ----
function IQPanel(_props: SectionProps) {
  const [iKind, setIKind] = useState<BasebandKind>('rect');
  const [qKind, setQKind] = useState<BasebandKind>('tri');
  const [fc, setFc] = useState(DEFAULTS.fcBP);
  const [W, setW] = useState(8);
  const [playing, setPlaying] = useState(true);
  const [phase, setPhase] = useState(0); // animation phase ∈ [0, 1)

  const data = buildIQRepresentation(iKind, qKind, W, fc);
  const N = data.time.length;
  const idx = Math.min(N - 1, Math.max(0, Math.floor(phase * N)));

  const tMin = data.time[0];
  const tMax = data.time[N - 1];
  const [tLo, tHi, onWheel, resetZoom, onPan] = useZoom(tMin, tMax, {
    minSpan: (tMax - tMin) / 50,
    maxSpan: (tMax - tMin) * 4,
  });

  // Local animation loop — the module clock is fixed at 0, so drive a phase here.
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    const tick = (ts: number) => {
      if (lastRef.current != null) {
        const elapsed = (ts - lastRef.current) / 1000;
        setPhase((p) => (p + elapsed * 0.25) % 1); // ~4 s per sweep
      }
      lastRef.current = ts;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
    };
  }, [playing]);

  function handleReset() {
    setIKind('rect');
    setQKind('tri');
    setFc(DEFAULTS.fcBP);
    setW(8);
    setPhase(0);
    resetZoom();
  }

  const cursorT = data.time[idx];

  // A stacked time plot: one or two traces + the synced animation cursor.
  const drawTime =
    (
      primary: { arr: number[]; color: string },
      secondary: { arr: number[]; color: string; dashed?: boolean } | null,
      yLabel: string,
      clampMin?: number,
    ) =>
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);
      const all = secondary ? [...primary.arr, ...secondary.arr] : primary.arr;
      const peak = Math.max(Math.max(...all.map(Math.abs)), 0.5);
      const yMin = clampMin !== undefined ? clampMin : -peak * 1.2;
      const yMax = peak * 1.2;
      const ax: Axes = {
        x: linScale([tLo, tHi], [PAD_W.l, w - PAD_W.r]),
        y: linScale([yMin, yMax], [h - PAD_W.b, PAD_W.t]),
      };
      drawAxes(ctx, ax, [tLo, tHi], { xLabel: '$t\\,(\\mathrm{s})$', yLabel });
      if (secondary)
        drawLine(ctx, ax, data.time, secondary.arr, secondary.color, 1.5, secondary.dashed);
      drawLine(ctx, ax, data.time, primary.arr, primary.color, 1.5);
      drawVLine(ctx, ax, cursorT, yMin, yMax, CHART.pink, false, 1);
    };

  // I/Q plane: square axes, Lissajous path + the moving dot at the cursor sample.
  const drawPlane = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    const m =
      Math.max(
        Math.max(...data.iRec.map(Math.abs)),
        Math.max(...data.qRec.map(Math.abs)),
        0.5,
      ) * 1.2;
    const side = Math.min(w - PAD_W.l - PAD_W.r, h - PAD_W.t - PAD_W.b);
    const cx = (PAD_W.l + (w - PAD_W.r)) / 2;
    const cy = (PAD_W.t + (h - PAD_W.b)) / 2;
    const ax: Axes = {
      x: linScale([-m, m], [cx - side / 2, cx + side / 2]),
      y: linScale([-m, m], [cy + side / 2, cy - side / 2]),
    };
    drawAxes(ctx, ax, [-m, m], { xLabel: '$I$', yLabel: '$Q$' });
    drawLine(ctx, ax, data.iRec, data.qRec, CHART.blue, 1);
    drawScatter(ctx, ax, [data.iRec[idx]], [data.qRec[idx]], CHART.pink, 5);
  };

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.panel.analytic')}>
          <Select
            label={<HintText text={t('fourier.bp.iMsg')} />}
            value={iKind}
            options={MSG_OPTIONS}
            onChange={setIKind}
          />
          <Select
            label={<HintText text={t('fourier.bp.qMsg')} />}
            value={qKind}
            options={MSG_OPTIONS}
            onChange={setQKind}
          />
          <Slider label={<HintText text={t('fourier.bp.fc')} />} value={fc} min={50} max={500} step={10} unit="Hz" onChange={setFc} />
          <Slider label={<HintText text={t('fourier.bp.W')} />} value={W} min={2} max={20} step={1} unit="Hz" onChange={setW} />
          <div className="transport">
            <button type="button" onClick={() => setPlaying((p) => !p)}>
              {playing ? t('fourier.iq.pause') : t('fourier.iq.play')}
            </button>
            <button type="button" onClick={handleReset}>{t('fourier.filter.reset')}</button>
          </div>
        </Panel>
      </aside>

      <div className="fourier__content">
        <Panel title={t('fourier.bandpass.iq.title')}>
          <figure className="fourier__spectrum">
            <figcaption className="fourier__plot-title">
              <HintText text={t('fourier.iq.fig.x')} />
            </figcaption>
            <Canvas
              height={150}
              ariaLabel="Bandpass signal x(t) with envelope"
              deps={[data, tLo, tHi, idx]}
              onWheel={onWheel}
              onPan={onPan}
              draw={drawTime(
                { arr: data.signal, color: CHART.orange },
                { arr: data.envelope, color: CHART.pink },
                '$x(t)$',
              )}
            />
          </figure>

          <figure className="fourier__spectrum">
            <figcaption className="fourier__plot-title">
              <HintText text={t('fourier.iq.fig.i')} />
            </figcaption>
            <Canvas
              height={150}
              ariaLabel="Recovered I vs true x_c"
              deps={[data, tLo, tHi, idx]}
              onWheel={onWheel}
              onPan={onPan}
              draw={drawTime(
                { arr: data.iRec, color: CHART.green },
                { arr: data.xcTrue, color: CHART.green, dashed: true },
                '$I(t)$',
              )}
            />
          </figure>

          <figure className="fourier__spectrum">
            <figcaption className="fourier__plot-title">
              <HintText text={t('fourier.iq.fig.q')} />
            </figcaption>
            <Canvas
              height={150}
              ariaLabel="Recovered Q vs true x_s"
              deps={[data, tLo, tHi, idx]}
              onWheel={onWheel}
              onPan={onPan}
              draw={drawTime(
                { arr: data.qRec, color: CHART.blue },
                { arr: data.xsTrue, color: CHART.blue, dashed: true },
                '$Q(t)$',
              )}
            />
          </figure>

          <figure className="fourier__spectrum">
            <figcaption className="fourier__plot-title">
              <HintText text={t('fourier.iq.fig.plane')} />
            </figcaption>
            <Canvas
              height={260}
              ariaLabel="I/Q plane trajectory with animated point"
              deps={[data, idx]}
              draw={drawPlane}
            />
          </figure>

          <p className="fourier__hint">
            <HintText text={t('fourier.hint.iq')} />
          </p>
        </Panel>

        <TheoryBox title={t('fourier.bandpass.sub.iq')}>
          <Formula tex="x(t)=x_c(t)\cos(2\pi f_c t)-x_s(t)\sin(2\pi f_c t)" block />
          <p>
            The in-phase component <em>x_c(t) = I(t)</em> and quadrature component{' '}
            <em>x_s(t) = Q(t)</em> are the real and imaginary parts of the lowpass equivalent{' '}
            <em>x_ℓ(t) = x_c(t) + j·x_s(t)</em>. Each carries an independent message.
          </p>
          <Formula tex="I=\mathrm{LPF}\{2x(t)\cos 2\pi f_c t\},\quad Q=\mathrm{LPF}\{-2x(t)\sin 2\pi f_c t\}" block />
          <p>
            Multiplying by the cosine and (negated) sine references shifts the wanted component
            to baseband and the unwanted to <em>±2f_c</em>; a lowpass then returns each message
            at unity gain — coherent demodulation.
          </p>
          <Formula tex="V(t)=\bigl|x_\ell(t)\bigr|=\sqrt{x_c^2(t)+x_s^2(t)}" block />
          <p>The envelope V(t) is the magnitude of the complex lowpass equivalent (pink trace).</p>
        </TheoryBox>
      </div>
    </div>
  );
}

// ---- Shell: Bandpass Signals tab with 3 sub-tabs ----
/**
 * Bandpass signal representation — Proakis & Salehi §2.6–§2.7.
 * Three sub-tabs: Hilbert Transform · Lowpass & Bandpass · I/Q Representation.
 */
export function BandpassSignalsSection({ clock }: SectionProps) {
  const [sub, setSub] = useState<SubTab>('hilbert');

  return (
    <div className="fourier__bandpass">
      <div className="fourier__subtabbar">
        <Segmented
          ariaLabel={t('fourier.tab.bandpass')}
          value={sub}
          options={[
            { value: 'hilbert', label: t('fourier.bandpass.sub.hilbert') },
            { value: 'lowpass', label: t('fourier.bandpass.sub.lowpass') },
            { value: 'iq', label: t('fourier.bandpass.sub.iq') },
          ]}
          onChange={(v) => setSub(v as SubTab)}
        />
      </div>

      {sub === 'hilbert' && <HilbertPanel clock={clock} />}
      {sub === 'lowpass' && <LowpassBandpassPanel />}
      {sub === 'iq' && <IQPanel clock={clock} />}
    </div>
  );
}
