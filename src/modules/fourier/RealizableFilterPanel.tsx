/**
 * Realizable Filters comparison panel (Filters tab).
 *
 * Overlays the ideal brick-wall lowpass against its Butterworth and Chebyshev
 * (type I / II) approximations so students can see how order, passband ripple,
 * and stopband attenuation trade off against roll-off steepness. Standard
 * analog-filter approximation theory — see `@/lib/dsp/analogfilters`.
 */

import { useState, useRef } from 'react';
import { Panel, Slider, Toggle, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { buildRealizableFilters } from './model';

const PAD = { l: 56, r: 20, t: 18, b: 40 };
const F_MAX = 100;
const CANVAS_H = 240;

// Default legend position: bottom-left inside the chart area.
const DEFAULT_LEGEND = { x: PAD.l + 8, y: 106 };

type Scale = 'db' | 'linear';

const DEFAULTS = { fc: 30, order: 4, rippleDb: 1, stopDb: 40, scale: 'linear' as Scale };

// Trace styling: ideal = dim reference (dashed), the rest follow the chart tokens.
const TRACE = {
  ideal: { color: () => CHART.dim, key: 'fourier.realfilt.ideal' },
  butter: { color: () => CHART.green, key: 'fourier.realfilt.butter' },
  c1: { color: () => CHART.orange, key: 'fourier.realfilt.cheby1' },
  c2: { color: () => CHART.blue, key: 'fourier.realfilt.cheby2' },
} as const;

export function RealizableFilterPanel() {
  const [fc, setFc] = useState(DEFAULTS.fc);
  const [order, setOrder] = useState(DEFAULTS.order);
  const [rippleDb, setRippleDb] = useState(DEFAULTS.rippleDb);
  const [stopDb, setStopDb] = useState(DEFAULTS.stopDb);
  const [scale, setScale] = useState<Scale>(DEFAULTS.scale);
  const [show, setShow] = useState({ ideal: true, butter: true, c1: true, c2: true });
  const [legendPos, setLegendPos] = useState(DEFAULT_LEGEND);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ sx: number; sy: number; ix: number; iy: number } | null>(null);

  const data = buildRealizableFilters(fc, order, rippleDb, stopDb, F_MAX);
  const [fLo, fHi, onWheel, resetZoom, onPan] = useZoom(0, F_MAX, { minSpan: 5, maxSpan: F_MAX * 2, clampMin: 0 });

  function handleReset() {
    setFc(DEFAULTS.fc);
    setOrder(DEFAULTS.order);
    setRippleDb(DEFAULTS.rippleDb);
    setStopDb(DEFAULTS.stopDb);
    setScale(DEFAULTS.scale);
    setShow({ ideal: true, butter: true, c1: true, c2: true });
    setLegendPos(DEFAULT_LEGEND);
    resetZoom();
  }

  const isDb = scale === 'db';
  const yDomain: [number, number] = isDb ? [-80, 5] : [0, 1.1];
  const series = isDb
    ? { ideal: data.idealDb, butter: data.butterworthDb, c1: data.cheby1Db, c2: data.cheby2Db }
    : { ideal: data.ideal, butter: data.butterworth, c1: data.cheby1, c2: data.cheby2 };

  const legendEntries = [
    { vis: show.ideal, label: t('fourier.realfilt.ideal'), color: TRACE.ideal.color() },
    { vis: show.butter, label: t('fourier.realfilt.butter'), color: TRACE.butter.color() },
    { vis: show.c1, label: t('fourier.realfilt.cheby1'), color: TRACE.c1.color() },
    { vis: show.c2, label: t('fourier.realfilt.cheby2'), color: TRACE.c2.color() },
  ].filter((e) => e.vis);

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.panel.realfilt')}>
          <Slider label={<HintText text={t('fourier.realfilt.order')} />} value={order} min={1} max={10} step={1} onChange={setOrder} />
          <Slider label={<HintText text={t('fourier.filter.fc')} />} value={fc} min={5} max={80} step={5} unit="Hz" onChange={setFc} />
          {show.c1 && (
            <Slider label={<HintText text={t('fourier.realfilt.ripple')} />} value={rippleDb} min={0.5} max={3} step={0.5} unit="dB" onChange={setRippleDb} />
          )}
          {show.c2 && (
            <Slider label={<HintText text={t('fourier.realfilt.stop')} />} value={stopDb} min={20} max={60} step={5} unit="dB" onChange={setStopDb} />
          )}
          <Toggle label={t('fourier.realfilt.scale.db')} checked={scale === 'db'} onChange={(v) => setScale(v ? 'db' : 'linear')} />
          <div className="fourier__realfilt-toggles">
            <Toggle label={t('fourier.realfilt.ideal')} checked={show.ideal} onChange={(v) => setShow((s) => ({ ...s, ideal: v }))} />
            <Toggle label={t('fourier.realfilt.butter')} checked={show.butter} onChange={(v) => setShow((s) => ({ ...s, butter: v }))} />
            <Toggle label={t('fourier.realfilt.cheby1')} checked={show.c1} onChange={(v) => setShow((s) => ({ ...s, c1: v }))} />
            <Toggle label={t('fourier.realfilt.cheby2')} checked={show.c2} onChange={(v) => setShow((s) => ({ ...s, c2: v }))} />
          </div>
          <div className="transport">
            <button type="button" onClick={handleReset}>{t('fourier.filter.reset')}</button>
          </div>
        </Panel>
      </aside>

      <div className="fourier__content">
        <Panel title={t('fourier.panel.realfiltPlot')}>
          <div style={{ position: 'relative', height: CANVAS_H }}>
        <Canvas
          height={CANVAS_H}
          ariaLabel="Realizable lowpass filters: ideal vs Butterworth vs Chebyshev"
          deps={[data, fLo, fHi, scale, show]}
          onWheel={onWheel}
          onPan={onPan}
          draw={(ctx, w, h) => {
            ctx.clearRect(0, 0, w, h);
            const ax: Axes = {
              x: linScale([fLo, fHi], [PAD.l, w - PAD.r]),
              y: linScale(yDomain, [h - PAD.b, PAD.t]),
            };
            drawAxes(ctx, ax, [fLo, fHi], {
              xLabel: '$f\\,(\\mathrm{Hz})$',
              yLabel: isDb ? '$|H(f)|\\,(\\mathrm{dB})$' : '$|H(f)|$',
            });
            // Cutoff marker.
            drawLine(ctx, ax, [fc, fc], [yDomain[0], yDomain[1]], CHART.pink, 1, true);
            if (show.ideal) drawLine(ctx, ax, data.freqs, series.ideal, TRACE.ideal.color(), 1.5, true);
            if (show.butter) drawLine(ctx, ax, data.freqs, series.butter, TRACE.butter.color(), 2);
            if (show.c1) drawLine(ctx, ax, data.freqs, series.c1, TRACE.c1.color(), 2);
            if (show.c2) drawLine(ctx, ax, data.freqs, series.c2, TRACE.c2.color(), 2);
          }}
        />

        {/* Draggable HTML legend overlay */}
        {legendEntries.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: legendPos.x,
              top: legendPos.y,
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
              background: 'rgba(6,10,24,0.82)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 7,
              padding: '7px 13px 7px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              zIndex: 10,
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              e.stopPropagation();
              setIsDragging(true);
              dragRef.current = { sx: e.clientX, sy: e.clientY, ix: legendPos.x, iy: legendPos.y };
            }}
            onPointerMove={(e) => {
              if (!dragRef.current) return;
              e.stopPropagation();
              setLegendPos({
                x: dragRef.current.ix + (e.clientX - dragRef.current.sx),
                y: dragRef.current.iy + (e.clientY - dragRef.current.sy),
              });
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              dragRef.current = null;
              setIsDragging(false);
            }}
          >
            {legendEntries.map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 18 }}>
                <svg width={20} height={4} style={{ flexShrink: 0, overflow: 'visible' }}>
                  <line x1={0} y1={2} x2={20} y2={2} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
                </svg>
                <span style={{
                  fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
                  fontSize: 11.5,
                  lineHeight: 1,
                  color: 'rgba(210,225,255,0.90)',
                  whiteSpace: 'nowrap',
                }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="fourier__hint"><HintText text={t('fourier.realfilt.hint')} /></p>
      </Panel>

      {/* Realizable filter reference cards */}
      <div className="sig-cards">

        {/* Card 1: Butterworth */}
        <div className="sig-card">
          <h3 className="sig-card__title sig-card__title--green">
            Butterworth Filter
          </h3>
          <div className="sig-card__body">
            <p>
              The Butterworth filter is <em>maximally flat</em> in the passband — no ripple — and monotonically
              decreasing everywhere:
            </p>
            <div className="sig-card__formula">
              <Formula tex="|H(f)|=\frac{1}{\sqrt{1+\left(\dfrac{f}{f_c}\right)^{2N}}}" block />
            </div>
            <ul style={{ marginTop: 'var(--space-1)' }}>
              <li>Always exactly <Formula tex="-3\,\mathrm{dB}" /> at <Formula tex="f=f_c" />, regardless of order <Formula tex="N" /></li>
              <li>Roll-off steepens at <Formula tex="-20N\,\mathrm{dB/decade}" /> beyond the cutoff</li>
              <li>No ripple anywhere — the smoothest possible magnitude response</li>
            </ul>
          </div>
        </div>

        {/* Card 2: Chebyshev Type I */}
        <div className="sig-card">
          <h3 className="sig-card__title sig-card__title--orange">
            Chebyshev Type I
          </h3>
          <div className="sig-card__body">
            <p>
              Trades <em>equiripple in the passband</em> for a steeper roll-off than Butterworth of the same order:
            </p>
            <div className="sig-card__formula">
              <Formula tex="|H(f)|=\frac{1}{\sqrt{1+\varepsilon^{2}\,T_N^{2}(f/f_c)}}" block />
            </div>
            <div className="sig-card__formula">
              <Formula tex="\varepsilon=\sqrt{10^{R_p/10}-1}" block />
            </div>
            <ul style={{ marginTop: 'var(--space-1)' }}>
              <li><Formula tex="T_N" /> — Chebyshev polynomial of degree <Formula tex="N" /></li>
              <li><Formula tex="R_p" /> — passband ripple in dB (controlled by the slider)</li>
              <li>Monotonic stopband, equiripple passband</li>
            </ul>
          </div>
        </div>

        {/* Card 3: Chebyshev Type II */}
        <div className="sig-card">
          <h3 className="sig-card__title sig-card__title--blue">
            Chebyshev Type II
          </h3>
          <div className="sig-card__body">
            <p>
              The <em>inverse</em> Chebyshev: maximally flat passband with <em>equiripple in the stopband</em>:
            </p>
            <div className="sig-card__formula">
              <Formula tex="|H(f)|=\frac{1}{\sqrt{1+\!\left[\varepsilon^{2}\,T_N^{2}\!\left(\dfrac{f_c}{f}\right)\right]^{-1}}}" block />
            </div>
            <div className="sig-card__formula">
              <Formula tex="\varepsilon=\frac{1}{\sqrt{10^{R_s/10}-1}}" block />
            </div>
            <ul style={{ marginTop: 'var(--space-1)' }}>
              <li><Formula tex="R_s" /> — stopband attenuation in dB</li>
              <li>Flat passband (no ripple), equiripple stopband</li>
              <li>Transition begins at <Formula tex="f_c" />, stopband equiripple stays below <Formula tex="-R_s\,\mathrm{dB}" /></li>
            </ul>
          </div>
        </div>

        {/* Card 4: Filter Order & Roll-Off */}
        <div className="sig-card">
          <h3 className="sig-card__title sig-card__title--green">
            Filter Order &amp; Roll-Off
          </h3>
          <div className="sig-card__body">
            <p>
              The <em>order</em> <Formula tex="N" /> directly controls how sharply the filter separates passband
              from stopband:
            </p>
            <ul>
              <li>
                <span className="sig-card__label">Butterworth roll-off:</span>{' '}
                <Formula tex="-20N\,\mathrm{dB/decade}" /> for <Formula tex="f\gg f_c" />
              </li>
              <li style={{ marginTop: 'var(--space-1)' }}>
                <span className="sig-card__label">Minimum order</span> for a Butterworth satisfying specs:
                <div className="sig-card__formula">
                  <Formula tex="N\ge\dfrac{\log\!\left(\dfrac{10^{R_s/10}-1}{10^{R_p/10}-1}\right)}{2\log(f_s/f_p)}" block />
                </div>
              </li>
              <li>
                Higher order = steeper roll-off, but more poles, more delay, and greater circuit complexity.
              </li>
            </ul>
          </div>
        </div>

        {/* Card 5: Passband Ripple & Stopband Attenuation */}
        <div className="sig-card">
          <h3 className="sig-card__title sig-card__title--orange">
            Design Specs: <Formula tex="R_p" /> &amp; <Formula tex="R_s" />
          </h3>
          <div className="sig-card__body">
            <p>Every practical filter is specified by four numbers:</p>
            <ul>
              <li>
                <span className="sig-card__label">Passband edge</span> <Formula tex="f_p" />: highest frequency that must pass
              </li>
              <li style={{ marginTop: 'var(--space-1)' }}>
                <span className="sig-card__label">Passband ripple</span> <Formula tex="R_p\,(\mathrm{dB})" />:
                maximum allowed variation in <Formula tex="|H(f)|" /> for <Formula tex="f\le f_p" />
              </li>
              <li style={{ marginTop: 'var(--space-1)' }}>
                <span className="sig-card__label">Stopband edge</span> <Formula tex="f_s" />: lowest frequency that must be attenuated
              </li>
              <li style={{ marginTop: 'var(--space-1)' }}>
                <span className="sig-card__label">Stopband attenuation</span> <Formula tex="R_s\,(\mathrm{dB})" />:
                minimum required attenuation for <Formula tex="f\ge f_s" />
              </li>
            </ul>
            <p style={{ marginTop: 'var(--space-1)' }}>
              The <em>selectivity factor</em> <Formula tex="f_s/f_p" /> and the specs <Formula tex="R_p,\,R_s" /> together
              determine the minimum filter order needed.
            </p>
          </div>
        </div>

        {/* Card 6: Comparison */}
        <div className="sig-card">
          <h3 className="sig-card__title sig-card__title--blue">
            Which Filter to Use?
          </h3>
          <div className="sig-card__body">
            <ul>
              <li>
                <span className="sig-card__label">Butterworth:</span>{' '}
                smoothest passband, no ripple anywhere. Best when flatness matters more than transition steepness.
              </li>
              <li style={{ marginTop: 'var(--space-1)' }}>
                <span className="sig-card__label">Chebyshev I:</span>{' '}
                steeper roll-off for the same <Formula tex="N" />, at the cost of passband ripple <Formula tex="R_p" />.
                Good when the stopband must be clean.
              </li>
              <li style={{ marginTop: 'var(--space-1)' }}>
                <span className="sig-card__label">Chebyshev II:</span>{' '}
                flat passband + equiripple stopband. Good when the passband must be ripple-free but stopband
                ripple is acceptable.
              </li>
              <li style={{ marginTop: 'var(--space-1)' }}>
                <span className="sig-card__label">Elliptic (not shown):</span>{' '}
                equiripple in <em>both</em> bands — the lowest possible order for given specs, but most
                complex phase response.
              </li>
            </ul>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}
