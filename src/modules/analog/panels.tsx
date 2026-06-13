import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawLine, drawStems, drawVLine, drawAxes, drawText, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { t } from '@/i18n';
import type {
  AnalogAmView,
  AnalogFmView,
  AnalogPowerView,
  AnalogDemodView,
  AnalogSuperView,
} from './model';

const PAD = { l: 40, r: 20, t: 20, b: 40 };

/**
 * AM Modulator panel: time-domain + spectrum.
 */
export function AmModulatorPanel({ view }: { view: AnalogAmView }) {
  const drawTimeDomain = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const minVal = Math.min(...view.modulated, ...view.message, ...(view.envelope ?? [0])) * 1.1;
    const maxVal = Math.max(...view.modulated, ...view.message, ...(view.envelope ?? [0])) * 1.1;

    const ax: Axes = {
      x: linScale([view.time[0], view.time[view.time.length - 1]], [PAD.l, w - PAD.r]),
      y: linScale([minVal, maxVal], [h - PAD.b, PAD.t]),
    };

    drawAxes(ctx, ax, [view.time[0], view.time[view.time.length - 1]]);

    // Modulated signal (primary)
    ctx.strokeStyle = CHART.blue;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    drawLine(ctx, ax, view.time, view.modulated, CHART.blue, 1.5);
    ctx.globalAlpha = 1;

    // Envelope (if conventional AM)
    if (view.envelope) {
      ctx.strokeStyle = CHART.orange;
      drawLine(ctx, ax, view.time, view.envelope, CHART.orange, 2, true);
      ctx.strokeStyle = CHART.orange;
      const envNeg = view.envelope.map((e) => -e);
      drawLine(ctx, ax, view.time, envNeg, CHART.orange, 2, true);
    }

    // Message overlay
    ctx.strokeStyle = CHART.green;
    drawLine(ctx, ax, view.time, view.message, CHART.green, 2);

    // Axis labels
    drawText(ctx, ax, view.time[view.time.length - 1], minVal, 't (s)', CHART.dim, 0, 10);
    drawText(ctx, ax, view.time[0], maxVal, 'u(t)', CHART.dim, -30, -5);
  };

  const drawSpectrum = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (view.specFreq.length === 0) return;

    const minFreq = Math.min(...view.specFreq) - Math.max(...view.specFreq) * 0.1;
    const maxFreq = Math.max(...view.specFreq) + Math.max(...view.specFreq) * 0.1;
    const maxMag = Math.max(...view.specMag, 1) * 1.2;

    const ax: Axes = {
      x: linScale([minFreq, maxFreq], [PAD.l, w - PAD.r]),
      y: linScale([0, maxMag], [h - PAD.b, PAD.t]),
    };

    drawAxes(ctx, ax, [minFreq, maxFreq]);

    // Stems for spectral lines
    ctx.strokeStyle = CHART.blue;
    ctx.fillStyle = CHART.blue;
    drawStems(ctx, ax, view.specFreq, view.specMag, CHART.blue, 2);

    // Axis labels
    drawText(ctx, ax, maxFreq, 0, 'f (Hz)', CHART.dim, -30, 10);
    drawText(ctx, ax, minFreq, maxMag, '|H(f)|', CHART.dim, -40, -5);
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

/**
 * FM/PM Modulator panel: constant-envelope + instantaneous frequency + Bessel spectrum.
 */
export function FmModulatorPanel({ view }: { view: AnalogFmView }) {
  const drawModulated = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const minVal = Math.min(...view.modulated) * 1.1;
    const maxVal = Math.max(...view.modulated) * 1.1;

    const ax: Axes = {
      x: linScale([view.time[0], view.time[view.time.length - 1]], [PAD.l, w - PAD.r]),
      y: linScale([minVal, maxVal], [h - PAD.b, PAD.t]),
    };

    drawAxes(ctx, ax, [view.time[0], view.time[view.time.length - 1]]);

    // Modulated signal with varying phase
    ctx.strokeStyle = CHART.blue;
    drawLine(ctx, ax, view.time, view.modulated, CHART.blue, 1.5);

    // Message envelope (scaled for visibility)
    const msgScaled = view.message.map((m) => (m * (maxVal - minVal)) / 2);
    ctx.strokeStyle = CHART.green;
    drawLine(ctx, ax, view.time, msgScaled, CHART.green, 2);

    drawText(ctx, ax, view.time[view.time.length - 1], minVal, 't (s)', CHART.dim, 0, 10);
    drawText(ctx, ax, view.time[0], maxVal, 'u(t)', CHART.dim, -30, -5);
  };

  const drawInstFreq = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const minFreq = Math.min(...view.instantFreq) * 0.95;
    const maxFreq = Math.max(...view.instantFreq) * 1.05;

    const ax: Axes = {
      x: linScale([view.time[0], view.time[view.time.length - 1]], [PAD.l, w - PAD.r]),
      y: linScale([minFreq, maxFreq], [h - PAD.b, PAD.t]),
    };

    drawAxes(ctx, ax, [view.time[0], view.time[view.time.length - 1]]);

    // Instantaneous frequency
    ctx.strokeStyle = CHART.orange;
    drawLine(ctx, ax, view.time, view.instantFreq, CHART.orange, 2);

    drawText(ctx, ax, view.time[view.time.length - 1], minFreq, 't (s)', CHART.dim, 0, 10);
    drawText(ctx, ax, view.time[0], maxFreq, 'fᵢ(t)', CHART.dim, -40, -5);
  };

  const drawBessel = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (view.sidebandFreqs.length === 0) return;

    const minFreq = Math.min(...view.sidebandFreqs) - 2000;
    const maxFreq = Math.max(...view.sidebandFreqs) + 2000;
    const maxMag = Math.max(...view.sidebandMags, 0.5) * 1.2;

    const ax: Axes = {
      x: linScale([minFreq, maxFreq], [PAD.l, w - PAD.r]),
      y: linScale([0, maxMag], [h - PAD.b, PAD.t]),
    };

    drawAxes(ctx, ax, [minFreq, maxFreq]);

    // Bessel sidebands
    ctx.strokeStyle = CHART.blue;
    ctx.fillStyle = CHART.blue;
    drawStems(ctx, ax, view.sidebandFreqs, view.sidebandMags, CHART.blue, 2);

    // Carson bandwidth marker
    drawVLine(
      ctx,
      ax,
      view.sidebandFreqs[0],
      0,
      maxMag,
      CHART.pink,
      true,
      1,
    );
    drawVLine(
      ctx,
      ax,
      view.sidebandFreqs[view.sidebandFreqs.length - 1],
      0,
      maxMag,
      CHART.pink,
      true,
      1,
    );

    drawText(ctx, ax, maxFreq, 0, 'f (Hz)', CHART.dim, -30, 10);
    drawText(ctx, ax, minFreq, maxMag, '|Jₙ(β)|', CHART.dim, -40, -5);
  };

  return (
    <div className="analog__fm-panel">
      <div className="analog__panel-third">
        <div className="analog__label">FM/PM Waveform</div>
        <Canvas
          height={160}
          draw={drawModulated}
          deps={[view]}
          ariaLabel="FM/PM modulated signal"
        />
      </div>
      <div className="analog__panel-third">
        <div className="analog__label">{t('analog.fm.instantFreq')}</div>
        <Canvas
          height={160}
          draw={drawInstFreq}
          deps={[view]}
          ariaLabel="Instantaneous frequency"
        />
      </div>
      <div className="analog__panel-third">
        <div className="analog__label">{t('analog.fm.spectrum')}</div>
        <Canvas
          height={160}
          draw={drawBessel}
          deps={[view]}
          ariaLabel="Bessel sidebands"
        />
      </div>
    </div>
  );
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
    drawLine(ctx, ax, view.time, view.recovered, view.faithful ? CHART.blue : CHART.red, 1.8, !view.faithful);
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
        <Canvas height={200} draw={drawRecovery} deps={[view]} ariaLabel={t('analog.demod.recovered')} />
      </div>
      {view.carrierEst && (
        <div className="analog__panel-half">
          <div className="analog__label">{t('analog.demod.carrier')}</div>
          <Canvas height={200} draw={drawCarrier} deps={[view]} ariaLabel={t('analog.demod.carrier')} />
        </div>
      )}
      {!view.faithful && (
        <div className="analog__warning">{t('analog.demod.warning')}</div>
      )}
    </div>
  );
}

/**
 * Superheterodyne receiver panel: chain blocks + frequency-translation plot.
 */
export function SuperheterodynePanel({ view }: { view: AnalogSuperView }) {
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
  };

  const fmt = (hz: number) => (hz >= 1e6 ? `${(hz / 1e6).toFixed(3)} MHz` : `${(hz / 1e3).toFixed(1)} kHz`);

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
      <Canvas height={220} draw={drawPlan} deps={[view]} ariaLabel={t('analog.super.plan')} />
      <div className="analog__readouts">
        <span className="analog__chain-block">f_LO = {fmt(view.loFreq)}</span>
        <span className="analog__chain-block">f_image = {fmt(view.imageFreq)}</span>
      </div>
    </div>
  );
}
