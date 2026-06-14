import { useMemo, useRef, useState } from 'react';
import { Panel, Slider, Select, Readout, TheoryBox, Formula, TransportControls } from '@/components';
import { t } from '@/i18n';
import { makeRng } from '@/lib/sim/sources';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { OPT_RX_SIGNAL_SETS, buildOptRxView, simulateReception, monteCarloPe } from './model';
import {
  WaveformPanel,
  DemodPanel,
  DecisionAxisPanel,
  ConstellationLandingPanel,
  CorrelatorBankPanel,
  MinDistancePanel,
} from './optreceiver-panels';
import { SignalEditor } from './SignalEditor';
import { DEFAULT_CUSTOM_AMPLITUDES } from './custom-signals';

const SPS = 64;
const BATCH = 200;

export function OptimumReceiverSection() {
  const [signalSetId, setSignalSetId] = useState('binary');
  const [ebN0Db, setEbN0Db] = useState(8);
  const [symbolIndex, setSymbolIndex] = useState(0);
  const [cycles, setCycles] = useState(4);
  const [nonce, setNonce] = useState(0);
  const [livePe, setLivePe] = useState<{ errors: number; total: number } | null>(null);
  const [customAmplitudes, setCustomAmplitudes] = useState<number[][]>(DEFAULT_CUSTOM_AMPLITUDES);

  const errRef = useRef(0);
  const totRef = useRef(0);
  const mcRngRef = useRef(makeRng(2024));

  const view = useMemo(
    () =>
      buildOptRxView({
        signalSetId,
        ebN0Db,
        symbolIndex,
        sps: SPS,
        cycles,
        custom: { amplitudes: customAmplitudes },
      }),
    [signalSetId, ebN0Db, symbolIndex, cycles, customAmplitudes],
  );

  const reception = useMemo(
    () => simulateReception(view, symbolIndex, makeRng(1000 + nonce)),
    [view, symbolIndex, nonce],
  );

  const resetCounts = () => {
    errRef.current = 0;
    totRef.current = 0;
    setLivePe(null);
  };

  const handleSet = (id: string) => {
    setSignalSetId(id);
    setSymbolIndex(0);
    resetCounts();
  };
  const handleEbN0 = (v: number) => {
    setEbN0Db(v);
    resetCounts();
  };

  const isCustom = view.kind === 'custom';

  const handleCustom = (next: number[][]) => {
    setCustomAmplitudes(next);
    setSymbolIndex((i) => Math.min(i, Math.max(next.length - 1, 0)));
    resetCounts();
  };

  const loop = useSimulationLoop({
    ticksPerSecond: 30,
    onTick: () => {
      const r = monteCarloPe(view, BATCH, mcRngRef.current);
      errRef.current += r.errors;
      totRef.current += r.total;
      setLivePe({ errors: errRef.current, total: totRef.current });
    },
    onReset: resetCounts,
  });

  const livePeValue = livePe && livePe.total > 0 ? livePe.errors / livePe.total : undefined;
  const statText =
    view.kind === '1d'
      ? reception.statistic[0].toFixed(3)
      : `(${reception.statistic.map((s) => s.toFixed(2)).join(', ')})`;

  const decisionTitle = isCustom
    ? view.dim === 1
      ? t('modulation.optrx.panel.decision')
      : view.dim === 2
        ? t('modulation.optrx.panel.landing')
        : t('modulation.optrx.panel.minDist')
    : view.kind === '2d'
      ? t('modulation.optrx.panel.landing')
      : view.kind === 'orthogonal'
        ? t('modulation.optrx.panel.bank')
        : t('modulation.optrx.panel.decision');

  return (
    <div className="module-layout">
      <aside className="modulation__controls">
        <Panel title={t('modulation.optrx.tab.optrx')}>
          <Select<string>
            label={t('modulation.optrx.signalSet')}
            value={signalSetId}
            onChange={handleSet}
            options={OPT_RX_SIGNAL_SETS.map((s) => ({ value: s.id, label: t(s.labelKey) }))}
          />
          <Slider
            label={t('modulation.ebn0')}
            value={ebN0Db}
            min={0}
            max={14}
            step={0.5}
            unit="dB"
            onChange={handleEbN0}
          />
          {(view.kind === '2d' || view.kind === 'orthogonal') && (
            <Slider
              label={t('modulation.optrx.cycles')}
              value={cycles}
              min={2}
              max={8}
              step={1}
              onChange={setCycles}
            />
          )}
          <Select<string>
            label={t('modulation.optrx.symbol')}
            value={String(symbolIndex)}
            onChange={(v) => setSymbolIndex(Number(v))}
            options={view.labels.map((lab, i) => ({ value: String(i), label: lab }))}
          />
          <button type="button" onClick={() => setNonce((n) => n + 1)}>
            {t('modulation.optrx.resample')}
          </button>
          {isCustom && (
            <SignalEditor
              amplitudes={customAmplitudes}
              dependent={view.dependent}
              onChange={handleCustom}
            />
          )}
          <TransportControls loop={loop} />
        </Panel>
      </aside>

      <div className="modulation__content">
        <div className="modulation__readouts">
          <Readout label={t('modulation.optrx.readout.peakSnr')} value={view.peakSnr.toFixed(2)} />
          <Readout label={t('modulation.optrx.readout.statistic')} value={statText} />
          <Readout
            label={t('modulation.optrx.readout.peTheory')}
            value={view.theoreticalPe.toExponential(2)}
          />
          <Readout
            label={t('modulation.optrx.readout.peLive')}
            value={livePeValue !== undefined ? livePeValue.toExponential(2) : '—'}
            tone={livePeValue !== undefined ? 'ok' : undefined}
          />
          <Readout
            label={t('modulation.optrx.readout.errors')}
            value={livePe ? `${livePe.errors} / ${livePe.total}` : '—'}
          />
          {isCustom && (
            <Readout label={t('modulation.optrx.readout.dim')} value={`${view.dim} / ${view.M}`} />
          )}
        </div>

        <div className="modulation__plots">
          <Panel title={t('modulation.optrx.panel.waveform')}>
            <WaveformPanel view={view} reception={reception} />
            <div className="modulation__legend">
              <span className="lg-live">{t('modulation.optrx.legend.tx')}</span>
              <span className="lg-sim">{t('modulation.optrx.legend.mf')}</span>
              <span className="lg-theory">{t('modulation.optrx.legend.rx')}</span>
            </div>
          </Panel>
          <Panel title={t('modulation.optrx.panel.demod')}>
            <DemodPanel view={view} reception={reception} />
          </Panel>
        </div>

        <Panel title={decisionTitle}>
          {view.dim === 0 ? (
            <div className="modulation__notice">{t('modulation.optrx.custom.degenerate')}</div>
          ) : (
            <>
              {(view.kind === '1d' || (isCustom && view.dim === 1)) && (
                <DecisionAxisPanel view={view} reception={reception} />
              )}
              {(view.kind === '2d' || (isCustom && view.dim === 2)) && (
                <ConstellationLandingPanel view={view} reception={reception} />
              )}
              {view.kind === 'orthogonal' && (
                <CorrelatorBankPanel view={view} reception={reception} />
              )}
              {isCustom && view.dim >= 3 && (
                <MinDistancePanel view={view} reception={reception} />
              )}
            </>
          )}
        </Panel>

        <TheoryBox title={t('modulation.optrx.theory.title')}>
          <p>
            <Formula tex="r_k=\int_0^T r(t)\,\varphi_k(t)\,dt \quad(\text{correlator, §7.5.1})" block />
          </p>
          <p>
            <Formula tex="\hat{m}=\arg\min_i \lVert r-s_i\rVert^2 \quad(\text{min-distance, §7.5.3})" block />
          </p>
          <p>
            <Formula tex="\mathrm{SNR}_{\text{peak}}=\dfrac{2E}{N_0}" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
