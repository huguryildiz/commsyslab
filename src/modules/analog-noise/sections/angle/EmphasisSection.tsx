import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawVLine, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { preEmphasisMagDb, deEmphasisMagDb, emphasisSnrGainDb } from '@/lib/dsp/analog';
import { angleNoisePsd } from '@/lib/dsp/analognoise';
import { linspace } from '@/lib/dsp/math';
import { Legend, Metric } from '../shared';

const PAD = { l: 48, r: 12, t: 12, b: 30 };
const FMAX = 20000; // fixed display band: 0–20 kHz

/** §6.2.2 — pre/de-emphasis: filter responses + noise PSD before/after; Eq. 6.2.42 gain. */
export function EmphasisSection() {
  const [wKhz, setWKhz] = useState(15);
  const [tauUs, setTauUs] = useState(75);
  const [resetKey, setResetKey] = useState(0);
  const reset = () => {
    setWKhz(15);
    setTauUs(75);
    setResetKey((k) => k + 1);
  };

  const f1 = 1 / (2 * Math.PI * tauUs * 1e-6);

  const data = useMemo(() => {
    const freqs = linspace(20, FMAX, 200);
    const preDb = preEmphasisMagDb(freqs, f1);
    const deDb = deEmphasisMagDb(freqs, f1);
    const before = angleNoisePsd(freqs, 'fm', 1, 1); // ∝ f²
    const maxB = Math.max(...before, 1e-12);
    const beforeN = before.map((v) => v / maxB);
    const afterN = before.map((v, i) => (v / maxB) * 10 ** (deDb[i] / 10));
    return { fk: freqs.map((f) => f / 1000), preDb, deDb, beforeN, afterN };
  }, [f1]);

  const gainDb = emphasisSnrGainDb(f1, wKhz * 1000);

  const [lo, hi, onWheel, , onPan] = useZoom(0, 20, {
    minSpan: 2,
    maxSpan: 20,
    clampMin: 0,
    clampMax: 20,
  });

  const drawFilter = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const yMax = Math.max(...data.preDb) + 2;
    const yMin = Math.min(...data.deDb) - 2;
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([yMin, yMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$f\\,(\\mathrm{kHz})$',
      yLabel: '$|H(f)|\\,(\\mathrm{dB})$',
      domainY: [yMin, yMax],
    });
    drawLine(ctx, ax, data.fk, data.preDb, CHART.green, 2);
    drawLine(ctx, ax, data.fk, data.deDb, CHART.blue, 2);
    drawVLine(ctx, ax, f1 / 1000, yMin, yMax, CHART.dim, true);
  };
  const drawNoise = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([lo, hi], [PAD.l, w - PAD.r]),
      y: linScale([0, 1.1], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [lo, hi], {
      xLabel: '$f\\,(\\mathrm{kHz})$',
      yLabel: '$S_n(f)\\ (\\mathrm{norm.})$',
      domainY: [0, 1.1],
    });
    drawLine(ctx, ax, data.fk, data.beforeN, CHART.pink, 2);
    drawLine(ctx, ax, data.fk, data.afterN, CHART.blue, 2);
    drawVLine(ctx, ax, wKhz, 0, 1.1, CHART.dim, true);
  };

  return (
    <div className="an__section">
      <div className="module-layout">
        <aside className="an__controls">
          <Panel title={t('an.emph.title')}>
            <Slider
              label={<HintText text={t('an.emph.W')} />}
              min={5}
              max={20}
              step={1}
              unit="kHz"
              value={wKhz}
              onChange={setWKhz}
            />
            <Slider
              label={<HintText text={t('an.emph.tau')} />}
              min={25}
              max={75}
              step={5}
              unit="µs"
              value={tauUs}
              onChange={setTauUs}
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
            <Metric label={<HintText text="$f_1$" />} value={f1.toFixed(0)} unit="Hz" />
            <Metric label={t('an.emph.gain')} value={gainDb.toFixed(1)} unit="dB" />
          </div>
          <Panel title={t('an.emph.filter')}>
            <Canvas
              height={190}
              draw={drawFilter}
              deps={[data, f1, lo, hi]}
              ariaLabel="Pre- and de-emphasis magnitude responses"
              onWheel={onWheel}
              onPan={onPan}
            />
            <Legend
              entries={[
                { color: CHART.green, label: t('an.emph.trace.pre') },
                { color: CHART.blue, label: t('an.emph.trace.de') },
              ]}
            />
          </Panel>
          <Panel title={t('an.emph.noise')}>
            <Canvas
              height={190}
              draw={drawNoise}
              deps={[data, wKhz, lo, hi]}
              ariaLabel="FM output noise PSD before and after de-emphasis"
              onWheel={onWheel}
              onPan={onPan}
            />
            <Legend
              entries={[
                { color: CHART.pink, label: t('an.emph.trace.before') },
                { color: CHART.blue, label: t('an.emph.trace.after') },
              ]}
            />
            <Formula
              tex="H_d(f)=\dfrac{1}{1+j f/f_1},\quad \text{gain}=\dfrac{(W/f_1)^3}{3\,[\,W/f_1-\arctan(W/f_1)\,]}"
              block
            />
          </Panel>

        </div>
      </div>
    </div>
  );
}
