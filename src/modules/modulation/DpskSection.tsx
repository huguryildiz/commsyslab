import { useMemo, useRef, useState } from 'react';
import {
  Panel,
  Slider,
  Select,
  Readout,
  TheoryBox,
  Formula,
  HintText,
  InfoCard,
  TransportControls,
} from '@/components';
import { t } from '@/i18n';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { simulateDpsk } from '@/lib/dsp/dpsk';
import { buildDpskView, sampleDpskScatter } from './dpsk-model';
import { PhaseTrailPanel, DiffConstellationPanel, DpskBerPanel } from './dpsk-panels';
import './modulation.css';

const M_OPTIONS = [2, 4, 8];
const BATCH = 2000;
const TRAIL_WINDOW = 16;
const DEFAULT_M = 4;
const DEFAULT_EBN0 = 8;

export function DpskSection() {
  const [M, setM] = useState(DEFAULT_M);
  const [ebN0Db, setEbN0Db] = useState(DEFAULT_EBN0);
  const [nonce, setNonce] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [liveBer, setLiveBer] = useState<{ errors: number; total: number } | null>(null);
  const [trailHead, setTrailHead] = useState(TRAIL_WINDOW);

  const errRef = useRef(0);
  const totRef = useRef(0);
  const seedRef = useRef(1000);

  const view = useMemo(() => buildDpskView({ M, ebN0Db }), [M, ebN0Db]);
  const scatter = useMemo(
    () => sampleDpskScatter({ M, ebN0Db, n: 400, seed: 2024 + nonce }),
    [M, ebN0Db, nonce],
  );

  const resetCounts = () => {
    errRef.current = 0;
    totRef.current = 0;
    setLiveBer(null);
  };

  const handleM = (m: number) => {
    setM(m);
    resetCounts();
  };
  const handleEbN0 = (v: number) => {
    setEbN0Db(v);
    resetCounts();
  };

  const loop = useSimulationLoop({
    ticksPerSecond: 6,
    onTick: () => {
      const r = simulateDpsk({ M, ebN0Db, numSymbols: BATCH, seed: seedRef.current++ });
      errRef.current += r.bitErrors;
      totRef.current += r.totalBits;
      setLiveBer({ errors: errRef.current, total: totRef.current });
      setTrailHead((hd) => (hd >= scatter.trail.length ? TRAIL_WINDOW : hd + 1));
    },
    onReset: resetCounts,
  });

  const livePoint =
    liveBer && liveBer.total > 0 ? { ebN0Db, ser: liveBer.errors / liveBer.total } : undefined;
  const trail = scatter.trail.slice(Math.max(0, trailHead - TRAIL_WINDOW), trailHead);

  const handleReset = () => {
    setM(DEFAULT_M);
    setEbN0Db(DEFAULT_EBN0);
    setNonce(0);
    setTrailHead(TRAIL_WINDOW);
    resetCounts();
    loop.reset();
    setResetKey((k) => k + 1);
  };

  return (
    <div className="module-layout">
      <aside className="modulation__controls">
        <Panel title={t('modulation.dpsk.title')}>
          <Select<string>
            label={t('modulation.M')}
            value={String(M)}
            onChange={(v) => handleM(Number(v))}
            options={M_OPTIONS.map((m) => ({ value: String(m), label: String(m) }))}
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
          <button type="button" onClick={() => setNonce((n) => n + 1)}>
            {t('modulation.dpsk.resample')}
          </button>
          <button type="button" onClick={handleReset} className="btn--reset">
            {t('modulation.dpsk.reset')}
          </button>
          <TransportControls loop={loop} />
        </Panel>
      </aside>

      <div className="modulation__content">
        <div className="modulation__readouts">
          <Readout label={t('modulation.dpsk.readout.bits')} value={view.bitsPerSymbol} />
          <Readout
            label={t('modulation.dpsk.readout.peTheory')}
            value={view.theoryNow.toExponential(2)}
          />
          <Readout
            label={t('modulation.dpsk.readout.berLive')}
            value={livePoint ? livePoint.ser.toExponential(2) : '—'}
            tone={livePoint ? 'ok' : undefined}
          />
          <Readout
            label={t('modulation.dpsk.readout.errors')}
            value={liveBer ? `${liveBer.errors} / ${liveBer.total}` : '—'}
          />
        </div>

        <div className="modulation__plots">
          <Panel title={t('modulation.dpsk.panel.trail')}>
            <PhaseTrailPanel view={view} trail={trail} />
          </Panel>
          <Panel title={<HintText text={t('modulation.dpsk.panel.diff')} />}>
            <DiffConstellationPanel view={view} scatter={scatter} />
          </Panel>
        </div>

        <Panel title={<HintText text={t('modulation.dpsk.panel.ber')} />}>
          <DpskBerPanel key={resetKey} view={view} ebN0Db={ebN0Db} livePoint={livePoint} />
          <div className="modulation__legend">
            <span className="lg-theory">{t('modulation.dpsk.legend.dpsk')}</span>
            <span className="lg-sim">{t('modulation.dpsk.legend.psk')}</span>
            <span className="lg-live">{t('modulation.dpsk.legend.live')}</span>
          </div>
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('modulation.dpsk.card.why.title')} accent="green">
            <HintText text={t('modulation.dpsk.card.why.body')} />
          </InfoCard>
          <InfoCard title={t('modulation.dpsk.card.detect.title')} accent="blue">
            <HintText text={t('modulation.dpsk.card.detect.body')} />
          </InfoCard>
          <InfoCard title={t('modulation.dpsk.card.penalty.title')} accent="orange">
            <HintText text={t('modulation.dpsk.card.penalty.body')} />
          </InfoCard>
        </div>

        <TheoryBox title={t('modulation.dpsk.theory.title')}>
          <p>{t('modulation.dpsk.theory.encode')}</p>
          <Formula tex="\theta_k=\theta_{k-1}+\Delta\theta_k \pmod{2\pi}" block />
          <p>{t('modulation.dpsk.theory.detect')}</p>
          <Formula tex="\hat{\Delta\theta}_k=\arg\!\big(Y_k\,Y_{k-1}^{*}\big)" block />
          <p>{t('modulation.dpsk.theory.pe')}</p>
          <Formula tex="P_b^{\mathrm{DPSK}}=\tfrac12\,e^{-\mathcal{E}_b/N_0}" block />
        </TheoryBox>
      </div>
    </div>
  );
}
