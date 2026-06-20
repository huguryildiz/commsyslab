import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, HintText, InfoCard } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawVLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { noiseFloorN0, thermalNoisePower } from '@/lib/dsp/linkbudget';
import { linspace } from '@/lib/dsp/math';
import { Metric } from '../shared';

const PAD = { l: 52, r: 12, t: 12, b: 30 };

/** §6.4.1 — thermal noise: N₀ = kT, P_n = kTB, T₀ = 290 K floor. */
export function ThermalNoiseSection() {
  const [tempK, setTempK] = useState(290);
  const [bKhz, setBKhz] = useState(4);
  const [resetKey, setResetKey] = useState(0);
  const reset = () => {
    setTempK(290);
    setBKhz(4);
    setResetKey((k) => k + 1);
  };

  const n0 = noiseFloorN0(tempK);
  const pn = thermalNoisePower(tempK, bKhz * 1000);

  const data = useMemo(() => {
    const ts = linspace(50, 400, 200);
    return { ts, n0s: ts.map((T) => noiseFloorN0(T) / 1e-21) }; // scaled to 1e-21 W/Hz
  }, []);

  const [lo, hi, onWheel, , onPan] = useZoom(50, 400, { minSpan: 50, maxSpan: 350, clampMin: 0 });

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const yMax = (noiseFloorN0(400) / 1e-21) * 1.1;
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([0, yMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$T\\,(\\mathrm{K})$',
      yLabel: '$N_0\\,(10^{-21}\\,\\mathrm{W/Hz})$',
      domainY: [0, yMax],
    });
    drawLine(ctx, ax, data.ts, data.n0s, CHART.blue, 2);
    drawVLine(ctx, ax, tempK, 0, yMax, CHART.dim, true);
  };

  return (
    <div className="an__section">
      <div className="module-layout">
        <aside className="an__controls">
          <Panel title={t('an.thermal.title')}>
            <Slider
              label={<HintText text={t('an.thermal.temp')} />}
              min={50}
              max={400}
              step={5}
              unit="K"
              value={tempK}
              onChange={setTempK}
            />
            <Slider
              label={<HintText text={t('an.thermal.bw')} />}
              min={1}
              max={1000}
              step={1}
              unit="kHz"
              value={bKhz}
              onChange={setBKhz}
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
            <Metric label={<HintText text="$N_0=kT$" />} value={n0.toExponential(2)} unit="W/Hz" />
            <Metric label={<HintText text="$P_n=kTB$" />} value={pn.toExponential(2)} unit="W" />
            <Metric label={<HintText text="$T_0$ floor" />} value="4.0e-21" unit="W/Hz" />
          </div>
          <Panel title={<HintText text={t('an.thermal.plot')} />}>
            <Canvas
              height={220}
              draw={draw}
              deps={[data, tempK, lo, hi]}
              ariaLabel="Thermal noise PSD versus temperature"
              onWheel={onWheel}
              onPan={onPan}
            />
          </Panel>
          <div className="info-cards">
            <InfoCard title={t('an.thermal.c1.t')} accent="blue">
              <HintText text={t('an.thermal.c1.b')} />
              <Formula tex="N_0=kT,\quad P_n=kTB,\quad k=1.38\times10^{-23}\,\mathrm{J/K}" block />
            </InfoCard>
            <InfoCard title={t('an.thermal.c2.t')} accent="orange">
              <HintText text={t('an.thermal.c2.b')} />
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}
