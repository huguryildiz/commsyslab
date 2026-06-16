import { Fragment, useMemo } from 'react';
import { Canvas } from '@/lib/plot/Canvas';
import {
  linScale,
  drawLine,
  drawVLine,
  drawAxes,
  drawSubText,
  shadeRegion,
  type Axes,
} from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { HintText, Panel } from '@/components';
import { t } from '@/i18n';
import { FDM_PERIOD } from './model';
import { fdmChannelColor } from './FdmBlockDiagram';
import type {
  AnalogAmView,
  AnalogPowerView,
  AnalogDemodView,
  EnvelopeDetectorView,
  AnalogSuperView,
  SuperStage,
  SuperStageId,
  SuperRole,
  ModulatorView,
  FdmView,
  QamView,
} from './model';

const PAD = { l: 40, r: 20, t: 20, b: 40 };

/** Frequency tick formatter: Hz → kHz (e.g. 20000 → "20", 500 → "0.5"). */
const fmtKHz = (hz: number) => Number((hz / 1000).toFixed(3)).toString();

/** Strip inline-math `$` markers for accessible (non-rendered) aria labels. */
const plain = (s: string) => s.replace(/\$/g, '');

export function AmModulatorPanel({ view }: { view: AnalogAmView }) {
  // Shared time-axis zoom for both time-domain plots (m(t) and u(t) share the x-axis).
  const tEnd = view.time[view.time.length - 1];
  const tSpan = tEnd - view.time[0];
  const [tLo, tHi, onWheelT, , onPanT] = useZoom(view.time[0], tEnd, {
    minSpan: tSpan / 8,
    maxSpan: tSpan * 4,
    clampMin: view.time[0],
  });

  // Message spectrum zoom.
  const mfLo0 = view.msgSpecFreq.length > 0 ? view.msgSpecFreq[0] : -5000;
  const mfHi0 = view.msgSpecFreq.length > 0 ? view.msgSpecFreq[view.msgSpecFreq.length - 1] : 5000;
  const mfSpan = mfHi0 - mfLo0;
  const [mfLo, mfHi, onWheelMF, , onPanMF] = useZoom(mfLo0, mfHi0, {
    minSpan: mfSpan / 8,
    maxSpan: mfSpan * 4,
  });

  // AM signal spectrum zoom.
  const sfLo0 = view.specFreq.length > 0 ? view.specFreq[0] : -25000;
  const sfHi0 = view.specFreq.length > 0 ? view.specFreq[view.specFreq.length - 1] : 25000;
  const sfSpan = sfHi0 - sfLo0;
  const [sfLo, sfHi, onWheelSF, , onPanSF] = useZoom(sfLo0, sfHi0, {
    minSpan: sfSpan / 8,
    maxSpan: sfSpan * 4,
  });

  // Top-left: message m(t) time domain (green).
  const drawMsgTime = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const minVal = Math.min(...view.message) * 1.1 - 0.05;
    const maxVal = Math.max(...view.message) * 1.1 + 0.05;
    const ax: Axes = {
      x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
      y: linScale([minVal, maxVal], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [tLo, tHi], {
      grid: true,
      domainY: [minVal, maxVal],
      xLabel: '$t\\,(\\mathrm{s})$',
      yLabel: '$m(t)$',
    });
    drawLine(ctx, ax, view.time, view.message, CHART.green, 2);
  };

  // Top-right: message magnitude spectrum |M(f)| (green).
  const drawMsgSpectrum = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (view.msgSpecFreq.length === 0) return;
    const maxMag = Math.max(...view.msgSpecMag, 1e-9) * 1.2;
    const ax: Axes = {
      x: linScale([mfLo, mfHi], [PAD.l, w - PAD.r]),
      y: linScale([0, maxMag], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [mfLo, mfHi], {
      grid: true,
      domainY: [0, maxMag],
      xLabel: '$f\\,(\\mathrm{kHz})$',
      xTickFormat: fmtKHz,
      yLabel: '$|M(f)|$',
    });
    drawLine(ctx, ax, view.msgSpecFreq, view.msgSpecMag, CHART.green, 1.5);
  };

  // Bottom-left: AM signal u(t) time domain (blue) + envelope (orange dashed).
  const drawAmTime = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const minVal = Math.min(...view.modulated, ...(view.envelope ?? [0])) * 1.1;
    const maxVal = Math.max(...view.modulated, ...(view.envelope ?? [0])) * 1.1;
    const ax: Axes = {
      x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
      y: linScale([minVal, maxVal], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [tLo, tHi], {
      grid: true,
      domainY: [minVal, maxVal],
      xLabel: '$t\\,(\\mathrm{s})$',
      yLabel: '$u(t)$',
    });
    // Modulated signal u(t) (primary, blue).
    drawLine(ctx, ax, view.time, view.modulated, CHART.blue, 1.5);
    // Envelope (conventional AM and DSB-SC, orange dashed, both rails).
    if (view.envelope) {
      drawLine(ctx, ax, view.time, view.envelope, CHART.orange, 2, true);
      drawLine(ctx, ax, view.time, view.envelope.map((e) => -e), CHART.orange, 2, true);
    }
  };

  // Bottom-right: AM signal magnitude spectrum |U(f)| (blue).
  const drawAmSpectrum = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (view.specFreq.length === 0) return;
    const maxMag = Math.max(...view.specMag, 1e-9) * 1.2;
    const ax: Axes = {
      x: linScale([sfLo, sfHi], [PAD.l, w - PAD.r]),
      y: linScale([0, maxMag], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [sfLo, sfHi], {
      grid: true,
      domainY: [0, maxMag],
      xLabel: '$f\\,(\\mathrm{kHz})$',
      xTickFormat: fmtKHz,
      yLabel: '$|U(f)|$',
    });
    drawLine(ctx, ax, view.specFreq, view.specMag, CHART.blue, 1.5);
  };

  return (
    <div className="analog__am-panel">
      <div className="analog__panel-half">
        <div className="analog__plot-title">
          <HintText text={t('analog.am.msgTime')} />
        </div>
        <Canvas
          height={200}
          draw={drawMsgTime}
          deps={[view, tLo, tHi]}
          ariaLabel={plain(t('analog.am.msgTime'))}
          onWheel={onWheelT}
          onPan={onPanT}
        />
      </div>
      <div className="analog__panel-half">
        <div className="analog__plot-title">
          <HintText text={t('analog.am.msgSpectrum')} />
        </div>
        <Canvas
          height={200}
          draw={drawMsgSpectrum}
          deps={[view, mfLo, mfHi]}
          ariaLabel={plain(t('analog.am.msgSpectrum'))}
          onWheel={onWheelMF}
          onPan={onPanMF}
        />
      </div>
      <div className="analog__panel-half">
        <div className="analog__plot-title">
          <HintText text={t('analog.am.amTime')} />
        </div>
        <Canvas
          height={200}
          draw={drawAmTime}
          deps={[view, tLo, tHi]}
          ariaLabel={plain(t('analog.am.amTime'))}
          onWheel={onWheelT}
          onPan={onPanT}
        />
        <div className="analog__legend">
          <span className="analog__legend__item" style={{ color: CHART.blue }}>
            <span className="analog__legend__swatch" />
            <HintText text="$u(t)$" />
          </span>
          {view.envelope && (
            <span className="analog__legend__item" style={{ color: CHART.orange }}>
              <span className="analog__legend__swatch analog__legend__swatch--dashed" />
              {t('analog.am.envelope')}
            </span>
          )}
        </div>
      </div>
      <div className="analog__panel-half">
        <div className="analog__plot-title">
          <HintText text={t('analog.am.amSpectrum')} />
        </div>
        <Canvas
          height={200}
          draw={drawAmSpectrum}
          deps={[view, sfLo, sfHi]}
          ariaLabel={plain(t('analog.am.amSpectrum'))}
          onWheel={onWheelSF}
          onPan={onPanSF}
        />
      </div>
      {view.isOvermodulated && (
        <div className="analog__warning">{t('analog.am.warning.overmod')}</div>
      )}
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
  // Shared time-axis zoom/pan across both demod plots.
  const t0 = view.time[0];
  const t1 = view.time[view.time.length - 1];
  const tSpan = t1 - t0;
  const [tLo, tHi, onWheel, , onPan] = useZoom(t0, t1, {
    minSpan: tSpan / 8,
    maxSpan: tSpan * 4,
    clampMin: t0,
  });

  const drawRecovery = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const all = [...view.original, ...view.recovered];
    const lo = Math.min(...all) * 1.1 - 0.05;
    const hi = Math.max(...all) * 1.1 + 0.05;
    const ax: Axes = {
      x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
      y: linScale([lo, hi], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [tLo, tHi], {
      grid: true,
      domainY: [lo, hi],
      xLabel: '$t\\,(\\mathrm{s})$',
      yLabel: '$m(t)$',
    });
    // Original message (green) vs recovered (blue, dashed/red when distorted).
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
  };

  const drawCarrier = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ct = view.carrierTrue;
    const ce = view.carrierEst;
    if (!ct || !ce) return;
    const ax: Axes = {
      x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
      y: linScale([-1.2, 1.2], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [tLo, tHi], {
      grid: true,
      domainY: [-1.2, 1.2],
      xLabel: '$t\\,(\\mathrm{s})$',
      yLabel: '$\\cos\\hat{\\theta}(t)$',
    });
    drawLine(ctx, ax, view.time, ct, alpha(CHART.dim, 0.8), 1.5);
    drawLine(ctx, ax, view.time, ce, CHART.orange, 1.8);
  };

  return (
    <div className="analog__demod-panel">
      <div className={`analog__panel-half${view.carrierEst ? '' : ' analog__panel-half--full'}`}>
        <div className="analog__label">{t('analog.demod.recovered')}</div>
        <Canvas
          height={200}
          draw={drawRecovery}
          deps={[view, tLo, tHi]}
          ariaLabel={t('analog.demod.recovered')}
          onWheel={onWheel}
          onPan={onPan}
        />
        <div className="analog__legend">
          <span className="analog__legend__item" style={{ color: CHART.green }}>
            <span className="analog__legend__swatch" />
            {t('analog.demod.original')}
          </span>
          <span
            className="analog__legend__item"
            style={{ color: view.faithful ? CHART.blue : CHART.red }}
          >
            <span
              className={`analog__legend__swatch${view.faithful ? '' : ' analog__legend__swatch--dashed'}`}
            />
            {t('analog.demod.recovered')}
          </span>
        </div>
      </div>
      {view.carrierEst && (
        <div className="analog__panel-half">
          <div className="analog__label">{t('analog.demod.carrier')}</div>
          <Canvas
            height={200}
            draw={drawCarrier}
            deps={[view, tLo, tHi]}
            ariaLabel={t('analog.demod.carrier')}
            onWheel={onWheel}
            onPan={onPan}
          />
        </div>
      )}
      {!view.faithful && <div className="analog__warning">{t('analog.demod.warning')}</div>}
    </div>
  );
}

/**
 * Envelope-detector dynamics panel (Proakis Fig 3.28): the AM waveform r(t) the
 * diode sees, the ideal envelope it should follow (green dashed, both rails), and
 * the actual RC capacitor voltage v_C(t) charging to each peak then discharging.
 * The output trace turns red whenever the detector is not tracking faithfully
 * (RC too small/large, or over-modulation). Static view — the RC slider reshapes it.
 */
export function EnvelopeDetectorPanel({ view }: { view: EnvelopeDetectorView }) {
  const t0 = view.time[0];
  const t1 = view.time[view.time.length - 1];
  const tSpan = t1 - t0;
  const [tLo, tHi, onWheel, , onPan] = useZoom(t0, t1, {
    minSpan: tSpan / 8,
    maxSpan: tSpan * 4,
    clampMin: t0,
  });

  // Orange output trace separates it from the faint-blue carrier r(t); turns red
  // when the detector is not tracking faithfully (RC out of range / over-mod).
  const outColor = view.faithful ? CHART.orange : CHART.red;

  const drawDynamics = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const maxAbs = Math.max(
      ...view.rxSignal.map(Math.abs),
      ...view.idealEnvelope.map(Math.abs),
      ...view.rcOutput.map(Math.abs),
      1e-9,
    );
    const lo = -maxAbs * 1.08;
    const hi = maxAbs * 1.08;
    const ax: Axes = {
      x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
      y: linScale([lo, hi], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [tLo, tHi], {
      grid: true,
      domainY: [lo, hi],
      xLabel: '$t\\,(\\mathrm{s})$',
      yLabel: '$r(t),\\ \\hat{m}(t)$',
    });
    // r(t): the busy AM waveform the diode rectifies (faint, de-emphasized).
    drawLine(ctx, ax, view.time, view.rxSignal, alpha(CHART.blue, 0.32), 1);
    // Ideal envelope target on both rails (green dashed).
    drawLine(ctx, ax, view.time, view.idealEnvelope, CHART.green, 1.6, true);
    drawLine(
      ctx,
      ax,
      view.time,
      view.idealEnvelope.map((e) => -e),
      CHART.green,
      1.6,
      true,
    );
    // Detector output v_C(t): charge/discharge sawtooth (blue good / red distorted).
    drawLine(ctx, ax, view.time, view.rcOutput, outColor, 2.2);
    // Marker dot riding the latest capacitor voltage at the right visible edge.
    let idx = view.time.length - 1;
    while (idx > 0 && view.time[idx] > tHi) idx--;
    ctx.fillStyle = CHART.pink;
    ctx.shadowColor = CHART.pink;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ax.x(view.time[idx]), ax.y(view.rcOutput[idx]), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  return (
    <div className="analog__demod-panel">
      <div className="analog__panel-half analog__panel-half--full">
        <div className="analog__label">{t('analog.demod.dynamics')}</div>
        <Canvas
          height={240}
          draw={drawDynamics}
          deps={[view, tLo, tHi]}
          ariaLabel={t('analog.demod.dynamics')}
          onWheel={onWheel}
          onPan={onPan}
        />
        <div className="analog__legend">
          <span className="analog__legend__item" style={{ color: alpha(CHART.blue, 0.7) }}>
            <span className="analog__legend__swatch" />
            <HintText text="$r(t)$" />
          </span>
          <span className="analog__legend__item" style={{ color: CHART.green }}>
            <span className="analog__legend__swatch analog__legend__swatch--dashed" />
            {t('analog.demod.envelopeTarget')}
          </span>
          <span className="analog__legend__item" style={{ color: outColor }}>
            <span className="analog__legend__swatch" />
            <HintText text={t('analog.demod.detectorOut')} />
          </span>
        </div>
      </div>
      {!view.faithful && (
        <div className="analog__warning">{t(`analog.demod.regime.${view.regime}`)}</div>
      )}
    </div>
  );
}

/** i18n title key for each chain block. */
const SUPER_TITLE: Record<SuperStageId, string> = {
  rf: 'analog.super.rf',
  mixer: 'analog.super.mixer',
  if: 'analog.super.iffilter',
  detector: 'analog.super.detector',
  audio: 'analog.super.audio',
};

/**
 * One filmstrip cell: the magnitude spectrum at a single point in the chain.
 * Each spectral component is drawn as a lobe of bandwidth 2W (not a bare line),
 * so message bandwidth is visible. Owns its own zoom/pan over the stage axis.
 */
function StageSpectrum({
  stage,
  W,
  title,
  caption,
  active,
}: {
  stage: SuperStage;
  W: number;
  title: string;
  caption: string;
  active: boolean;
}) {
  const [a0, a1] = stage.axis;
  const span = a1 - a0;
  const [lo, hi, onWheel, , onPan] = useZoom(a0, a1, {
    minSpan: span / 8,
    maxSpan: span * 4,
  });

  // Short in-canvas notation for the key lobes (plain text, matching book symbols).
  const labelFor = (role: SuperRole): string => {
    if (stage.id === 'rf') return role === 'wanted' ? 'f_c' : role === 'image' ? 'f_img' : '';
    if (stage.id === 'mixer')
      return role === 'wanted' ? 'f_IF' : role === 'discard' ? 'Σ' : role === 'image' ? '✗' : '';
    if (stage.id === 'if') return role === 'wanted' ? '455' : '';
    return '';
  };

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([0, 1.2], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      grid: true,
      domainY: [0, 1.2],
      xLabel: '$f\\,(\\mathrm{kHz})$',
      xTickFormat: fmtKHz,
      yLabel: stage.baseband ? '$|M(f)|$' : '$|U(f)|$',
    });
    // Filter passband window, mirrored to ±f (shaded blue + dashed edges).
    if (stage.passband) {
      const [pb0, pb1] = stage.passband;
      for (const [w0, w1] of [
        [pb0, pb1],
        [-pb1, -pb0],
      ]) {
        shadeRegion(ctx, ax, w0, w1, 0, 1.2, alpha(CHART.blue, 0.13));
        drawVLine(ctx, ax, w0, 0, 1.2, alpha(CHART.blue, 0.55), true, 1);
        drawVLine(ctx, ax, w1, 0, 1.2, alpha(CHART.blue, 0.55), true, 1);
      }
    }
    // Local-oscillator reference lines (mixer stage), at ±f_LO.
    if (stage.loMark !== undefined) {
      drawVLine(ctx, ax, stage.loMark, 0, 1.1, alpha(CHART.orange, 0.9), true, 1.5);
      drawVLine(ctx, ax, -stage.loMark, 0, 1.1, alpha(CHART.orange, 0.9), true, 1.5);
      drawSubText(ctx, ax, stage.loMark, 1.1, 'f_LO', CHART.orange, 2, -4);
    }
    // Spectral lobes, mirrored to ±f: wanted (green), image (red), other/discard (grey).
    for (const s of stage.stations) {
      const color =
        s.role === 'wanted' ? CHART.green : s.role === 'image' ? CHART.red : alpha(CHART.dim, 0.55);
      const width = s.role === 'other' || s.role === 'discard' ? 1.3 : 2.2;
      if (stage.baseband) {
        // Symmetric baseband lobe |M(f)|: full tent across [-W, W].
        drawLine(ctx, ax, [-W, 0, W], [0, s.amp, 0], color, width);
      } else {
        for (const c of [s.freq, -s.freq]) {
          drawLine(ctx, ax, [c - W, c, c + W], [0, s.amp, 0], color, width);
        }
      }
      const lbl = labelFor(s.role);
      if (lbl && !stage.baseband) drawSubText(ctx, ax, s.freq, s.amp, lbl, color, 4, -8);
    }
  };

  return (
    <div className={`analog__stage${active ? ' analog__stage--active' : ''}`}>
      <div className="analog__stage-head">
        <span className="analog__stage-title">{title}</span>
        <span className="analog__stage-cap">{caption}</span>
      </div>
      <Canvas
        height={150}
        draw={draw}
        deps={[stage, lo, hi]}
        ariaLabel={`${title} — ${caption}`}
        onWheel={onWheel}
        onPan={onPan}
      />
    </div>
  );
}

/**
 * Superheterodyne receiver panel: the signal's journey RF → Mixer → IF →
 * Detector → Audio as a five-stage spectral filmstrip. A highlight sweeps the
 * chain (animation-first); the IF cell stays pinned at 455 kHz however the
 * station is tuned — the core lesson of the superheterodyne architecture.
 */
export function SuperheterodynePanel({
  view,
  clock = 0,
}: {
  view: AnalogSuperView;
  clock?: number;
}) {
  // Sweep a highlight left → right across the chain, one stage at a time.
  const sweep = (((clock * 0.3) % 1) + 1) % 1;
  const activeIdx = Math.min(view.stages.length - 1, Math.floor(sweep * view.stages.length));

  const ifKHz = (view.ifFreq / 1000).toFixed(0);

  return (
    <div className="analog__super-panel">
      <div className="analog__chain">
        {view.stages.map((stage, i) => (
          <Fragment key={stage.id}>
            <span
              className={`analog__chain-block${i === activeIdx ? ' analog__chain-block--active' : ''}`}
            >
              {t(SUPER_TITLE[stage.id])}
            </span>
            {i < view.stages.length - 1 && <span className="analog__chain-arrow">→</span>}
          </Fragment>
        ))}
      </div>

      <div className="analog__filmstrip">
        {view.stages.map((stage, i) => (
          // Key by axis so a cell remounts (re-fits its zoom) when a control
          // changes its frequency window, but not on every animation tick.
          <StageSpectrum
            key={`${stage.id}-${Math.round(stage.axis[0])}-${Math.round(stage.axis[1])}`}
            stage={stage}
            W={view.W}
            title={t(SUPER_TITLE[stage.id])}
            caption={t(`analog.super.cap.${stage.id}`)}
            active={i === activeIdx}
          />
        ))}
      </div>

      <div className="analog__legend">
        <span className="analog__legend__item" style={{ color: CHART.green }}>
          <span className="analog__legend__swatch" />
          {t('analog.super.legend.wanted')}
        </span>
        {view.showImage && (
          <span className="analog__legend__item" style={{ color: CHART.red }}>
            <span className="analog__legend__swatch" />
            {t('analog.super.legend.image')}
          </span>
        )}
        <span className="analog__legend__item" style={{ color: CHART.dim }}>
          <span className="analog__legend__swatch" />
          {t('analog.super.legend.other')}
        </span>
        <span className="analog__legend__item" style={{ color: CHART.blue }}>
          <span className="analog__legend__swatch analog__legend__swatch--block" />
          {t('analog.super.legend.window')}
        </span>
      </div>

      <div className="analog__super-callout">
        <HintText text={`$f_{\\mathrm{IF}}$ = ${ifKHz} kHz · ${t('analog.super.ifLock')}`} />
      </div>

{view.imageSurvives && <div className="analog__warning">{t('analog.super.collision')}</div>}
    </div>
  );
}

/** Modulator spectra: before-BPF (dirty) vs after-BPF (clean), stacked. */
export function ModulatorSpectrumPanel({ view }: { view: ModulatorView }) {
  // Both spectra share the same one-sided frequency axis → one shared zoom/pan.
  const f1 = view.dirtyFreq.length > 0 ? view.dirtyFreq[view.dirtyFreq.length - 1] : 1;
  const fSpan = f1 * 2; // symmetric around 0
  const [fLo, fHi, onWheel, , onPan] = useZoom(-f1, f1, {
    minSpan: fSpan / 8,
    maxSpan: fSpan * 4,
  });

  const drawOne =
    (freq: number[], mag: number[], color: string, yLabel: string) =>
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (freq.length === 0) return;
      const maxMag = Math.max(...mag, 1e-9) * 1.2;
      const ax: Axes = {
        x: linScale([fLo, fHi], [PAD.l, w - PAD.r]),
        y: linScale([0, maxMag], [h - PAD.b, PAD.t]),
      };
      drawAxes(ctx, ax, [fLo, fHi], {
        grid: true,
        domainY: [0, maxMag],
        xLabel: '$f\\,(\\mathrm{kHz})$',
        xTickFormat: fmtKHz,
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
          deps={[view, fLo, fHi]}
          ariaLabel={t('analog.mod.dirty')}
          onWheel={onWheel}
          onPan={onPan}
        />
      </div>
      <div className="analog__panel-half">
        <div className="analog__label">{t('analog.mod.clean')}</div>
        <Canvas
          height={180}
          draw={drawOne(view.cleanFreq, view.cleanMag, CHART.blue, '$|U(f)|$')}
          deps={[view, fLo, fHi]}
          ariaLabel={t('analog.mod.clean')}
          onWheel={onWheel}
          onPan={onPan}
        />
      </div>
    </div>
  );
}

/**
 * FDM: composite spectrum with per-channel coloured bands that appear in sync
 * with the block-diagram packets, plus the recovered channel overlaid on its
 * original message. Bands turn red when spacing < 2W (adjacent-band overlap).
 */
export function FdmPanel({ view, clock }: { view: FdmView; clock: number }) {
  // One-sided frequency-axis zoom for the composite spectrum.
  const f1 = view.fMax;
  const [fLo, fHi, onWheelF, , onPanF] = useZoom(0, f1, {
    minSpan: f1 / 8,
    maxSpan: f1 * 1.2,
    clampMin: 0,
  });
  // Time-axis zoom for the recovered channel.
  const t0 = view.time[0];
  const t1 = view.time[view.time.length - 1];
  const tSpan = t1 - t0;
  const [tLo, tHi, onWheelT, , onPanT] = useZoom(t0, t1, {
    minSpan: tSpan / 8,
    maxSpan: tSpan * 4,
    clampMin: t0,
  });

  // Animation phase (matches FdmBlockDiagram): band k reveals once cp ≥ reveal_k.
  const cp = (((clock / FDM_PERIOD) % 1) + 1) % 1;

  // Per-channel source messages mₖ(t) = cos(2π fₘₖ t) — single tone each (§3.4.1).
  const messages = useMemo(
    () =>
      view.messageFreqs.map((fmk) => view.time.map((tt) => Math.cos(2 * Math.PI * fmk * tt))),
    [view],
  );

  // One mini-plot per channel, drawn in its signal colour, sharing the recovered
  // time-axis zoom so all rows stay aligned.
  const drawMsg =
    (k: number) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const ax: Axes = {
        x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
        y: linScale([-1.15, 1.15], [h - PAD.b, PAD.t]),
      };
      drawAxes(ctx, ax, [tLo, tHi], {
        grid: true,
        domainY: [-1.15, 1.15],
        xLabel: '$t\\,(\\mathrm{s})$',
        yLabel: `$m_{${k}}(t)$`,
      });
      drawLine(ctx, ax, view.time, messages[k], fdmChannelColor(k), 1.8);
    };

  const drawSpec = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (view.specFreq.length === 0) return;
    const maxMag = Math.max(...view.specMag, 1e-9) * 1.2;
    const ax: Axes = {
      x: linScale([fLo, fHi], [PAD.l, w - PAD.r]),
      y: linScale([0, maxMag], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [fLo, fHi], {
      grid: true,
      domainY: [0, maxMag],
      xLabel: '$f\\,(\\mathrm{kHz})$',
      xTickFormat: fmtKHz,
      yLabel: '$|U(f)|$',
    });

    // Faint slot shading per channel band (always visible — shows the allocation).
    view.bands.forEach((b, k) => {
      const x0 = ax.x(Math.max(b.lo, fLo));
      const x1 = ax.x(Math.min(b.hi, fHi));
      if (x1 <= x0) return;
      const base = view.overlap ? CHART.red : fdmChannelColor(k);
      ctx.fillStyle = alpha(base, k === view.selected ? 0.14 : 0.06);
      ctx.fillRect(x0, PAD.t, x1 - x0, h - PAD.b - PAD.t);
    });

    // Dim baseline trace, then over-draw each revealed band in its channel colour.
    drawLine(ctx, ax, view.specFreq, view.specMag, alpha(CHART.dim, 0.5), 1);
    view.bands.forEach((b, k) => {
      if (cp < b.reveal) return;
      const i0 = view.specFreq.findIndex((f) => f >= b.lo);
      let i1 = view.specFreq.findIndex((f) => f > b.hi);
      if (i1 === -1) i1 = view.specFreq.length;
      if (i0 < 0 || i1 <= i0) return;
      const col = view.overlap ? CHART.red : fdmChannelColor(k);
      drawLine(
        ctx,
        ax,
        view.specFreq.slice(i0, i1),
        view.specMag.slice(i0, i1),
        col,
        k === view.selected ? 2.5 : 1.5,
      );
    });
  };

  const drawRec = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const all = [...view.recovered, ...view.original];
    const lo = Math.min(...all) * 1.1 - 0.05;
    const hi = Math.max(...all) * 1.1 + 0.05;
    const ax: Axes = {
      x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
      y: linScale([lo, hi], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [tLo, tHi], {
      grid: true,
      domainY: [lo, hi],
      xLabel: '$t\\,(\\mathrm{s})$',
      yLabel: '$\\hat{m}(t)$',
    });
    // Original selected message (green dashed) vs recovered (blue, red when overlapping).
    drawLine(ctx, ax, view.time, view.original, alpha(CHART.green, 0.8), 1.6, true);
    drawLine(ctx, ax, view.time, view.recovered, view.overlap ? CHART.red : CHART.blue, 1.8);
  };

  return (
    <Fragment>
      {/* Source messages mₖ(t) — one column per channel, in its signal colour. */}
      <Panel title={t('analog.mux.fdm.sources')}>
        <div
          className="analog__fdm-messages"
          style={{ gridTemplateColumns: `repeat(${messages.length}, minmax(0, 1fr))` }}
        >
          {messages.map((_, k) => (
            <div className="analog__panel-third" key={k}>
              <div className="analog__label" style={{ color: fdmChannelColor(k), textTransform: 'none' }}>
                <HintText text={`$m_{${k}}(t)$`} />
              </div>
              <Canvas
                height={150}
                draw={drawMsg(k)}
                deps={[view, tLo, tHi]}
                ariaLabel={`m_${k}(t)`}
                onWheel={onWheelT}
                onPan={onPanT}
              />
            </div>
          ))}
        </div>
      </Panel>

      <div className="analog__am-panel">
        <Panel title={t('analog.mux.fdm.composite')}>
          <Canvas
            height={200}
            draw={drawSpec}
            deps={[view, fLo, fHi, cp]}
            ariaLabel={t('analog.mux.fdm.composite')}
            onWheel={onWheelF}
            onPan={onPanF}
          />
        </Panel>
        <Panel title={t('analog.mux.fdm.recovered')}>
          <Canvas
            height={200}
            draw={drawRec}
            deps={[view, tLo, tHi]}
            ariaLabel={t('analog.mux.fdm.recovered')}
            onWheel={onWheelT}
            onPan={onPanT}
          />
          <div className="analog__legend">
            <span className="analog__legend__item" style={{ color: CHART.green }}>
              <span className="analog__legend__swatch analog__legend__swatch--dashed" />
              {t('analog.mux.fdm.original')}
            </span>
            <span
              className="analog__legend__item"
              style={{ color: view.overlap ? CHART.red : CHART.blue }}
            >
              <span className="analog__legend__swatch" />
              {t('analog.mux.fdm.recovered')}
            </span>
          </div>
        </Panel>
      </div>
    </Fragment>
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
        xLabel: '$t\\,(\\mathrm{s})$',
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
