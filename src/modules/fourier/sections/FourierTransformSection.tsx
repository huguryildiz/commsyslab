import { useState } from 'react';
import { Panel, Slider, Toggle, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, drawAxes, drawLine, drawGappedLine, drawStems, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { SIGNAL_GROUPS, buildSpectrumExplorer, type BasicKind, type SpectrumOps } from '../model';
import type { SectionProps } from './types';

const PAD = { l: 56, r: 20, t: 20, b: 40 };
const DB_VIEW_FLOOR = -60;

// Operation-control visibility (mirrors the Basic Signals tab, Proakis §2.1).
const PERIODIC_KINDS = new Set<BasicKind>([
  'sine', 'cosine', 'square', 'sawtooth', 'tri_wave',
  'half_rect', 'full_rect', 'dirac_comb', 'damped_sine', 'chirp',
]);
const TAU_KINDS = new Set<BasicKind>(['exp', 'exp2', 'gaussian', 'damped_sine']);
const NO_SCALE_KINDS = new Set<BasicKind>(['exp', 'exp2', 'gaussian', 'step', 'sgn', 'impulse']);

/** Inline label: plain text with a KaTeX symbol in parentheses. */
function L({ text, tex }: { text: string; tex: string }) {
  return <><span>{text} (</span><Formula tex={tex} /><span>)</span></>;
}

/** Run `fn` with the canvas clipped to the inner plot area so traces never spill over the axes/labels. */
function withClip(ctx: CanvasRenderingContext2D, w: number, h: number, fn: () => void) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAD.l, PAD.t, Math.max(0, w - PAD.l - PAD.r), Math.max(0, h - PAD.t - PAD.b));
  ctx.clip();
  fn();
  ctx.restore();
}

const DEFAULTS = {
  kind: 'rect' as BasicKind, amp: 1, t0: 0, F: 1, tau: 0.5, reverse: false, modOn: false, fm: 5,
  dbMode: false, twoSided: true, showOverlay: true,
};

export function FourierTransformSection(_props: SectionProps) {
  const [kind, setKind] = useState<BasicKind>(DEFAULTS.kind);
  const [amp, setAmp] = useState(DEFAULTS.amp);
  const [t0, setT0] = useState(DEFAULTS.t0);
  const [F, setF] = useState(DEFAULTS.F);
  const [tau, setTau] = useState(DEFAULTS.tau);
  const [reverse, setReverse] = useState(DEFAULTS.reverse);
  const [modOn, setModOn] = useState(DEFAULTS.modOn);
  const [fm, setFm] = useState(DEFAULTS.fm);
  const [dbMode, setDbMode] = useState(DEFAULTS.dbMode);
  const [twoSided, setTwoSided] = useState(DEFAULTS.twoSided);
  const [showOverlay, setShowOverlay] = useState(DEFAULTS.showOverlay);

  const ops: SpectrumOps = { amp, t0, F, tau, reverse, modOn, fm };
  const v = buildSpectrumExplorer(kind, ops); // rectangular window: truest |X(f)| + exact Parseval

  const maxMag = Math.max(...v.mag, 1e-12);

  // Shared zoom: one for time, one for both frequency canvases.
  const [tLo, tHi, onWheelT, resetTZoom, onPanT] = useZoom(-10, 10, { minSpan: 0.2, maxSpan: 20, clampMin: -10, clampMax: 10 });
  const [fLo, fHi, onWheelF, resetFZoom, onPanF] = useZoom(-25, 25, { minSpan: 0.5, maxSpan: 210 });
  const dispLo = twoSided ? fLo : Math.max(0, fLo);

  function handleReset() {
    setKind(DEFAULTS.kind);
    setAmp(DEFAULTS.amp);
    setT0(DEFAULTS.t0);
    setF(DEFAULTS.F);
    setTau(DEFAULTS.tau);
    setReverse(DEFAULTS.reverse);
    setModOn(DEFAULTS.modOn);
    setFm(DEFAULTS.fm);
    setDbMode(DEFAULTS.dbMode);
    setTwoSided(DEFAULTS.twoSided);
    setShowOverlay(DEFAULTS.showOverlay);
    resetTZoom();
    resetFZoom();
  }

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.panel.spectrum')}>
          <label className="ctl-select">
            <span>{t('fourier.spec.signal')}</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as BasicKind)}>
              {SIGNAL_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <Slider label={<L text="Amplitude" tex="A" />} value={amp} min={-2} max={2} step={0.1} onChange={setAmp} />
          <Slider label={<L text="Time shift" tex="t_0" />} unit="(s)" value={t0} min={-5} max={5} step={0.05} onChange={setT0} />
          {!NO_SCALE_KINDS.has(kind) && (
            PERIODIC_KINDS.has(kind)
              ? <Slider label={<L text="Frequency" tex="f_0" />} unit="(Hz)" value={F} min={0.1} max={5} step={0.1} onChange={setF} />
              : <Slider label={<L text="Time scale" tex="\alpha" />} value={F} min={0.1} max={5} step={0.1} onChange={setF} />
          )}
          {TAU_KINDS.has(kind) && (
            kind === 'gaussian'
              ? <Slider label={<L text="Width" tex="\sigma" />} unit="(s)" value={tau} min={0.05} max={5} step={0.05} onChange={setTau} />
              : <Slider label={<L text="Decay" tex="\tau" />} unit="(s)" value={tau} min={0.05} max={5} step={0.05} onChange={setTau} />
          )}
          <Toggle label={t('fourier.sig.reverse')} checked={reverse} onChange={setReverse} />
          <Toggle label={<HintText text={t('fourier.spec.mod')} />} checked={modOn} onChange={setModOn} />
          {modOn && (
            <Slider label={<L text="Mod. freq" tex="f_m" />} unit="(Hz)" value={fm} min={1} max={30} step={1} onChange={setFm} />
          )}
          <Toggle label={t('fourier.spec.db')} checked={dbMode} onChange={setDbMode} />
          <Toggle label={t('fourier.spec.twoSided')} checked={twoSided} onChange={setTwoSided} />
          <Toggle label={t('fourier.spec.overlay')} checked={showOverlay} onChange={setShowOverlay} />
          <div className="transport">
            <button type="button" onClick={handleReset}>{t('fourier.spec.reset')}</button>
          </div>
        </Panel>
      </aside>

      <div className="fourier__content">
        <div className="fourier__readouts">
          <div className="fourier__metric">
            <span className="fourier__metric__label">{t('fourier.readout.bw')}</span>
            <span className="fourier__metric__value">{v.bandwidth.toFixed(1)} <small>Hz</small></span>
          </div>
          <div className="fourier__metric">
            <span className="fourier__metric__label">{t('fourier.readout.peakF')}</span>
            <span className="fourier__metric__value">{v.peakF.toFixed(1)} <small>Hz</small></span>
          </div>
          <div className="fourier__metric">
            <span className="fourier__metric__label">{t('fourier.readout.eTime')}</span>
            <span className="fourier__metric__value">{v.eTime.toFixed(3)} <small>J</small></span>
          </div>
          <div className="fourier__metric">
            <span className="fourier__metric__label">{t('fourier.readout.eFreq')}</span>
            <span className="fourier__metric__value">{v.eFreq.toFixed(3)} <small>J</small></span>
          </div>
        </div>

        <Panel title={t('fourier.panel.spectrumPlot')}>
          {/* Time domain: operated signal */}
          <p className="fourier__plot-title">{t('fourier.spec.time')}</p>
          <Canvas
            height={170}
            ariaLabel="Time domain signal"
            deps={[v, tLo, tHi]}
            onWheel={onWheelT}
            onPan={onPanT}
            draw={(ctx, w, h) => {
              ctx.clearRect(0, 0, w, h);
              const yData = Math.max(...v.x.map(Math.abs), 1);
              const yPad = yData * 1.1;
              const ax: Axes = {
                x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
                y: linScale([-yPad, yPad], [h - PAD.b, PAD.t]),
              };
              drawAxes(ctx, ax, [tLo, tHi], { xLabel: '$t\\,(\\mathrm{s})$', yLabel: '$x(t)$' });
              withClip(ctx, w, h, () => {
                drawLine(ctx, ax, v.time, v.x, CHART.orange, 2);
              });
            }}
          />

          {/* Magnitude spectrum (linear or dB) + analytic overlay */}
          <p className="fourier__plot-title">{t('fourier.spec.mag')}</p>
          <Canvas
            height={190}
            ariaLabel="Magnitude spectrum |X(f)|"
            deps={[v, dispLo, fHi, dbMode, twoSided, showOverlay]}
            onWheel={onWheelF}
            onPan={onPanF}
            draw={(ctx, w, h) => {
              ctx.clearRect(0, 0, w, h);
              const yRange: [number, number] = dbMode ? [DB_VIEW_FLOOR, 3] : [0, maxMag * 1.15];
              const ax: Axes = {
                x: linScale([dispLo, fHi], [PAD.l, w - PAD.r]),
                y: linScale(yRange, [h - PAD.b, PAD.t]),
              };
              const yLabel = dbMode ? '$20\\log_{10}|X(f)|\\,(\\mathrm{dB})$' : '$|X(f)|$';
              drawAxes(ctx, ax, [dispLo, fHi], { xLabel: '$f\\,(\\mathrm{Hz})$', yLabel });
              withClip(ctx, w, h, () => {
                drawLine(ctx, ax, v.freq, dbMode ? v.magDb : v.mag, CHART.blue, 1.5);

                if (showOverlay && v.overlay.type === 'curve') {
                  const oy = dbMode
                    ? v.overlay.mag.map((m) => Math.max(20 * Math.log10(m / maxMag), DB_VIEW_FLOOR))
                    : v.overlay.mag;
                  drawLine(ctx, ax, v.overlay.f, oy, CHART.orange, 1.5, true);
                } else if (showOverlay && v.overlay.type === 'line') {
                  const lineMax = Math.max(...v.overlay.mag, 1e-12);
                  const scaled = v.overlay.mag.map((m) => (m / lineMax) * maxMag); // align to FFT peak
                  const oy = dbMode
                    ? scaled.map((m) => Math.max(20 * Math.log10(m / maxMag), DB_VIEW_FLOOR))
                    : scaled;
                  drawStems(ctx, ax, v.overlay.f, oy, CHART.orange, 2.5);
                }
              });
            }}
          />
          {/* Legend + overlay status */}
          <p className="fourier__hint" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span style={{ color: CHART.blue }}>— {t('fourier.spec.legend.fft')}</span>
            {showOverlay && v.overlay.type !== 'none' && (
              <span style={{ color: CHART.orange }}>--- {t('fourier.spec.legend.theory')}</span>
            )}
            {v.overlay.type === 'none' && <span><HintText text={t('fourier.spec.noOverlay')} /></span>}
            {v.overlay.type === 'line' && showOverlay && <span><HintText text={t('fourier.spec.lineNote')} /></span>}
          </p>

          {/* Phase spectrum (masked where |X| is negligible) */}
          <p className="fourier__plot-title">{t('fourier.spec.phase')}</p>
          <Canvas
            height={150}
            ariaLabel="Phase spectrum ∠X(f)"
            deps={[v, dispLo, fHi, twoSided, showOverlay]}
            onWheel={onWheelF}
            onPan={onPanF}
            draw={(ctx, w, h) => {
              ctx.clearRect(0, 0, w, h);
              const phaseDeg = v.phase.map((p) => (p * 180) / Math.PI);
              const ax: Axes = {
                x: linScale([dispLo, fHi], [PAD.l, w - PAD.r]),
                y: linScale([-198, 198], [h - PAD.b, PAD.t]),
              };
              drawAxes(ctx, ax, [dispLo, fHi], { xLabel: '$f\\,(\\mathrm{Hz})$', yLabel: '$\\angle X(f)\\,(^\\circ)$' });
              withClip(ctx, w, h, () => {
                drawGappedLine(ctx, ax, v.freq, phaseDeg, CHART.pink, 1.5);
                if (showOverlay && v.overlay.type === 'curve') {
                  const overlayDeg = v.overlay.phase.map((p) => (p * 180) / Math.PI);
                  drawGappedLine(ctx, ax, v.overlay.f, overlayDeg, CHART.orange, 1.2);
                }
              });
            }}
          />
          <p className="fourier__hint"><HintText text={t('fourier.hint.spectrum')} /></p>
        </Panel>

        {/* Reference cards — Proakis §2.3, Tables 2.1 & 2.2 */}
        <div className="sig-cards">
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">Fourier Transform &amp; Inverse</h3>
            <div className="sig-card__body">
              <p>An aperiodic finite-energy signal <Formula tex="x(t)" /> and its spectrum <Formula tex="X(f)" /> form a transform pair (§2.3):</p>
              <div className="sig-card__formula"><Formula tex="X(f)=\int_{-\infty}^{\infty}x(t)\,e^{-j2\pi ft}\,dt" block /></div>
              <div className="sig-card__formula" style={{ marginTop: 6 }}><Formula tex="x(t)=\int_{-\infty}^{\infty}X(f)\,e^{+j2\pi ft}\,df" block /></div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li>Frequency <Formula tex="f" /> is in Hz (no <Formula tex="2\pi" /> prefactor).</li>
                <li>Forward kernel <Formula tex="e^{-j2\pi ft}" />, inverse <Formula tex="e^{+j2\pi ft}" />.</li>
              </ul>
            </div>
          </div>

          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">Magnitude &amp; Phase Spectrum</h3>
            <div className="sig-card__body">
              <p>The transform is complex, so it splits into a magnitude and a phase part:</p>
              <div className="sig-card__formula"><Formula tex="X(f)=|X(f)|\,e^{\,j\angle X(f)}" block /></div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li><Formula tex="|X(f)|" /> — amplitude (magnitude) spectrum.</li>
                <li><Formula tex="\angle X(f)" /> — phase spectrum.</li>
                <li>On a log scale: <Formula tex="20\log_{10}|X(f)|" /> in dB.</li>
              </ul>
            </div>
          </div>

          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--blue">Conjugate Symmetry</h3>
            <div className="sig-card__body">
              <p>For a <em>real</em> signal the spectrum is conjugate-symmetric, <Formula tex="X(-f)=X^{*}(f)" />:</p>
              <div className="sig-card__formula"><Formula tex="|X(-f)|=|X(f)|,\quad \angle X(-f)=-\angle X(f)" block /></div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li>Magnitude is <strong>even</strong>; phase is <strong>odd</strong>.</li>
                <li>One half of the axis carries all the information.</li>
              </ul>
            </div>
          </div>

          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">Rayleigh&apos;s Energy Theorem</h3>
            <div className="sig-card__body">
              <p>Signal energy is the same measured in time or in frequency (§2.3):</p>
              <div className="sig-card__formula"><Formula tex="E=\int_{-\infty}^{\infty}|x(t)|^2dt=\int_{-\infty}^{\infty}|X(f)|^2df" block /></div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li><Formula tex="|X(f)|^2" /> is the <em>energy spectral density</em>.</li>
                <li>Compare the two energy readouts above (they match).</li>
              </ul>
            </div>
          </div>

          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">Key Properties (Table 2.2)</h3>
            <div className="sig-card__body">
              <div className="sig-card__formula"><Formula tex="x(t-t_0)\;\leftrightarrow\;X(f)\,e^{-j2\pi ft_0}" /></div>
              <div className="sig-card__formula" style={{ marginTop: 6 }}><Formula tex="x(at)\;\leftrightarrow\;\tfrac{1}{|a|}X(f/a)" /></div>
              <div className="sig-card__formula" style={{ marginTop: 6 }}><Formula tex="x(t)\cos(2\pi f_0t)\;\leftrightarrow\;\tfrac12[X(f-f_0)+X(f+f_0)]" /></div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li>Time shift → phase ramp (magnitude unchanged).</li>
                <li>Scaling → reciprocal spread (narrow in time ⇒ wide in <Formula tex="f" />).</li>
                <li>Modulation → spectrum copied to <Formula tex="\pm f_0" />.</li>
                <li>Convolution <Formula tex="\leftrightarrow" /> multiplication.</li>
              </ul>
            </div>
          </div>

          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--blue">Common Pairs (Table 2.1)</h3>
            <div className="sig-card__body">
              <div className="sig-card__formula"><Formula tex="\Pi(t)\;\leftrightarrow\;\operatorname{sinc}(f)" /></div>
              <div className="sig-card__formula" style={{ marginTop: 6 }}><Formula tex="\Lambda(t)\;\leftrightarrow\;\operatorname{sinc}^2(f)" /></div>
              <div className="sig-card__formula" style={{ marginTop: 6 }}><Formula tex="e^{-at}u(t)\;\leftrightarrow\;\dfrac{1}{a+j2\pi f}" /></div>
              <div className="sig-card__formula" style={{ marginTop: 6 }}><Formula tex="\delta(t)\leftrightarrow 1,\quad \cos(2\pi f_0t)\leftrightarrow\tfrac12[\delta(f-f_0)+\delta(f+f_0)]" /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
