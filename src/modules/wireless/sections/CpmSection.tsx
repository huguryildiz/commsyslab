import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { DEFAULT_CPM_PARAMS, deriveCpm, type CpmParams, type CpmDerived } from '../cpm-model';
import { CpmControls } from '../cpm-panels';
import { drawLegend } from '../wl-plot';

function PhaseTreePanel({ d, treeDepth }: { d: CpmDerived; treeDepth: number }) {
  const [lo, hi, onWheel, , onPan] = useZoom(0, treeDepth, { minSpan: 1, maxSpan: treeDepth, clampMin: 0, clampMax: treeDepth });
  return (
    <Canvas
      height={240}
      ariaLabel="CPFSK phase tree"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        let pMax = 0.5;
        for (const traj of d.phaseTree) for (const v of traj) pMax = Math.max(pMax, Math.abs(v));
        const ax = { x: linScale([lo, hi], [44, w - 10]), y: linScale([-pMax, pMax], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$t/T_b$', yLabel: '$\\phi(t)/\\pi$', domainY: [-pMax, pMax] });
        for (const traj of d.phaseTree) drawLine(ctx, ax, d.treeTime, traj, CHART.green, 1);
      }}
    />
  );
}

function CpmPsdPanel({ d }: { d: CpmDerived }) {
  const x = d.psdFreqT;
  const x1 = x[x.length - 1];
  const [lo, hi, onWheel, , onPan] = useZoom(0, x1, { minSpan: x1 / 8, maxSpan: x1, clampMin: 0, clampMax: x1 });
  return (
    <Canvas
      height={240}
      ariaLabel="power spectral density of MSK versus QPSK"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([lo, hi], [44, w - 10]), y: linScale([-60, 3], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$f T_b$', yLabel: '$S(f)\\,(\\mathrm{dB})$', domainY: [-60, 3] });
        const clamp = (v: number) => Math.max(v, -60);
        drawLine(ctx, ax, x, d.qpskPsd.map(clamp), CHART.orange, 1.6);
        drawLine(ctx, ax, x, d.mskPsd.map(clamp), CHART.green, 2);
        drawLegend(ctx, w, [
          { color: CHART.green, label: 'MSK' },
          { color: CHART.orange, label: 'QPSK' },
        ]);
      }}
    />
  );
}

export function CpmSection() {
  const [params, setParams] = useState<CpmParams>(DEFAULT_CPM_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<CpmParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_CPM_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => deriveCpm(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <CpmControls params={params} set={set} reset={reset} />
      </aside>
      <div className="wl__content">
        <Panel title={t('wl.cpm.tree.title')}>
          <PhaseTreePanel key={resetKey} d={d} treeDepth={params.treeDepth} />
          <Readout label={t('wl.cpm.readout.mode')} value={d.isMsk ? 'MSK (h=½)' : 'CPFSK'} />
          <Readout label={t('wl.cpm.readout.phase')} value={`±${d.peakPhaseDeg.toFixed(0)}`} unit="°" />
          <Formula tex="\phi(t;\mathbf a) = 2\pi h\textstyle\sum_k a_k\,q(t-kT),\quad q(T)=\tfrac12" />
        </Panel>

        <Panel title={t('wl.cpm.psd.title')}>
          <CpmPsdPanel key={resetKey} d={d} />
          <Formula tex="S_{\text{MSK}}(f)\propto\left(\dfrac{\cos 2\pi fT}{1-16f^2T^2}\right)^2" />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('wl.cpm.card.continuous.title')} accent="green">
            <p>
              <HintText text={t('wl.cpm.card.continuous.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.cpm.card.index.title')} accent="blue">
            <p>
              <HintText text={t('wl.cpm.card.index.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.cpm.card.msk.title')} accent="orange">
            <p>
              <HintText text={t('wl.cpm.card.msk.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('wl.cpm.theory.title')}>
          <p>{t('wl.cpm.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
