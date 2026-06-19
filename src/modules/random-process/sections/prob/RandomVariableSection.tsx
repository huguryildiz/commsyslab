import { useMemo, useState } from 'react';
import { Panel, Select, Slider, Formula, TheoryBox, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawStems, shadeRegion, drawVLine, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { t } from '@/i18n';
import {
  type DistKind,
  gaussianPdf,
  gaussianCdf,
  uniformPdf,
  uniformCdf,
  rayleighPdf,
  rayleighCdf,
  binomialPmf,
  binomialCdf,
  bernoulliPmf,
  distStats,
  sampleDist,
  densityHistogram,
  qfunc,
  qfuncBounds,
} from '@/lib/dsp/probability';
import { PAD, PlotTitle, Metric, Legend } from './probShared';

const DEFAULTS = {
  kind: 'gaussian' as DistKind,
  m: 0,
  sigma: 1,
  a: -1,
  b: 1,
  n: 12,
  p: 0.4,
  samples: 2000,
  qx: 1,
};
const DISCRETE: DistKind[] = ['binomial', 'bernoulli'];
const GRID = 240;

/** §5.1.3 — random variables: distribution explorer (pdf/pmf, cdf, histogram) + Q-function. */
export function RandomVariableSection() {
  const [kind, setKind] = useState<DistKind>(DEFAULTS.kind);
  const [m, setM] = useState(DEFAULTS.m);
  const [sigma, setSigma] = useState(DEFAULTS.sigma);
  const [a, setA] = useState(DEFAULTS.a);
  const [b, setB] = useState(DEFAULTS.b);
  const [n, setN] = useState(DEFAULTS.n);
  const [p, setP] = useState(DEFAULTS.p);
  const [samples, setSamples] = useState(DEFAULTS.samples);
  const [qx, setQx] = useState(DEFAULTS.qx);

  const reset = () => {
    setKind(DEFAULTS.kind);
    setM(DEFAULTS.m);
    setSigma(DEFAULTS.sigma);
    setA(DEFAULTS.a);
    setB(DEFAULTS.b);
    setN(DEFAULTS.n);
    setP(DEFAULTS.p);
    setSamples(DEFAULTS.samples);
    setQx(DEFAULTS.qx);
  };

  const isDiscrete = DISCRETE.includes(kind);
  const params = { m, sigma, a: Math.min(a, b - 0.2), b: Math.max(b, a + 0.2), n, p };
  const stats = distStats(kind, params);

  const view = useMemo(() => {
    // x-range per distribution.
    let lo: number;
    let hi: number;
    switch (kind) {
      case 'gaussian':
        lo = m - 4 * sigma;
        hi = m + 4 * sigma;
        break;
      case 'uniform':
        lo = params.a - 0.25 * (params.b - params.a);
        hi = params.b + 0.25 * (params.b - params.a);
        break;
      case 'rayleigh':
        lo = 0;
        hi = 4.5 * sigma;
        break;
      case 'binomial':
        lo = -0.5;
        hi = n + 0.5;
        break;
      case 'bernoulli':
        lo = -0.6;
        hi = 1.6;
        break;
    }
    const pdfFn = (x: number) => {
      switch (kind) {
        case 'gaussian':
          return gaussianPdf(x, m, sigma);
        case 'uniform':
          return uniformPdf(x, params.a, params.b);
        case 'rayleigh':
          return rayleighPdf(x, sigma);
        default:
          return 0;
      }
    };
    const cdfFn = (x: number) => {
      switch (kind) {
        case 'gaussian':
          return gaussianCdf(x, m, sigma);
        case 'uniform':
          return uniformCdf(x, params.a, params.b);
        case 'rayleigh':
          return rayleighCdf(x, sigma);
        case 'binomial':
          return binomialCdf(Math.floor(x), n, p);
        case 'bernoulli':
          return x < 0 ? 0 : x < 1 ? 1 - p : 1;
      }
    };
    const xs = Array.from({ length: GRID }, (_, i) => lo + ((hi - lo) * i) / (GRID - 1));
    const cdf = xs.map(cdfFn);
    const draws = sampleDist(kind, params, samples, 1234);

    // Unified shape (fields undefined when not applicable) so `view` has one type.
    let pdf: number[] = [];
    let centers: number[] | undefined;
    let density: number[] | undefined;
    let ks: number[] | undefined;
    let pmf: number[] | undefined;
    let freq: number[] | undefined;
    let pdfMax: number;
    if (isDiscrete) {
      ks = Array.from({ length: kind === 'bernoulli' ? 2 : n + 1 }, (_, i) => i);
      pmf = ks.map((k) => (kind === 'bernoulli' ? bernoulliPmf(k, p) : binomialPmf(k, n, p)));
      freq = ks.map((k) => draws.filter((d) => d === k).length / samples);
      pdfMax = Math.max(...pmf, ...freq, 1e-6) * 1.12;
    } else {
      pdf = xs.map(pdfFn);
      const hist = densityHistogram(draws, 40, lo, hi);
      centers = hist.centers;
      density = hist.density;
      pdfMax = Math.max(...pdf, ...density, 1e-6) * 1.12;
    }
    return { lo, hi, xs, pdf, cdf, centers, density, ks, pmf, freq, pdfMax, isDiscrete };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, m, sigma, a, b, n, p, samples]);

  const drawPdf = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([view.lo, view.hi], [PAD.l, w - PAD.r]),
      y: linScale([0, view.pdfMax], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [view.lo, view.hi], {
      xLabel: '$x$',
      yLabel: isDiscrete ? '$P(X{=}k)$' : '$f_X(x)$',
      domainY: [0, view.pdfMax],
    });
    if (view.isDiscrete && view.ks) {
      // Sample relative frequency (bars) + theoretical pmf (stems).
      const half = (ax.x(0.34) - ax.x(0)) / 1;
      for (let i = 0; i < view.ks.length; i++) {
        const cx = ax.x(view.ks[i]);
        ctx.fillStyle = alpha(CHART.green, 0.45);
        ctx.fillRect(cx - half / 2, ax.y(view.freq![i]), half, ax.y(0) - ax.y(view.freq![i]));
      }
      drawStems(ctx, ax, view.ks, view.pmf!, CHART.blue, 3);
    } else {
      // Sample histogram (bars) + theoretical pdf (line).
      const bw = view.centers![1] - view.centers![0];
      const half = (ax.x(bw) - ax.x(0)) / 2;
      for (let i = 0; i < view.centers!.length; i++) {
        const cx = ax.x(view.centers![i]);
        ctx.fillStyle = alpha(CHART.green, 0.4);
        ctx.fillRect(cx - half, ax.y(view.density![i]), half * 2, ax.y(0) - ax.y(view.density![i]));
      }
      drawLine(ctx, ax, view.xs, view.pdf, CHART.blue, 2);
    }
  };

  const drawCdf = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([view.lo, view.hi], [PAD.l, w - PAD.r]),
      y: linScale([0, 1.05], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [view.lo, view.hi], {
      xLabel: '$x$',
      yLabel: '$F_X(x)$',
      domainY: [0, 1.05],
    });
    drawLine(ctx, ax, view.xs, view.cdf, CHART.orange, 2);
  };

  // ── Q-function tail (standard normal) ──
  const qb = qfuncBounds(qx);
  const qView = useMemo(() => {
    const xs = Array.from({ length: GRID }, (_, i) => -4 + (8 * i) / (GRID - 1));
    const pdf = xs.map((x) => gaussianPdf(x, 0, 1));
    return { xs, pdf };
  }, []);
  const drawQ = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([-4, 4], [PAD.l, w - PAD.r]),
      y: linScale([0, 0.45], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [-4, 4], { xLabel: '$x$', yLabel: '$f(x)$', domainY: [0, 0.45] });
    shadeRegion(ctx, ax, qx, 4, 0, 0.45, alpha(CHART.pink, 0.25));
    drawLine(ctx, ax, qView.xs, qView.pdf, CHART.blue, 2);
    drawVLine(ctx, ax, qx, 0, 0.45, CHART.pink, true, 1.5);
  };

  return (
    <div className="rp__section">
      <div className="module-layout">
        <aside className="rp__controls">
          <Panel title={t('rp.rv.controls')}>
            <Select<DistKind>
              label={t('rp.rv.kind')}
              value={kind}
              onChange={setKind}
              options={[
                { value: 'gaussian', label: t('rp.rv.kind.gaussian') },
                { value: 'uniform', label: t('rp.rv.kind.uniform') },
                { value: 'rayleigh', label: t('rp.rv.kind.rayleigh') },
                { value: 'binomial', label: t('rp.rv.kind.binomial') },
                { value: 'bernoulli', label: t('rp.rv.kind.bernoulli') },
              ]}
            />
            {kind === 'gaussian' && (
              <>
                <Slider label={<HintText text={t('rp.func.m')} />} min={-3} max={3} step={0.1} value={m} onChange={setM} />
                <Slider label={<HintText text={t('rp.func.sigma')} />} min={0.3} max={3} step={0.1} value={sigma} onChange={setSigma} />
              </>
            )}
            {kind === 'uniform' && (
              <>
                <Slider label={<HintText text="$a$" />} min={-3} max={2.5} step={0.1} value={a} onChange={setA} />
                <Slider label={<HintText text="$b$" />} min={-2.5} max={3} step={0.1} value={b} onChange={setB} />
              </>
            )}
            {kind === 'rayleigh' && (
              <Slider label={<HintText text={t('rp.func.sigma')} />} min={0.3} max={3} step={0.1} value={sigma} onChange={setSigma} />
            )}
            {kind === 'binomial' && (
              <>
                <Slider label={<HintText text="$n$" />} min={2} max={40} step={1} value={n} onChange={setN} />
                <Slider label={<HintText text="$p$" />} min={0.05} max={0.95} step={0.05} value={p} onChange={setP} />
              </>
            )}
            {kind === 'bernoulli' && (
              <Slider label={<HintText text="$p$" />} min={0.05} max={0.95} step={0.05} value={p} onChange={setP} />
            )}
            <Slider label={<HintText text={t('rp.rv.samples')} />} min={100} max={5000} step={100} value={samples} onChange={setSamples} />
            <div className="rp__reset">
              <button type="button" onClick={reset}>{t('rp.gen.reset')}</button>
            </div>
          </Panel>

          <Panel title={t('rp.qfunc.title')}>
            <Slider label={<HintText text={t('rp.qfunc.threshold')} />} min={-3} max={3.5} step={0.05} value={qx} onChange={setQx} />
          </Panel>
        </aside>

        <div className="rp__content">
          <div className="rp__readouts">
            <Metric label={t('rp.rv.mean')} value={stats.mean.toFixed(3)} />
            <Metric label={t('rp.rv.var')} value={stats.variance.toFixed(3)} />
          </div>

          <Panel title={t('rp.rv.pdf')}>
            <PlotTitle textKey="rp.rv.pdf" />
            <Canvas height={210} draw={drawPdf} deps={[view]} ariaLabel="Probability density / mass function with sample histogram" />
            <Legend
              entries={[
                { color: CHART.blue, label: t('rp.rv.trace.pdf') },
                { color: CHART.green, label: t('rp.rv.trace.hist'), block: true },
              ]}
            />
            <PlotTitle textKey="rp.rv.cdf" />
            <Canvas height={170} draw={drawCdf} deps={[view]} ariaLabel="Cumulative distribution function" />
            <Formula tex="f_X(x)=\dfrac{d}{dx}F_X(x),\quad \int_{-\infty}^{\infty} f_X(x)\,dx=1" />
            <TheoryBox>
              <HintText text={t('rp.rv.theory')} />
            </TheoryBox>
          </Panel>

          <Panel title={t('rp.qfunc.title')}>
            <div className="rp__readouts">
              <Metric label={t('rp.qfunc.value')} value={qfunc(qx).toFixed(4)} />
              <Metric label={t('rp.qfunc.boundExp')} value={qb.upperExp.toFixed(4)} />
              <Metric label={t('rp.qfunc.boundTight')} value={Number.isFinite(qb.upperTight) ? qb.upperTight.toFixed(4) : '—'} />
            </div>
            <Canvas height={210} draw={drawQ} deps={[qx, qView]} ariaLabel="Q-function tail of the standard normal density" />
            <Formula tex="Q(x)=\int_x^{\infty}\tfrac{1}{\sqrt{2\pi}}e^{-t^2/2}\,dt,\quad \tfrac12 e^{-x^2/2}\ \text{(5.1.8)},\ \tfrac{1}{\sqrt{2\pi}\,x}e^{-x^2/2}\ \text{(5.1.9)}" />
            <TheoryBox>
              <HintText text={t('rp.qfunc.theory')} />
            </TheoryBox>
          </Panel>
        </div>
      </div>
    </div>
  );
}
