import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, HintText, InfoCard } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawVLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { demodulationGainDb, fmThresholdCnrDb } from '@/lib/dsp/analognoise';
import { linspace } from '@/lib/dsp/math';
import { Legend, Metric } from '../shared';

const PAD = { l: 48, r: 12, t: 12, b: 30 };
const W = 15000;
const BETAS = [1, 2, 3, 4, 5];
const COLORS = [CHART.blue, CHART.cyan, CHART.green, CHART.orange, CHART.pink];
const FLOOR = -5; // dB display floor: below-threshold collapse plunges here

/** §6.2.1 — FM threshold (Fig. 6.5): output SNR vs baseband SNR, knee at 20(β+1). */
export function ThresholdSection() {
  const [betaSel, setBetaSel] = useState(3);
  const [pmn, setPmn] = useState(0.5);
  const [resetKey, setResetKey] = useState(0);
  const reset = () => {
    setBetaSel(3);
    setPmn(0.5);
    setResetKey((k) => k + 1);
  };

  const data = useMemo(() => {
    const gamma = linspace(0, 40, 161);
    const curves = BETAS.map((b) => {
      const gdb = demodulationGainDb('fm', {
        amIndex: 0,
        beta: b,
        messagePower: pmn,
        emphasis: false,
        W,
      });
      const thr = fmThresholdCnrDb(b);
      const y = gamma.map((g) => {
        const above = g + gdb;
        const val = g >= thr ? above : thr + gdb - (thr - g) * 3; // steep knee below threshold
        return Math.max(val, FLOOR);
      });
      return { b, thr, gdb, y };
    });
    const yMax = Math.max(...curves.flatMap((c) => c.y)) + 3;
    return { gamma, curves, yMax };
  }, [pmn]);

  const sel = data.curves[betaSel - 1];

  const [lo, hi, onWheel, , onPan] = useZoom(0, 40, {
    minSpan: 8,
    maxSpan: 40,
    clampMin: 0,
    clampMax: 40,
  });

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([FLOOR, data.yMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$\\gamma\\,(\\mathrm{dB})$',
      yLabel: '$(S/N)_o\\,(\\mathrm{dB})$',
      domainY: [FLOOR, data.yMax],
    });
    data.curves.forEach((c, i) => {
      drawLine(ctx, ax, data.gamma, c.y, COLORS[i], c.b === betaSel ? 2.6 : 1.3);
    });
    drawVLine(ctx, ax, sel.thr, FLOOR, data.yMax, CHART.dim, true);
  };

  return (
    <div className="an__section">
      <div className="module-layout">
        <aside className="an__controls">
          <Panel title={t('an.thr.title')}>
            <Slider
              label={<HintText text={t('an.thr.betaSel')} />}
              min={1}
              max={5}
              step={1}
              value={betaSel}
              onChange={setBetaSel}
            />
            <Slider
              label={<HintText text="$P_{M_n}$" />}
              min={0.1}
              max={1}
              step={0.05}
              value={pmn}
              onChange={setPmn}
            />
            <div className="an__reset">
              <button type="button" onClick={reset}>
                {t('an.gen.reset')}
              </button>
            </div>
          </Panel>
        </aside>

        <div className="an__content" key={resetKey}>
          <div className="an__readouts">
            <Metric
              label={<HintText text={`$\\gamma_{th}(\\beta=${betaSel})$`} />}
              value={sel.thr.toFixed(1)}
              unit="dB"
            />
            <Metric label={t('an.thr.gain')} value={sel.gdb.toFixed(1)} unit="dB" />
          </div>
          <Panel title={t('an.thr.plot')}>
            <Canvas
              height={250}
              draw={draw}
              deps={[data, betaSel, lo, hi]}
              ariaLabel="FM output SNR versus baseband SNR with threshold knee"
              onWheel={onWheel}
              onPan={onPan}
            />
            <Legend entries={BETAS.map((b, i) => ({ color: COLORS[i], label: `β=${b}` }))} />
          </Panel>
          <div className="info-cards">
            <InfoCard title={t('an.thr.c1.t')} accent="green">
              <HintText text={t('an.thr.c1.b')} />
              <Formula tex="\gamma_{th}=20(\beta+1)" block />
            </InfoCard>
            <InfoCard title={t('an.thr.c2.t')} accent="orange">
              <HintText text={t('an.thr.c2.b')} />
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}
