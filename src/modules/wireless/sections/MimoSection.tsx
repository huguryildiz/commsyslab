import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout, Segmented, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import {
  DEFAULT_MIMO_PARAMS,
  deriveMimo,
  type MimoParams,
  type MimoDerived,
  DEFAULT_ALAMOUTI_PARAMS,
  deriveAlamouti,
  type AlamoutiParams,
  type AlamoutiDerived,
  DEFAULT_MIMO_ERR_PARAMS,
  deriveMimoErrorRate,
  type MimoErrParams,
  type MimoErrDerived,
} from '../mimo-model';
import { MimoControls, AlamoutiControls, MimoErrControls } from '../mimo-panels';
import { drawLegend } from '../wl-plot';

const BER_FLOOR = 1e-6;
const clampBer = (y: number) => Math.max(y, BER_FLOOR);

type MimoSubTab = 'mux' | 'stc' | 'err';

export function MimoSection() {
  const [subTab, setSubTab] = useState<MimoSubTab>('mux');
  return (
    <div>
      <div className="wl__subtabbar">
        <Segmented<MimoSubTab>
          ariaLabel={t('wl.mimo.subtab.ariaLabel')}
          value={subTab}
          options={[
            { value: 'mux', label: t('wl.mimo.subtab.mux') },
            { value: 'stc', label: t('wl.mimo.subtab.stc') },
            { value: 'err', label: t('wl.mimo.subtab.err') },
          ]}
          onChange={setSubTab}
        />
      </div>
      {subTab === 'mux' && <MuxView />}
      {subTab === 'stc' && <StcView />}
      {subTab === 'err' && <ErrView />}
    </div>
  );
}

/* ── Spatial multiplexing / capacity (retrofitted) ─────────────────────────── */

function CapacityPanel({ d }: { d: MimoDerived }) {
  const x = d.snrSweep;
  const [lo, hi, onWheel, , onPan] = useZoom(x[0], x[x.length - 1], {
    minSpan: 5,
    maxSpan: x[x.length - 1] - x[0],
    clampMin: x[0],
    clampMax: x[x.length - 1],
  });
  return (
    <Canvas
      height={260}
      ariaLabel="ergodic capacity versus SNR for SISO, SIMO and MIMO"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const yMax = Math.max(...d.capMimo, 1) * 1.1;
        const ax = { x: linScale([lo, hi], [40, w - 10]), y: linScale([0, yMax], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$\\rho\\,(\\mathrm{dB})$',
          yLabel: '$C\\,(\\mathrm{bit/s/Hz})$',
        });
        drawLine(ctx, ax, x, d.capSiso, CHART.dim, 1.4);
        drawLine(ctx, ax, x, d.capSimo, CHART.blue, 1.6, true);
        drawLine(ctx, ax, x, d.capMimo, CHART.green, 2);
        drawLegend(ctx, w, [
          { color: CHART.dim, label: '1×1 SISO' },
          { color: CHART.blue, label: d.capLabelSimo },
          { color: CHART.green, label: d.capLabelMimo },
        ]);
      }}
    />
  );
}

function MuxView() {
  const [params, setParams] = useState<MimoParams>(DEFAULT_MIMO_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<MimoParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_MIMO_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => deriveMimo(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <MimoControls params={params} set={set} reset={reset} />
      </aside>
      <div className="wl__content">
        <Panel title={t('wl.mimo.cap.title')}>
          <CapacityPanel key={resetKey} d={d} />
          <Readout label={t('wl.mimo.readout.capAt')} value={d.capMimo[10].toFixed(2)} unit="bit/s/Hz" />
          <Formula tex="C = \log_2\det\!\left(I + \tfrac{\rho}{N_t}\,H H^{\mathsf H}\right)" />
        </Panel>
        <div className="info-cards">
          <InfoCard title={t('wl.mimo.card.mux.title')} accent="green">
            <p>
              <HintText text={t('wl.mimo.card.mux.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.mimo.card.cap.title')} accent="blue">
            <p>
              <HintText text={t('wl.mimo.card.cap.body')} />
            </p>
          </InfoCard>
        </div>
        <TheoryBox title={t('wl.mimo.theory.title')}>
          <p>{t('wl.mimo.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}

/* ── Space-Time / Alamouti (§14.4.5) ───────────────────────────────────────── */

function AlamoutiBerPanel({ d }: { d: AlamoutiDerived }) {
  const x = d.ebN0;
  const [lo, hi, onWheel, , onPan] = useZoom(x[0], x[x.length - 1], {
    minSpan: 5,
    maxSpan: x[x.length - 1] - x[0],
    clampMin: x[0],
    clampMax: x[x.length - 1],
  });
  return (
    <Canvas
      height={260}
      ariaLabel="bit error rate versus Eb/N0 for SISO, Alamouti and MRC"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([lo, hi], [44, w - 10]), y: logScale([BER_FLOOR, 0.5], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$E_b/N_0\\,(\\mathrm{dB})$', yLabel: '$P_b$' });
        drawLine(ctx, ax, x, d.awgn.map(clampBer), CHART.blue, 1.4, true);
        drawLine(ctx, ax, x, d.siso.map(clampBer), CHART.dim, 1.6);
        drawLine(ctx, ax, x, d.mrc1x2.map(clampBer), CHART.orange, 1.8);
        drawLine(ctx, ax, x, d.alamouti.map(clampBer), CHART.green, 2);
        drawLegend(ctx, w, [
          { color: CHART.blue, label: 'AWGN' },
          { color: CHART.dim, label: 'SISO' },
          { color: CHART.green, label: 'Alamouti 2×1' },
          { color: CHART.orange, label: 'MRC 1×2' },
        ]);
      }}
    />
  );
}

function StcView() {
  const [params, setParams] = useState<AlamoutiParams>(DEFAULT_ALAMOUTI_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<AlamoutiParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_ALAMOUTI_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => deriveAlamouti(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <AlamoutiControls params={params} set={set} reset={reset} />
      </aside>
      <div className="wl__content">
        <Panel title={t('wl.mimo.stc.matrix.title')}>
          <Formula tex="\mathbf{S}=\begin{bmatrix} s_1 & s_2 \\ -s_2^{*} & s_1^{*} \end{bmatrix}" block />
          <p className="wl__note">{t('wl.mimo.stc.matrix.note')}</p>
        </Panel>
        <Panel title={t('wl.mimo.stc.ber.title')}>
          <AlamoutiBerPanel key={resetKey} d={d} />
          <Formula tex="P_b^{\text{Alamouti}} = P_b^{\text{MRC}}\!\left(\bar\gamma_b/2,\; 2\right)" />
        </Panel>
        <div className="info-cards">
          <InfoCard title={t('wl.mimo.card.txdiv.title')} accent="green">
            <p>
              <HintText text={t('wl.mimo.card.txdiv.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.mimo.card.alamouti.title')} accent="orange">
            <p>
              <HintText text={t('wl.mimo.card.alamouti.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.mimo.card.divorder.title')} accent="blue">
            <p>
              <HintText text={t('wl.mimo.card.divorder.body')} />
            </p>
          </InfoCard>
        </div>
        <TheoryBox title={t('wl.mimo.stc.theory.title')}>
          <p>{t('wl.mimo.stc.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}

/* ── Spatial-multiplexing error rate (§14.4.4) ─────────────────────────────── */

function MimoErrPanel({ d }: { d: MimoErrDerived }) {
  const x = d.snr;
  const [lo, hi, onWheel, , onPan] = useZoom(x[0], x[x.length - 1], {
    minSpan: 5,
    maxSpan: x[x.length - 1] - x[0],
    clampMin: x[0],
    clampMax: x[x.length - 1],
  });
  return (
    <Canvas
      height={260}
      ariaLabel="ZF versus MMSE bit error rate for spatial multiplexing"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([lo, hi], [44, w - 10]), y: logScale([1e-4, 0.5], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$\\rho\\,(\\mathrm{dB})$', yLabel: '$P_b$' });
        const clamp = (y: number) => Math.max(y, 1e-4);
        drawLine(ctx, ax, x, d.zf.map(clamp), CHART.orange, 1.8);
        drawLine(ctx, ax, x, d.mmse.map(clamp), CHART.green, 2);
        drawLegend(ctx, w, [
          { color: CHART.orange, label: 'ZF' },
          { color: CHART.green, label: 'MMSE' },
        ]);
      }}
    />
  );
}

function ErrView() {
  const [params, setParams] = useState<MimoErrParams>(DEFAULT_MIMO_ERR_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<MimoErrParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_MIMO_ERR_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => deriveMimoErrorRate(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <MimoErrControls params={params} set={set} reset={reset} />
      </aside>
      <div className="wl__content">
        <Panel title={t('wl.mimo.err.plot.title')}>
          <MimoErrPanel key={resetKey} d={d} />
          <Readout label={t('wl.mimo.err.readout.config')} value={`${d.nt}×${d.nr}`} />
          <Formula tex="\hat{\mathbf{x}}=\mathbf{W}\mathbf{y},\quad \mathbf{W}_{\text{MMSE}}=(\mathbf{H}^{\mathsf H}\mathbf{H}+N_0\mathbf{I})^{-1}\mathbf{H}^{\mathsf H}" />
        </Panel>
        <div className="info-cards">
          <InfoCard title={t('wl.mimo.card.zfmmse.title')} accent="orange">
            <p>
              <HintText text={t('wl.mimo.card.zfmmse.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.mimo.card.dmt.title')} accent="blue">
            <p>
              <HintText text={t('wl.mimo.card.dmt.body')} />
            </p>
          </InfoCard>
        </div>
        <TheoryBox title={t('wl.mimo.err.theory.title')}>
          <p>{t('wl.mimo.err.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
