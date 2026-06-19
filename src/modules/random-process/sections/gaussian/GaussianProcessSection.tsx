import { useMemo, useState } from 'react';
import { Panel, Slider, Formula, TheoryBox, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, shadeRegion, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { gaussianPdf, sampleDist, densityHistogram } from '@/lib/dsp/probability';
import { PAD, PlotTitle, Metric, Legend } from '../prob/probShared';

const DEFAULTS = { s0: 1, w: 6 };
const FMAX = 12;

/** §5.3.1 — Gaussian process: σ² = R_X(0) = ∫S_X(f)df, and each slice is Gaussian. */
export function GaussianProcessSection() {
  const [s0, setS0] = useState(DEFAULTS.s0);
  const [w, setW] = useState(DEFAULTS.w);
  const reset = () => {
    setS0(DEFAULTS.s0);
    setW(DEFAULTS.w);
  };

  const sigma2 = 2 * s0 * w; // ∫ S_X df over [-W, W] at height S0
  const sigma = Math.sqrt(sigma2);

  const slice = useMemo(() => {
    const lo = -4 * sigma;
    const hi = 4 * sigma;
    const xs = Array.from({ length: 240 }, (_, i) => lo + ((hi - lo) * i) / 239);
    const pdf = xs.map((x) => gaussianPdf(x, 0, sigma));
    const draws = sampleDist('gaussian', { m: 0, sigma }, 3000, 55);
    const { centers, density } = densityHistogram(draws, 40, lo, hi);
    const yMax = Math.max(...pdf, ...density, 1e-6) * 1.12;
    return { lo, hi, xs, pdf, centers, density, yMax };
  }, [sigma]);

  const drawPsd = (ctx: CanvasRenderingContext2D, ww: number, h: number) => {
    const yTop = Math.max(0.5, s0) * 1.3;
    const ax: Axes = {
      x: linScale([-FMAX, FMAX], [PAD.l, ww - PAD.r]),
      y: linScale([0, yTop], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [-FMAX, FMAX], {
      xLabel: '$f\\,(\\mathrm{Hz})$',
      yLabel: '$S_X(f)$',
      domainY: [0, yTop],
    });
    shadeRegion(ctx, ax, -w, w, 0, s0, alpha(CHART.blue, 0.22));
    drawLine(ctx, ax, [-FMAX, -w, -w, w, w, FMAX], [0, 0, s0, s0, 0, 0], CHART.blue, 2);
  };

  const drawSlice = (ctx: CanvasRenderingContext2D, ww: number, h: number) => {
    const ax: Axes = {
      x: linScale([slice.lo, slice.hi], [PAD.l, ww - PAD.r]),
      y: linScale([0, slice.yMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [slice.lo, slice.hi], {
      xLabel: '$x$',
      yLabel: '$f_X(x)$',
      domainY: [0, slice.yMax],
    });
    const bw = slice.centers[1] - slice.centers[0];
    const half = (ax.x(bw) - ax.x(0)) / 2;
    for (let i = 0; i < slice.centers.length; i++) {
      const cx = ax.x(slice.centers[i]);
      ctx.fillStyle = alpha(CHART.green, 0.4);
      ctx.fillRect(cx - half, ax.y(slice.density[i]), half * 2, ax.y(0) - ax.y(slice.density[i]));
    }
    drawLine(ctx, ax, slice.xs, slice.pdf, CHART.blue, 2);
  };

  return (
    <div className="rp__section">
      <div className="module-layout">
        <aside className="rp__controls">
          <Panel title={t('rp.gp.controls')}>
            <Slider
              label={<HintText text={t('rp.gp.s0')} />}
              min={0.2}
              max={3}
              step={0.1}
              value={s0}
              onChange={setS0}
            />
            <Slider
              label={<HintText text={t('rp.gp.w')} />}
              min={1}
              max={10}
              step={0.5}
              unit="Hz"
              value={w}
              onChange={setW}
            />
            <div className="rp__reset">
              <button type="button" onClick={reset}>
                {t('rp.gen.reset')}
              </button>
            </div>
          </Panel>
        </aside>

        <div className="rp__content">
          <div className="rp__readouts">
            <Metric label={t('rp.gp.sigma2')} value={sigma2.toFixed(2)} />
          </div>

          <Panel title={t('rp.gp.psd')}>
            <PlotTitle textKey="rp.gp.psd" />
            <Canvas
              height={200}
              draw={drawPsd}
              deps={[s0, w]}
              ariaLabel="Flat band-limited power spectral density"
            />
            <Formula tex="\sigma^2=R_X(0)=\int_{-\infty}^{\infty} S_X(f)\,df=2S_0W" />
          </Panel>

          <Panel title={t('rp.gp.slice')}>
            <PlotTitle textKey="rp.gp.slice" />
            <Canvas
              height={220}
              draw={drawSlice}
              deps={[slice]}
              ariaLabel="Gaussian slice distribution with sample histogram"
            />
            <Legend
              entries={[
                { color: CHART.blue, label: t('rp.gp.trace.pdf') },
                { color: CHART.green, label: t('rp.gp.trace.hist'), block: true },
              ]}
            />
            <TheoryBox>
              <HintText text={t('rp.gp.theory')} />
            </TheoryBox>
          </Panel>
        </div>
      </div>
    </div>
  );
}
