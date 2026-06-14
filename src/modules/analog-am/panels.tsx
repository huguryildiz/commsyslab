import { Canvas } from '@/lib/plot/Canvas';
import {
  linScale,
  drawLine,
  drawStems,
  drawVLine,
  drawAxes,
  drawText,
  type Axes,
} from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { t } from '@/i18n';
import type {
  AnalogAmView,
  AnalogPowerView,
  AnalogDemodView,
  AnalogSuperView,
  ModulatorView,
  FdmView,
  QamView,
} from './model';

const PAD = { l: 40, r: 20, t: 20, b: 40 };

export function AmModulatorPanel({ view }: { view: AnalogAmView }) {
  const drawTimeDomain = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const minVal = Math.min(...view.modulated, ...view.message, ...(view.envelope ?? [0])) * 1.1;
    const maxVal = Math.max(...view.modulated, ...view.message, ...(view.envelope ?? [0])) * 1.1;

    const ax: Axes = {
      x: linScale([view.time[0], view.time[view.time.length - 1]], [PAD.l, w - PAD.r]),
      y: linScale([minVal, maxVal], [h - PAD.b, PAD.t]),
    };

    drawAxes(ctx, ax, [view.time[0], view.time[view.time.length - 1]], {
      grid: true,
      domainY: [minVal, maxVal],
      xLabel: '$t\\,[\\mathrm{s}]$',
      yLabel: '$u(t)$',
    });

    // Modulated signal u(t) (primary, blue).
    drawLine(ctx, ax, view.time, view.modulated, CHART.blue, 1.5);

    // Envelope (conventional AM only, orange dashed, both rails).
    if (view.envelope) {
      drawLine(ctx, ax, view.time, view.envelope, CHART.orange, 2, true);
      drawLine(ctx, ax, view.time, view.envelope.map((e) => -e), CHART.orange, 2, true);
    }

    // Message m(t) overlay (green).
    drawLine(ctx, ax, view.time, view.message, CHART.green, 2);

    // Legend.
    drawLegend(ctx, w, [
      { color: CHART.blue, label: 'u(t)' },
      { color: CHART.green, label: 'm(t)' },
      ...(view.envelope ? [{ color: CHART.orange, label: 'envelope' }] : []),
    ]);
  };

  const drawSpectrum = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (view.specFreq.length === 0) return;

    const minFreq = view.specFreq[0];
    const maxFreq = view.specFreq[view.specFreq.length - 1];
    const maxMag = Math.max(...view.specMag, 1e-9) * 1.2;

    const ax: Axes = {
      x: linScale([minFreq, maxFreq], [PAD.l, w - PAD.r]),
      y: linScale([0, maxMag], [h - PAD.b, PAD.t]),
    };

    drawAxes(ctx, ax, [minFreq, maxFreq], {
      grid: true,
      domainY: [0, maxMag],
      xLabel: '$f\\,[\\mathrm{Hz}]$',
      yLabel: '$|U(f)|$',
    });

    drawLine(ctx, ax, view.specFreq, view.specMag, CHART.blue, 1.5);
  };

  return (
    <div className="analog__am-panel">
      <div className="analog__panel-half">
        <div className="analog__label">{t('analog.am.timeDomain')}</div>
        <Canvas
          height={200}
          draw={drawTimeDomain}
          deps={[view]}
          ariaLabel={t('analog.am.timeDomain')}
        />
      </div>
      <div className="analog__panel-half">
        <div className="analog__label">{t('analog.am.spectrum')}</div>
        <Canvas
          height={200}
          draw={drawSpectrum}
          deps={[view]}
          ariaLabel={t('analog.am.spectrum')}
        />
      </div>
      {view.isOvermodulated && (
        <div className="analog__warning">{t('analog.am.warning.overmod')}</div>
      )}
    </div>
  );
}

/** Small top-right legend swatch list, drawn in screen pixels. */
function drawLegend(
  ctx: CanvasRenderingContext2D,
  w: number,
  items: { color: string; label: string }[],
): void {
  ctx.save();
  ctx.font = '11px var(--mono)';
  ctx.textBaseline = 'middle';
  let y = PAD.t + 2;
  for (const it of items) {
    const textW = ctx.measureText(it.label).width;
    const x = w - PAD.r - textW - 16;
    ctx.fillStyle = it.color;
    ctx.fillRect(x, y - 4, 10, 8);
    ctx.fillStyle = CHART.text;
    ctx.fillText(it.label, x + 14, y);
    y += 14;
  }
  ctx.restore();
}

/**
 * Power & Efficiency panel: bar chart.
 */
export function PowerPanel({ view }: { view: AnalogPowerView }) {
  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const barW = (w - PAD.l - PAD.r) / 3;
    const maxPower = Math.max(view.carrierPower, view.sidebandPower, view.totalPower) * 1.2;

    const ax: Axes = {
      x: linScale([0, 3], [PAD.l, w - PAD.r]),
      y: linScale([0, maxPower], [h - PAD.b, PAD.t]),
    };

    // Carrier bar
    const cpH = ax.y(view.carrierPower);
    ctx.fillStyle = CHART.orange;
    ctx.fillRect(PAD.l + 0.2 * barW, cpH, 0.6 * barW, h - PAD.b - cpH);

    // Sideband bar
    const spH = ax.y(view.sidebandPower);
    ctx.fillStyle = CHART.green;
    ctx.fillRect(PAD.l + barW + 0.2 * barW, spH, 0.6 * barW, h - PAD.b - spH);

    // Total bar
    const tpH = ax.y(view.totalPower);
    ctx.fillStyle = CHART.blue;
    ctx.fillRect(PAD.l + 2 * barW + 0.2 * barW, tpH, 0.6 * barW, h - PAD.b - tpH);

    // Labels
    ctx.fillStyle = CHART.dim;
    ctx.font = '12px var(--mono)';
    ctx.textAlign = 'center';
    ctx.fillText('Carrier', PAD.l + 0.5 * barW, h - PAD.b + 15);
    ctx.fillText('Sidebands', PAD.l + 1.5 * barW, h - PAD.b + 15);
    ctx.fillText('Total', PAD.l + 2.5 * barW, h - PAD.b + 15);
  };

  return (
    <div className="analog__power-panel">
      <Canvas height={200} draw={draw} deps={[view]} ariaLabel={t('analog.power.title')} />
    </div>
  );
}

/**
 * Demodulation panel: recovered message vs original (and recovered carrier for PLL).
 */
export function DemodulationPanel({ view }: { view: AnalogDemodView }) {
  const drawRecovery = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const all = [...view.original, ...view.recovered];
    const lo = Math.min(...all) * 1.1 - 0.05;
    const hi = Math.max(...all) * 1.1 + 0.05;
    const ax: Axes = {
      x: linScale([view.time[0], view.time[view.time.length - 1]], [PAD.l, w - PAD.r]),
      y: linScale([lo, hi], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [view.time[0], view.time[view.time.length - 1]]);
    // Original message (green) vs recovered (blue, dashed when distorted).
    drawLine(ctx, ax, view.time, view.original, CHART.green, 2);
    drawLine(
      ctx,
      ax,
      view.time,
      view.recovered,
      view.faithful ? CHART.blue : CHART.red,
      1.8,
      !view.faithful,
    );
    drawText(ctx, ax, view.time[view.time.length - 1], lo, 't (s)', CHART.dim, -30, 12);
    drawText(ctx, ax, view.time[0], hi, 'm(t)', CHART.dim, -30, -5);
  };

  const drawCarrier = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ct = view.carrierTrue;
    const ce = view.carrierEst;
    if (!ct || !ce) return;
    const ax: Axes = {
      x: linScale([view.time[0], view.time[view.time.length - 1]], [PAD.l, w - PAD.r]),
      y: linScale([-1.2, 1.2], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [view.time[0], view.time[view.time.length - 1]]);
    drawLine(ctx, ax, view.time, ct, alpha(CHART.dim, 0.8), 1.5);
    drawLine(ctx, ax, view.time, ce, CHART.orange, 1.8);
    drawText(ctx, ax, view.time[0], 1.2, 'cos θ̂(t)', CHART.dim, -30, -5);
  };

  return (
    <div className="analog__demod-panel">
      <div className="analog__panel-half">
        <div className="analog__label">{t('analog.demod.recovered')}</div>
        <Canvas
          height={200}
          draw={drawRecovery}
          deps={[view]}
          ariaLabel={t('analog.demod.recovered')}
        />
      </div>
      {view.carrierEst && (
        <div className="analog__panel-half">
          <div className="analog__label">{t('analog.demod.carrier')}</div>
          <Canvas
            height={200}
            draw={drawCarrier}
            deps={[view]}
            ariaLabel={t('analog.demod.carrier')}
          />
        </div>
      )}
      {!view.faithful && <div className="analog__warning">{t('analog.demod.warning')}</div>}
    </div>
  );
}

/**
 * Superheterodyne receiver panel: chain blocks + frequency-translation plot.
 */
export function SuperheterodynePanel({
  view,
  clock = 0,
}: {
  view: AnalogSuperView;
  clock?: number;
}) {
  const drawPlan = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const fMax = Math.max(view.imageFreq, view.loFreq) * 1.1;
    const ax: Axes = {
      x: linScale([0, fMax], [PAD.l, w - PAD.r]),
      y: linScale([0, 1.2], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [0, fMax]);
    // Desired RF carrier (green), image (red), local oscillator (orange), IF (blue).
    drawStems(ctx, ax, [view.stationFreq], [1], CHART.green, 3);
    drawText(ctx, ax, view.stationFreq, 1, 'f_c', CHART.green, 2, -8);
    drawStems(ctx, ax, [view.imageFreq], [0.7], CHART.red, 3);
    drawText(ctx, ax, view.imageFreq, 0.7, 'f_img', CHART.red, 2, -8);
    drawVLine(ctx, ax, view.loFreq, 0, 1.1, alpha(CHART.orange, 0.9), true, 1.5);
    drawText(ctx, ax, view.loFreq, 1.1, 'f_LO', CHART.orange, 2, -4);
    drawStems(ctx, ax, [view.ifLine], [0.9], CHART.blue, 3);
    drawText(ctx, ax, view.ifLine, 0.9, 'f_IF', CHART.blue, 2, -8);
    drawText(ctx, ax, fMax, 0, 'f (Hz)', CHART.dim, -30, 12);

    // Animated down-conversion: a packet slides from f_c down to f_IF, looping.
    const phase = (((clock * 0.5) % 1) + 1) % 1; // 0..1 every 2 s at speed 1
    const fMarker = view.stationFreq + (view.ifLine - view.stationFreq) * phase;
    const yMarker = 1 + (0.9 - 1) * phase;
    ctx.fillStyle = CHART.pink;
    ctx.shadowColor = CHART.pink;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ax.x(fMarker), ax.y(yMarker), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const fmt = (hz: number) =>
    hz >= 1e6 ? `${(hz / 1e6).toFixed(3)} MHz` : `${(hz / 1e3).toFixed(1)} kHz`;

  return (
    <div className="analog__super-panel">
      <div className="analog__chain">
        <span className="analog__chain-block">{t('analog.super.rf')}</span>
        <span className="analog__chain-arrow">→</span>
        <span className="analog__chain-block">{t('analog.super.mixer')}</span>
        <span className="analog__chain-arrow">→</span>
        <span className="analog__chain-block">{t('analog.super.iffilter')}</span>
        <span className="analog__chain-arrow">→</span>
        <span className="analog__chain-block">{t('analog.super.detector')}</span>
        <span className="analog__chain-arrow">→</span>
        <span className="analog__chain-block">{t('analog.super.audio')}</span>
      </div>
      <div className="analog__label">{t('analog.super.plan')}</div>
      <Canvas
        height={220}
        draw={drawPlan}
        deps={[view, clock]}
        ariaLabel={t('analog.super.plan')}
      />
      <div className="analog__readouts">
        <span className="analog__chain-block">f_LO = {fmt(view.loFreq)}</span>
        <span className="analog__chain-block">f_image = {fmt(view.imageFreq)}</span>
      </div>
    </div>
  );
}

/** Modulator spectra: before-BPF (dirty) vs after-BPF (clean), stacked. */
export function ModulatorSpectrumPanel({ view }: { view: ModulatorView }) {
  const drawOne =
    (freq: number[], mag: number[], color: string, yLabel: string) =>
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (freq.length === 0) return;
      const maxMag = Math.max(...mag, 1e-9) * 1.2;
      const ax: Axes = {
        x: linScale([freq[0], freq[freq.length - 1]], [PAD.l, w - PAD.r]),
        y: linScale([0, maxMag], [h - PAD.b, PAD.t]),
      };
      drawAxes(ctx, ax, [freq[0], freq[freq.length - 1]], {
        grid: true,
        domainY: [0, maxMag],
        xLabel: '$f\\,[\\mathrm{Hz}]$',
        yLabel,
      });
      drawLine(ctx, ax, freq, mag, color, 1.5);
    };
  return (
    <div className="analog__am-panel">
      <div className="analog__panel-half">
        <div className="analog__label">{t('analog.mod.dirty')}</div>
        <Canvas
          height={180}
          draw={drawOne(view.dirtyFreq, view.dirtyMag, CHART.orange, '$|V_o(f)|$')}
          deps={[view]}
          ariaLabel={t('analog.mod.dirty')}
        />
      </div>
      <div className="analog__panel-half">
        <div className="analog__label">{t('analog.mod.clean')}</div>
        <Canvas
          height={180}
          draw={drawOne(view.cleanFreq, view.cleanMag, CHART.blue, '$|U(f)|$')}
          deps={[view]}
          ariaLabel={t('analog.mod.clean')}
        />
      </div>
    </div>
  );
}

/** FDM: composite spectrum (red when bands overlap) + recovered channel. */
export function FdmPanel({ view }: { view: FdmView }) {
  const drawSpec = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (view.specFreq.length === 0) return;
    const maxMag = Math.max(...view.specMag, 1e-9) * 1.2;
    const ax: Axes = {
      x: linScale([view.specFreq[0], view.specFreq[view.specFreq.length - 1]], [PAD.l, w - PAD.r]),
      y: linScale([0, maxMag], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [view.specFreq[0], view.specFreq[view.specFreq.length - 1]], {
      grid: true,
      domainY: [0, maxMag],
      xLabel: '$f\\,[\\mathrm{Hz}]$',
      yLabel: '$|U(f)|$',
    });
    drawLine(ctx, ax, view.specFreq, view.specMag, view.overlap ? CHART.red : CHART.blue, 1.5);
  };
  const drawRec = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const lo = Math.min(...view.recovered) * 1.1 - 0.05;
    const hi = Math.max(...view.recovered) * 1.1 + 0.05;
    const ax: Axes = {
      x: linScale([view.time[0], view.time[view.time.length - 1]], [PAD.l, w - PAD.r]),
      y: linScale([lo, hi], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [view.time[0], view.time[view.time.length - 1]], {
      grid: true,
      domainY: [lo, hi],
      xLabel: '$t\\,[\\mathrm{s}]$',
      yLabel: '$\\hat{m}(t)$',
    });
    drawLine(ctx, ax, view.time, view.recovered, CHART.green, 1.8);
  };
  return (
    <div className="analog__am-panel">
      <div className="analog__panel-half">
        <div className="analog__label">{t('analog.mux.fdm.composite')}</div>
        <Canvas height={180} draw={drawSpec} deps={[view]} ariaLabel={t('analog.mux.fdm.composite')} />
      </div>
      <div className="analog__panel-half">
        <div className="analog__label">{t('analog.mux.fdm.recovered')}</div>
        <Canvas height={180} draw={drawRec} deps={[view]} ariaLabel={t('analog.mux.fdm.recovered')} />
      </div>
    </div>
  );
}

/** QAM: each channel's original (green) vs recovered (blue dashed) — shows crosstalk. */
export function QamPanel({ view }: { view: QamView }) {
  const drawCh =
    (orig: number[], rec: number[], yLabel: string) =>
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const all = [...orig, ...rec];
      const lo = Math.min(...all) * 1.1 - 0.05;
      const hi = Math.max(...all) * 1.1 + 0.05;
      const ax: Axes = {
        x: linScale([view.time[0], view.time[view.time.length - 1]], [PAD.l, w - PAD.r]),
        y: linScale([lo, hi], [h - PAD.b, PAD.t]),
      };
      drawAxes(ctx, ax, [view.time[0], view.time[view.time.length - 1]], {
        grid: true,
        domainY: [lo, hi],
        xLabel: '$t\\,[\\mathrm{s}]$',
        yLabel,
      });
      drawLine(ctx, ax, view.time, orig, CHART.green, 2);
      drawLine(ctx, ax, view.time, rec, CHART.blue, 1.6, true);
    };
  return (
    <div className="analog__am-panel">
      <div className="analog__panel-half">
        <div className="analog__label">{t('analog.mux.qam.m1')}</div>
        <Canvas height={180} draw={drawCh(view.m1, view.m1Hat, '$m_1$')} deps={[view]} ariaLabel={t('analog.mux.qam.m1')} />
      </div>
      <div className="analog__panel-half">
        <div className="analog__label">{t('analog.mux.qam.m2')}</div>
        <Canvas height={180} draw={drawCh(view.m2, view.m2Hat, '$m_2$')} deps={[view]} ariaLabel={t('analog.mux.qam.m2')} />
      </div>
    </div>
  );
}
