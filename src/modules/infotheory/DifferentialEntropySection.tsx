import { useState } from 'react';
import { Panel, Slider, Segmented, Readout, Formula, TheoryBox, InfoCard } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawText, type Axes } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import {
  differentialEntropyUniform,
  differentialEntropyGaussian,
  differentialEntropyNumeric,
} from '@/lib/dsp/entropy';
import { t } from '@/i18n';

type Dist = 'uniform' | 'gaussian';
const PAD = { l: 46, r: 16, t: 16, b: 38 };
const A_MIN = 0.2;
const A_MAX = 4;
const S_MIN = 0.1;
const S_MAX = 3;

function pdfAt(dist: Dist, param: number, x: number): number {
  if (dist === 'uniform') return x >= 0 && x <= param ? 1 / param : 0;
  return Math.exp(-(x * x) / (2 * param * param)) / (param * Math.sqrt(2 * Math.PI));
}

function hClosed(dist: Dist, param: number): number {
  return dist === 'uniform'
    ? differentialEntropyUniform(param)
    : differentialEntropyGaussian(param);
}

export function DifferentialEntropySection() {
  const [dist, setDist] = useState<Dist>('gaussian');
  const [param, setParam] = useState(1);
  const [resetKey, setResetKey] = useState(0);

  const reset = () => {
    setDist('gaussian');
    setParam(1);
    setResetKey((k) => k + 1);
  };

  const h = hClosed(dist, param);
  const xlo = dist === 'uniform' ? -0.5 : -10;
  const xhi = dist === 'uniform' ? A_MAX + 0.5 : 10;
  const numeric = differentialEntropyNumeric((x) => pdfAt(dist, param, x), xlo, xhi);

  return (
    <div className="module-layout">
      <aside className="it-controls">
        <Panel title={t('it.diff.title')}>
          <Segmented<Dist>
            ariaLabel={t('it.diff.dist')}
            value={dist}
            options={[
              { value: 'uniform', label: t('it.diff.uniform') },
              { value: 'gaussian', label: t('it.diff.gaussian') },
            ]}
            onChange={(v) => {
              setDist(v);
              setParam(v === 'uniform' ? 1.5 : 1);
            }}
          />
          {dist === 'uniform' ? (
            <Slider
              label="a"
              value={param}
              min={A_MIN}
              max={A_MAX}
              step={0.05}
              precision={2}
              onChange={setParam}
            />
          ) : (
            <Slider
              label="σ"
              value={param}
              min={S_MIN}
              max={S_MAX}
              step={0.05}
              precision={2}
              onChange={setParam}
            />
          )}
          <button type="button" onClick={reset}>
            {t('it.lz.reset')}
          </button>
        </Panel>
      </aside>

      <div className="it-content">
        <div className="it-readouts">
          <Readout
            label={t('it.diff.h')}
            value={h.toFixed(4)}
            unit="bits"
            tone={h < 0 ? 'warn' : 'ok'}
          />
          <Readout label={t('it.diff.hnum')} value={numeric.toFixed(4)} unit="bits" />
        </div>

        <DiffPlots key={`${dist}-${resetKey}`} dist={dist} param={param} h={h} />

        <div className="info-cards">
          <InfoCard title={t('it.diff.card.diff')} accent="green">
            <p>{t('it.diff.card.diffBody')}</p>
            <Formula tex="h(X)=-\int f_X(x)\log_2 f_X(x)\,dx" block />
          </InfoCard>
          <InfoCard title={t('it.diff.card.negative')} accent="orange">
            <p>{t('it.diff.card.negativeBody')}</p>
          </InfoCard>
          <InfoCard title={t('it.diff.card.maxgauss')} accent="green">
            <p>{t('it.diff.card.maxgaussBody')}</p>
          </InfoCard>
          <InfoCard title={t('it.diff.card.mi')} accent="blue">
            <p>{t('it.diff.card.miBody')}</p>
          </InfoCard>
        </div>

        <TheoryBox title={t('it.theory.title')}>
          <Formula tex="h(X)=-\int_{-\infty}^{\infty} f_X(x)\log_2 f_X(x)\,dx" block />
          <Formula tex="X\sim\mathrm{Uniform}[0,a]:\quad h(X)=\log_2 a" block />
          <Formula tex="X\sim\mathcal{N}(0,\sigma^2):\quad h(X)=\tfrac12\log_2(2\pi e\,\sigma^2)" block />
          <Formula tex="I(X;Y)=h(Y)-h(Y\mid X)=h(X)-h(X\mid Y)" block />
        </TheoryBox>
      </div>
    </div>
  );
}

interface DiffPlotsProps {
  dist: Dist;
  param: number;
  h: number;
}

/** PDF plot + h-vs-parameter plot. Owns two useZoom instances (remounted via key on reset). */
function DiffPlots({ dist, param, h }: DiffPlotsProps) {
  const xlo = dist === 'uniform' ? -0.5 : -10;
  const xhi = dist === 'uniform' ? A_MAX + 0.5 : 10;
  const plo = dist === 'uniform' ? A_MIN : S_MIN;
  const phi = dist === 'uniform' ? A_MAX : S_MAX;

  const [zlo, zhi, onWheel, , onPan] = useZoom(xlo, xhi, {
    minSpan: 0.5,
    maxSpan: (xhi - xlo) * 4,
  });
  const [plo2, phi2, onWheelP, , onPanP] = useZoom(plo, phi, {
    minSpan: 0.3,
    maxSpan: (phi - plo) * 4,
    clampMin: 0,
  });

  // Sample the PDF across the zoomed x-range.
  const N = 400;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= N; i++) {
    const x = zlo + ((zhi - zlo) * i) / N;
    xs.push(x);
    ys.push(pdfAt(dist, param, x));
  }
  const yMax = Math.max(0.05, ...ys) * 1.2;

  // h(X) vs parameter, plus the zero-crossing marker.
  const M = 200;
  const ps: number[] = [];
  const hs: number[] = [];
  for (let i = 0; i <= M; i++) {
    const p = plo2 + ((phi2 - plo2) * i) / M;
    ps.push(p);
    hs.push(hClosed(dist, p));
  }
  const hMin = Math.min(-0.5, ...hs);
  const hMax = Math.max(0.5, ...hs);
  const zeroParam = dist === 'uniform' ? 1 : 1 / Math.sqrt(2 * Math.PI * Math.E);

  return (
    <>
      <Panel title={t('it.diff.pdf')}>
        <Canvas
          height={220}
          ariaLabel="Probability density function of the continuous source"
          deps={[dist, param, zlo, zhi]}
          onWheel={onWheel}
          onPan={onPan}
          draw={(ctx, w, hgt) => {
            const yDom: [number, number] = [0, yMax];
            const ax: Axes = {
              x: linScale([zlo, zhi], [PAD.l, w - PAD.r]),
              y: linScale(yDom, [hgt - PAD.b, PAD.t]),
            };
            drawAxes(ctx, ax, [zlo, zhi], { xLabel: '$x$', yLabel: '$f_X(x)$', domainY: yDom });
            drawLine(ctx, ax, xs, ys, CHART.green, 2);
          }}
        />
      </Panel>

      <Panel title={t('it.diff.curve')}>
        <Canvas
          height={220}
          ariaLabel="Differential entropy versus distribution parameter"
          deps={[dist, param, plo2, phi2, h]}
          onWheel={onWheelP}
          onPan={onPanP}
          draw={(ctx, w, hgt) => {
            const yDom: [number, number] = [hMin, hMax];
            const ax: Axes = {
              x: linScale([plo2, phi2], [PAD.l, w - PAD.r]),
              y: linScale(yDom, [hgt - PAD.b, PAD.t]),
            };
            drawAxes(ctx, ax, [plo2, phi2], {
              xLabel: dist === 'uniform' ? '$a$' : '$\\sigma$',
              yLabel: '$h(X)\\,(\\mathrm{bits})$',
              domainY: yDom,
            });
            // zero line + zero-crossing marker (h can be negative)
            drawLine(ctx, ax, [plo2, phi2], [0, 0], CHART.dim, 1, true);
            drawLine(ctx, ax, ps, hs, CHART.blue, 2);
            if (zeroParam >= plo2 && zeroParam <= phi2) {
              drawText(ctx, ax, zeroParam, 0, '● h=0', CHART.pink, -6, -8);
            }
            // current operating point
            drawText(ctx, ax, param, h, '●', CHART.orange, -4, -2);
          }}
        />
      </Panel>
    </>
  );
}
