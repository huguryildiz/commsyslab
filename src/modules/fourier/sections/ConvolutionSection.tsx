import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Slider, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { t } from '@/i18n';
import {
  buildConvCurve,
  buildConvOverlap,
  CONV_T_MIN,
  CONV_T_MAX,
  SIGNAL_GROUPS,
  type BasicKind,
} from '../model';

const PAD = { l: 50, r: 16, t: 16, b: 36 };
const SWEEP_SPEED = 1.1; // slide units (seconds of t) per real second during auto-play

/** Grouped <optgroup>/<option> markup shared by the x and h selectors. */
function signalOptions() {
  return SIGNAL_GROUPS.map((g) => (
    <optgroup key={g.group} label={g.group}>
      {g.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </optgroup>
  ));
}

/** Fill the area between a trace and the zero line (used to show the overlap integral). */
function fillArea(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xs: number[],
  ys: number[],
  fill: string,
): void {
  if (xs.length === 0) return;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(ax.x(xs[0]), ax.y(0));
  for (let i = 0; i < xs.length; i++) ctx.lineTo(ax.x(xs[i]), ax.y(ys[i]));
  ctx.lineTo(ax.x(xs[xs.length - 1]), ax.y(0));
  ctx.closePath();
  ctx.fill();
}

/** Clip subsequent drawing to the plot area so zoomed-in traces don't spill into the padding. */
function clipPlot(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.beginPath();
  ctx.rect(PAD.l, PAD.t, w - PAD.r - PAD.l, h - PAD.b - PAD.t);
  ctx.clip();
}

export function ConvolutionSection() {
  const [xKind, setXKind] = useState<BasicKind>('rect');
  const [hKind, setHKind] = useState<BasicKind>('rect');
  const [slideT, setSlideT] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Heavy part (signals + full y curve) depends only on the chosen shapes.
  const curve = useMemo(() => buildConvCurve(xKind, hKind), [xKind, hKind]);
  // Cheap part recomputes as the slide moves.
  const overlap = useMemo(() => buildConvOverlap(curve, slideT), [curve, slideT]);

  // y-axis range for the convolution panel (grows for step·step etc.).
  const yMax = Math.max(0.2, ...curve.y);
  const yMin = Math.min(0, ...curve.y);
  const yPad = 0.15 * (yMax - yMin || 1);

  // Signal-panel y-range adapts to the chosen shapes (e.g. ramp reaches ~4),
  // but stays fixed while sliding so the panels don't jump during playback.
  const sigPeak = Math.max(1, ...curve.x.map(Math.abs), ...curve.h.map(Math.abs));
  const sigRange: [number, number] = [-1.15 * sigPeak, 1.15 * sigPeak];

  // Auto-sweep the slide left→right, looping back to the start.
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    const tick = (ts: number) => {
      if (lastRef.current != null) {
        const elapsed = (ts - lastRef.current) / 1000;
        setSlideT((s) => {
          const next = s + elapsed * SWEEP_SPEED;
          return next > CONV_T_MAX ? CONV_T_MIN : next;
        });
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

  /** Manual interaction (slider / drag) pauses the auto-sweep. */
  function scrubTo(value: number) {
    setPlaying(false);
    setSlideT(Math.min(CONV_T_MAX, Math.max(CONV_T_MIN, value)));
  }

  function handleReset() {
    setPlaying(false);
    setSlideT(0);
  }

  const [tLo, tHi, handleZoom, , handlePan] = useZoom(CONV_T_MIN, CONV_T_MAX, {
    minSpan: 0.5,
    maxSpan: (CONV_T_MAX - CONV_T_MIN) * 1.5,
  });

  const xRange: [number, number] = [tLo, tHi];
  const signalAxis = (w: number, h: number): Axes => ({
    x: linScale(xRange, [PAD.l, w - PAD.r]),
    y: linScale(sigRange, [h - PAD.b, PAD.t]),
  });

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.panel.conv')}>
          <label className="ctl-select">
            <span>{t('fourier.conv.x')} <Formula tex="x(t)" /></span>
            <select value={xKind} onChange={(e) => setXKind(e.target.value as BasicKind)}>
              {signalOptions()}
            </select>
          </label>
          <label className="ctl-select">
            <span>{t('fourier.conv.h')} <Formula tex="h(t)" /></span>
            <select value={hKind} onChange={(e) => setHKind(e.target.value as BasicKind)}>
              {signalOptions()}
            </select>
          </label>
          <Slider
            label={<>{t('fourier.conv.slide')} <Formula tex="t" /></>}
            value={slideT}
            min={CONV_T_MIN}
            max={CONV_T_MAX}
            step={0.05}
            precision={3}
            onChange={scrubTo}
          />
          <div className="transport">
            <button type="button" onClick={() => setPlaying((p) => !p)}>
              {playing ? t('fourier.conv.pause') : t('fourier.conv.play')}
            </button>
            <button type="button" onClick={handleReset}>{t('fourier.conv.reset')}</button>
          </div>
        </Panel>
        <div className="fourier__metric">
          <span className="fourier__metric__label">{t('fourier.conv.readout')} <Formula tex="y(t)" /></span>
          <span className="fourier__metric__value">
            <Formula tex={`y(${overlap.slideT.toFixed(2)}) = ${overlap.yAtSlide.toFixed(3)}`} />
          </span>
        </div>
      </aside>

      <div className="fourier__content">
        <div className="conv-grid">
          <Panel title={<><Formula tex="x(\tau)" /> — {t('fourier.conv.panel.x')}</>}>
            <Canvas
              height={180}
              ariaLabel="Input signal x(t)"
              deps={[curve, tLo, tHi]}
              onWheel={handleZoom}
              onPan={handlePan}
              draw={(ctx, w, h) => {
                const ax = signalAxis(w, h);
                drawAxes(ctx, ax, xRange, { xLabel: '$t\\,(s)$', yLabel: '$x(t)$' });
                ctx.save();
                clipPlot(ctx, w, h);
                drawLine(ctx, ax, curve.t, curve.x, CHART.green, 2);
                ctx.restore();
              }}
            />
          </Panel>

          <Panel title={<><Formula tex="h(\tau)" /> — {t('fourier.conv.panel.h')}</>}>
            <Canvas
              height={180}
              ariaLabel="Impulse response h(t)"
              deps={[curve, tLo, tHi]}
              onWheel={handleZoom}
              onPan={handlePan}
              draw={(ctx, w, h) => {
                const ax = signalAxis(w, h);
                drawAxes(ctx, ax, xRange, { xLabel: '$t\\,(s)$', yLabel: '$h(t)$' });
                ctx.save();
                clipPlot(ctx, w, h);
                drawLine(ctx, ax, curve.t, curve.h, CHART.orange, 2);
                ctx.restore();
              }}
            />
          </Panel>

          <Panel title={<><Formula tex="x(\tau)\cdot h(t-\tau)" /> — {t('fourier.conv.panel.overlap')}</>}>
            <Canvas
              height={180}
              ariaLabel="Overlap of x and flipped, shifted h"
              deps={[curve, overlap, tLo, tHi]}
              onScrub={(frac) => scrubTo(tLo + frac * (tHi - tLo))}
              scrubPadding={{ l: PAD.l, r: PAD.r }}
              onWheel={handleZoom}
              draw={(ctx, w, h) => {
                const ax = signalAxis(w, h);
                drawAxes(ctx, ax, xRange, { xLabel: '$\\tau\\,(s)$', yLabel: '$x,\\,h(t-\\tau)$' });
                ctx.save();
                clipPlot(ctx, w, h);
                // Shaded product area = the running convolution integral.
                fillArea(ctx, ax, curve.t, overlap.product, alpha(CHART.pink, 0.28));
                drawLine(ctx, ax, curve.t, curve.x, CHART.green, 1.5);
                drawLine(ctx, ax, curve.t, overlap.hReflected, CHART.orange, 1.5);
                // Dashed marker at the current slide position t.
                ctx.strokeStyle = CHART.pink;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                ctx.moveTo(ax.x(overlap.slideT), PAD.t);
                ctx.lineTo(ax.x(overlap.slideT), h - PAD.b);
                ctx.stroke();
                ctx.restore();
              }}
            />
            <p className="fourier__hint"><HintText text={t('fourier.conv.hint.overlap')} /></p>
          </Panel>

          <Panel title={<><Formula tex="y(t)" /> — {t('fourier.conv.panel.y')}</>}>
            <Canvas
              height={180}
              ariaLabel="Convolution result y(t)"
              deps={[curve, overlap, tLo, tHi]}
              onWheel={handleZoom}
              onPan={handlePan}
              draw={(ctx, w, h) => {
                const ax: Axes = {
                  x: linScale(xRange, [PAD.l, w - PAD.r]),
                  y: linScale([yMin - yPad, yMax + yPad], [h - PAD.b, PAD.t]),
                };
                drawAxes(ctx, ax, xRange, { xLabel: '$t\\,(s)$', yLabel: '$y(t)$' });
                ctx.save();
                clipPlot(ctx, w, h);
                drawLine(ctx, ax, curve.t, curve.y, CHART.blue, 2);
                // Pink marker tracking the slide position on the result curve.
                const mx = ax.x(overlap.slideT);
                const my = ax.y(overlap.yAtSlide);
                ctx.strokeStyle = alpha(CHART.pink, 0.6);
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(mx, PAD.t);
                ctx.lineTo(mx, h - PAD.b);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = CHART.pink;
                ctx.beginPath();
                ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
              }}
            />
            <p className="fourier__hint"><HintText text={t('fourier.conv.hint.y')} /></p>
          </Panel>
        </div>

        {/* Convolution reference cards — Proakis §2.2-2.3 */}
        <div className="sig-cards">

          {/* Card 1: Convolution Integral */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">
              Convolution Integral
            </h3>
            <div className="sig-card__body">
              <p>The output of any LTI system is the convolution of its input with its impulse response:</p>
              <div className="sig-card__formula">
                <Formula tex="y(t)=(x*h)(t)=\int_{-\infty}^{\infty}x(\tau)\,h(t-\tau)\,d\tau" block />
              </div>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li><Formula tex="\tau" /> is the dummy integration variable (time of past input)</li>
                <li><Formula tex="h(t-\tau)" /> is the impulse response <em>time-reversed and shifted</em> to <Formula tex="t" /></li>
                <li>The integral accumulates all weighted past contributions of <Formula tex="x(\tau)" /></li>
              </ul>
            </div>
          </div>

          {/* Card 2: Flip-Shift-Multiply-Integrate */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">
              Graphical Procedure
            </h3>
            <div className="sig-card__body">
              <p>To compute <Formula tex="y(t)" /> at a fixed <Formula tex="t" />:</p>
              <ol style={{ margin: '0', paddingLeft: '1.3em' }}>
                <li><strong>Flip</strong> <Formula tex="h(\tau)" /> → <Formula tex="h(-\tau)" /></li>
                <li><strong>Shift</strong> by <Formula tex="t" /> → <Formula tex="h(t-\tau)" /></li>
                <li><strong>Multiply</strong> point-wise with <Formula tex="x(\tau)" /></li>
                <li><strong>Integrate</strong> the product over all <Formula tex="\tau" /></li>
              </ol>
              <p style={{ marginTop: 'var(--space-1)' }}>
                Repeat as <Formula tex="t" /> slides from <Formula tex="-\infty" /> to <Formula tex="\infty" /> to build the full output.
                Use the slider above to explore each step.
              </p>
            </div>
          </div>

          {/* Card 3: LTI Properties */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--blue">
              LTI Algebraic Properties
            </h3>
            <div className="sig-card__body">
              <ul>
                <li>
                  <span className="sig-card__label">Commutativity:</span>{' '}
                  <Formula tex="x*h=h*x" />
                </li>
                <li>
                  <span className="sig-card__label">Associativity:</span>{' '}
                  <Formula tex="(x*h_1)*h_2=x*(h_1*h_2)" />
                </li>
                <li>
                  <span className="sig-card__label">Distributivity:</span>{' '}
                  <Formula tex="x*(h_1+h_2)=x*h_1+x*h_2" />
                </li>
                <li>
                  <span className="sig-card__label">Identity:</span>{' '}
                  <Formula tex="x*\delta=x" />
                </li>
                <li>
                  <span className="sig-card__label">Shift:</span> delaying <Formula tex="x" /> or <Formula tex="h" /> by <Formula tex="t_0" /> delays <Formula tex="y" /> by <Formula tex="t_0" />
                </li>
              </ul>
            </div>
          </div>

          {/* Card 4: Causality & BIBO Stability */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--green">
              Causality &amp; BIBO Stability
            </h3>
            <div className="sig-card__body">
              <p><span className="sig-card__label">Causal system:</span> output depends only on present and past inputs.</p>
              <div className="sig-card__formula">
                <Formula tex="h(t)=0\quad\text{for }t<0" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                <span className="sig-card__label">BIBO Stability:</span> bounded input → bounded output.
                Necessary and sufficient condition:
              </p>
              <div className="sig-card__formula">
                <Formula tex="\int_{-\infty}^{\infty}|h(t)|\,dt < \infty" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                Example: <Formula tex="h(t)=e^{-\alpha t}u(t)" /> with <Formula tex="\alpha>0" /> is both causal and BIBO stable.
              </p>
            </div>
          </div>

          {/* Card 5: Step Response */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--orange">
              Step &amp; Impulse Response
            </h3>
            <div className="sig-card__body">
              <p>
                The <em>step response</em> <Formula tex="s(t)" /> is the output when the input is the unit step <Formula tex="u(t)" />:
              </p>
              <div className="sig-card__formula">
                <Formula tex="s(t)=\int_{-\infty}^{t}h(\tau)\,d\tau" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                Differentiating recovers the impulse response:
              </p>
              <div className="sig-card__formula">
                <Formula tex="h(t)=\frac{d}{dt}s(t)" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                For a causal stable system, <Formula tex="s(\infty)=\int_{0}^{\infty}h(\tau)\,d\tau" /> is the DC gain.
              </p>
            </div>
          </div>

          {/* Card 6: Convolution ↔ Multiplication (FT duality) */}
          <div className="sig-card">
            <h3 className="sig-card__title sig-card__title--blue">
              Convolution Theorem (FT)
            </h3>
            <div className="sig-card__body">
              <p>Convolution in time ↔ <em>multiplication</em> in frequency:</p>
              <div className="sig-card__formula">
                <Formula tex="y(t)=x(t)*h(t)\;\xrightarrow{\mathcal{F}}\;Y(f)=X(f)\cdot H(f)" block />
              </div>
              <p style={{ marginTop: 'var(--space-1)' }}>
                <Formula tex="H(f)" /> is the <em>transfer function</em> (frequency response) of the system.
              </p>
              <ul style={{ marginTop: 'var(--space-1)' }}>
                <li>
                  <Formula tex="|H(f)|" /> — amplitude (magnitude) response
                </li>
                <li>
                  <Formula tex="\angle H(f)" /> — phase response
                </li>
                <li>
                  Dual: multiplication in time ↔ convolution in frequency
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
