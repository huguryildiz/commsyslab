import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout, Segmented, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawStems } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { DEFAULT_SYNC_PARAMS, deriveSync, type SyncParams, type SyncDerived } from '../sync-model';
import { SyncControls } from '../sync-panels';

type SyncSubTab = 'acq' | 'track';

function AcquisitionPanel({ d }: { d: SyncDerived }) {
  const N = d.period;
  const xs = d.profile.map((_, k) => k);
  return (
    <Canvas
      height={220}
      ariaLabel="serial-search correlation versus code-phase offset"
      deps={[d]}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([0, N - 1], [40, w - 10]), y: linScale([-3, N * 1.1], [h - 28, 12]) };
        drawAxes(ctx, ax, [0, N - 1], {
          xLabel: '$\\mathrm{offset}\\,(\\mathrm{chips})$',
          yLabel: '$R(\\tau)$',
          domainY: [-3, N * 1.1],
        });
        drawStems(ctx, ax, xs, d.profile, CHART.blue, 1.5);
        drawLine(ctx, ax, [0, N - 1], [d.threshold, d.threshold], CHART.pink, 1.5, true);
      }}
    />
  );
}

function TrackingPanel({ d }: { d: SyncDerived }) {
  const xs = d.sCurve.map((p) => p.tau);
  const [lo, hi, onWheel, , onPan] = useZoom(xs[0], xs[xs.length - 1], {
    minSpan: 0.5,
    maxSpan: xs[xs.length - 1] - xs[0],
    clampMin: xs[0],
    clampMax: xs[xs.length - 1],
  });
  return (
    <Canvas
      height={220}
      ariaLabel="delay-locked loop discriminator S-curve"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([lo, hi], [44, w - 10]), y: linScale([-1.1, 1.1], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$\\tau\\,(\\mathrm{chips})$', yLabel: '$S(\\tau)$', domainY: [-1.1, 1.1] });
        drawLine(ctx, ax, [lo, hi], [0, 0], CHART.dim, 1);
        drawLine(
          ctx,
          ax,
          d.sCurve.map((p) => p.tau),
          d.sCurve.map((p) => p.disc),
          CHART.green,
          2,
        );
        // Mark the stable lock point at τ=0.
        drawLine(ctx, ax, [0, 0], [-1.1, 1.1], CHART.pink, 1, true);
      }}
    />
  );
}

export function SyncSection() {
  const [subTab, setSubTab] = useState<SyncSubTab>('acq');
  const [params, setParams] = useState<SyncParams>(DEFAULT_SYNC_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<SyncParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_SYNC_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => deriveSync(params), [params]);

  return (
    <div>
      <div className="wl__subtabbar">
        <Segmented<SyncSubTab>
          ariaLabel={t('wl.sync.subtab.ariaLabel')}
          value={subTab}
          options={[
            { value: 'acq', label: t('wl.sync.subtab.acq') },
            { value: 'track', label: t('wl.sync.subtab.track') },
          ]}
          onChange={setSubTab}
        />
      </div>
      <div className="module-layout">
        <aside className="wl__controls">
          <SyncControls params={params} set={set} reset={reset} />
        </aside>
        <div className="wl__content">
          {subTab === 'acq' && (
            <>
              <Panel title={t('wl.sync.acq.title')}>
                <AcquisitionPanel d={d} />
                <Readout label={t('wl.sync.readout.offset')} value={`${d.trueOffset}`} unit="chips" />
                <Readout label={t('wl.sync.readout.acqTime')} value={d.meanAcqCells.toFixed(0)} unit="cells" />
                <Formula tex="\bar T_{\text{acq}} = \dfrac{(2-P_d)(1+K P_{fa})}{2P_d}\,N" />
              </Panel>
              <div className="info-cards">
                <InfoCard title={t('wl.sync.card.phases.title')} accent="green">
                  <p>
                    <HintText text={t('wl.sync.card.phases.body')} />
                  </p>
                </InfoCard>
                <InfoCard title={t('wl.sync.card.search.title')} accent="blue">
                  <p>
                    <HintText text={t('wl.sync.card.search.body')} />
                  </p>
                </InfoCard>
              </div>
            </>
          )}
          {subTab === 'track' && (
            <>
              <Panel title={t('wl.sync.track.title')}>
                <TrackingPanel key={resetKey} d={d} />
                <Readout label={t('wl.sync.readout.delta')} value={d.delta.toFixed(2)} unit="chips" />
                <Formula tex="S(\tau) = R(\tau+\tfrac{\delta}{2}) - R(\tau-\tfrac{\delta}{2})" />
              </Panel>
              <div className="info-cards">
                <InfoCard title={t('wl.sync.card.dll.title')} accent="green">
                  <p>
                    <HintText text={t('wl.sync.card.dll.body')} />
                  </p>
                </InfoCard>
                <InfoCard title={t('wl.sync.card.earlylate.title')} accent="orange">
                  <p>
                    <HintText text={t('wl.sync.card.earlylate.body')} />
                  </p>
                </InfoCard>
              </div>
            </>
          )}
          <TheoryBox title={t('wl.sync.theory.title')}>
            <p>{t('wl.sync.theory.body')}</p>
          </TheoryBox>
        </div>
      </div>
    </div>
  );
}
