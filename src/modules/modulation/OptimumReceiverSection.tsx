import { useMemo, useRef, useState } from 'react';
import { Panel, Slider, Select, Readout, TheoryBox, Formula, TransportControls } from '@/components';
import { t } from '@/i18n';
import { makeRng } from '@/lib/sim/sources';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import {
  OPT_RX_SIGNAL_SETS,
  buildOptRxView,
  simulateReception,
  monteCarloPe,
} from './model';
import { WaveformPanel, DemodPanel, DecisionAxisPanel } from './optreceiver-panels';

const SPS = 32;
const BATCH = 200;

export function OptimumReceiverSection() {
  const [signalSetId, setSignalSetId] = useState('binary');
  const [ebN0Db, setEbN0Db] = useState(8);
  const [symbolIndex, setSymbolIndex] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [livePe, setLivePe] = useState<{ errors: number; total: number } | null>(null);

  const errRef = useRef(0);
  const totRef = useRef(0);
  const mcRngRef = useRef(makeRng(2024));

  const view = useMemo(
    () => buildOptRxView({ signalSetId, ebN0Db, symbolIndex, sps: SPS }),
    [signalSetId, ebN0Db, symbolIndex],
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
          <Select<string>
            label={t('modulation.optrx.symbol')}
            value={String(symbolIndex)}
            onChange={(v) => setSymbolIndex(Number(v))}
            options={view.amplitudes.map((a, i) => ({
              value: String(i),
              label: `${view.labels[i]}  (a=${a.toFixed(2)})`,
            }))}
          />
          <button type="button" onClick={() => setNonce((n) => n + 1)}>
            {t('modulation.optrx.resample')}
          </button>
          <TransportControls loop={loop} />
        </Panel>
      </aside>

      <div className="modulation__content">
        <div className="modulation__readouts">
          <Readout label={t('modulation.optrx.readout.peakSnr')} value={view.peakSnr.toFixed(2)} />
          <Readout
            label={t('modulation.optrx.readout.statistic')}
            value={reception.statistic.toFixed(3)}
          />
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
            <div className="modulation__legend">
              <span className="lg-live">{t('modulation.optrx.legend.corr')}</span>
              <span className="lg-sim">{t('modulation.optrx.legend.mfout')}</span>
            </div>
          </Panel>
        </div>

        <Panel title={t('modulation.optrx.panel.decision')}>
          <DecisionAxisPanel view={view} reception={reception} />
        </Panel>

        <TheoryBox title={t('modulation.optrx.theory.title')}>
          <p>
            <Formula tex="r_k=\int_0^T r(t)\,\varphi_k(t)\,dt \quad(\text{correlator, §7.5.1})" block />
          </p>
          <p>
            <Formula tex="h(t)=g(T-t),\quad y(t)=(r*h)(t),\ \ y(T)=\textstyle\int_0^T r\,\varphi\,dt" block />
          </p>
          <p>
            <Formula tex="\mathrm{SNR}_{\text{peak}}=\dfrac{2E}{N_0}" block />
          </p>
          <p>
            <Formula tex="P_e^{\text{2-PAM}}=Q\!\left(\sqrt{2E_b/N_0}\right)" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
