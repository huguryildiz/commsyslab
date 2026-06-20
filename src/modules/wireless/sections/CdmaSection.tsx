import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine, drawVLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { DEFAULT_CDMA_PARAMS, deriveCdma, type CdmaParams, type CdmaDerived } from '../cdma-model';
import { CdmaControls } from '../cdma-panels';
import { drawLegend } from '../wl-plot';

const BER_FLOOR = 1e-6;
const clampBer = (y: number) => Math.max(y, BER_FLOOR);

function UsersPanel({ d }: { d: CdmaDerived }) {
  const x = d.userSweep;
  const x1 = x[x.length - 1];
  const [lo, hi, onWheel, , onPan] = useZoom(1, x1, { minSpan: 4, maxSpan: x1 - 1, clampMin: 1, clampMax: x1 });
  return (
    <Canvas
      height={240}
      ariaLabel="bit error rate versus number of users"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([lo, hi], [44, w - 10]), y: logScale([BER_FLOOR, 0.5], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$N_u\\,(\\mathrm{users})$', yLabel: '$P_b$' });
        drawLine(ctx, ax, [lo, hi], [d.targetBer, d.targetBer], CHART.dim, 1.2, true);
        if (d.capacity >= 1) drawVLine(ctx, ax, d.capacity, BER_FLOOR, 0.5, CHART.orange, true);
        drawLine(ctx, ax, x, d.berVsUsers.map(clampBer), CHART.green, 2);
        drawLegend(ctx, w, [
          { color: CHART.green, label: 'BER(N_u)' },
          { color: CHART.dim, label: 'target' },
          { color: CHART.orange, label: 'capacity' },
        ]);
      }}
    />
  );
}

function EbN0Panel({ d }: { d: CdmaDerived }) {
  const x = d.ebN0Sweep;
  const [lo, hi, onWheel, , onPan] = useZoom(x[0], x[x.length - 1], {
    minSpan: 5,
    maxSpan: x[x.length - 1] - x[0],
    clampMin: x[0],
    clampMax: x[x.length - 1],
  });
  return (
    <Canvas
      height={240}
      ariaLabel="bit error rate versus Eb over N0 comparing power control and near-far"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([lo, hi], [44, w - 10]), y: logScale([BER_FLOOR, 0.5], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$E_b/N_0\\,(\\mathrm{dB})$', yLabel: '$P_b$' });
        drawLine(ctx, ax, x, d.berNf.map(clampBer), CHART.red, 1.8, true);
        drawLine(ctx, ax, x, d.berPc.map(clampBer), CHART.green, 2);
        drawLegend(ctx, w, [
          { color: CHART.green, label: 'power control' },
          { color: CHART.red, label: 'near-far' },
        ]);
      }}
    />
  );
}

export function CdmaSection() {
  const [params, setParams] = useState<CdmaParams>(DEFAULT_CDMA_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<CdmaParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_CDMA_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => deriveCdma(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <CdmaControls params={params} set={set} reset={reset} />
      </aside>
      <div className="wl__content">
        <Panel title={t('wl.cdma.users.title')}>
          <UsersPanel key={resetKey} d={d} />
          <Readout label={t('wl.cdma.readout.sir')} value={d.sirDb.toFixed(1)} unit="dB" />
          <Readout label={t('wl.cdma.readout.capacity')} value={`${d.capacity}`} />
          <Formula tex="\mathrm{SIR} = \dfrac{3L_c}{(N_u-1)\,\Gamma}" />
        </Panel>

        <Panel title={t('wl.cdma.ebn0.title')}>
          <EbN0Panel key={resetKey} d={d} />
          <Readout label={t('wl.cdma.readout.ber')} value={d.berAtOp.toExponential(2)} />
          <Formula tex="P_e = Q\!\left(\sqrt{\mathrm{SINR}}\right),\ \tfrac{1}{\mathrm{SINR}}=\tfrac{(N_u-1)\Gamma}{3L_c}+\tfrac{1}{2\gamma_b}" />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('wl.cdma.card.access.title')} accent="green">
            <p>
              <HintText text={t('wl.cdma.card.access.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.cdma.card.nearfar.title')} accent="orange">
            <p>
              <HintText text={t('wl.cdma.card.nearfar.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.cdma.card.power.title')} accent="blue">
            <p>
              <HintText text={t('wl.cdma.card.power.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('wl.cdma.theory.title')}>
          <p>{t('wl.cdma.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
