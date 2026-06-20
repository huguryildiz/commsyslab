// src/modules/baseband/DetectionSection.tsx
import { useState, useMemo, useRef } from 'react';
import {
  Panel,
  Slider,
  Toggle,
  Select,
  Readout,
  InfoCard,
  HintText,
  TheoryBox,
  Formula,
  TransportControls,
} from '@/components';
import { t } from '@/i18n';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import type { DetectCode } from '@/lib/dsp/lcdetect';
import { buildDetectionView, type DetectionParams } from './model';
import { LcSignalPanel, LcReceivedPanel, LcCorrelatorPanel, LcDecisionPanel } from './panels';

const CODES: { value: DetectCode; key: string }[] = [
  { value: 'polar-nrz', key: 'baseband.detect.code.polarNrz' },
  { value: 'manchester', key: 'baseband.detect.code.manchester' },
  { value: 'polar-rz', key: 'baseband.detect.code.polarRz' },
  { value: 'unipolar-nrz', key: 'baseband.detect.code.unipolarNrz' },
];

const DEFAULT_BITS = [0, 1, 0, 1, 1, 0, 0, 1, 0, 0];
const SPS = 32;

export function DetectionSection() {
  const [code, setCode] = useState<DetectCode>('polar-nrz');
  const [bits, setBits] = useState<number[]>(DEFAULT_BITS);
  const [ebN0Db, setEbN0Db] = useState(10);
  const [useMatchedFilter, setUseMatchedFilter] = useState(false);
  const [seed, setSeed] = useState(7);
  const [resetKey, setResetKey] = useState(0);

  // Animation cursor in bit periods; starts fully revealed.
  const [progress, setProgress] = useState(bits.length);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const loop = useSimulationLoop({
    ticksPerSecond: 8,
    onTick: () => {
      const next = progressRef.current + 0.1; // ~0.8 bits/sec at speed 1
      if (next >= bits.length) {
        setProgress(bits.length);
        loop.stop();
      } else {
        setProgress(next);
      }
    },
    onReset: () => setProgress(bits.length),
  });

  const view = useMemo(
    () =>
      buildDetectionView({
        code,
        bits,
        ebN0Db,
        useMatchedFilter,
        sps: SPS,
        seed,
      } as DetectionParams),
    [code, bits, ebN0Db, useMatchedFilter, seed],
  );

  const toggleBit = (i: number) => setBits((b) => b.map((v, k) => (k === i ? (v ? 0 : 1) : v)));
  const randomize = () => {
    setBits((b) => b.map(() => (Math.random() < 0.5 ? 0 : 1)));
    setSeed((s) => s + 1);
  };
  const playFromStart = () => {
    setProgress(0);
    loop.start();
  };

  const reset = () => {
    setCode('polar-nrz');
    setBits(DEFAULT_BITS);
    setEbN0Db(10);
    setUseMatchedFilter(false);
    setSeed(7);
    setProgress(DEFAULT_BITS.length);
    loop.stop();
    setResetKey((k) => k + 1);
  };

  return (
    <div className="module-layout">
      <aside className="baseband__controls">
        <Panel title={t('baseband.tab.detect')}>
          <Select<DetectCode>
            label={t('baseband.detect.code')}
            value={code}
            options={CODES.map((c) => ({ value: c.value, label: t(c.key) }))}
            onChange={(v) => setCode(v)}
          />
          <Slider
            label={t('baseband.detect.ebn0')}
            value={ebN0Db}
            min={0}
            max={20}
            step={0.5}
            unit="dB"
            precision={1}
            onChange={setEbN0Db}
          />
          <Toggle
            label={t('baseband.detect.mf')}
            checked={useMatchedFilter}
            onChange={setUseMatchedFilter}
          />
        </Panel>

        <Panel title={t('baseband.detect.bits')}>
          <div className="bb-bits">
            {bits.map((b, i) => (
              <button
                key={i}
                type="button"
                className={`bb-bits__bit${b ? ' bb-bits__bit--on' : ''}`}
                onClick={() => toggleBit(i)}
                aria-label={`bit ${i} = ${b}`}
              >
                {b}
              </button>
            ))}
          </div>
          <button type="button" onClick={randomize}>
            {t('baseband.detect.randomize')}
          </button>
        </Panel>

        <Panel title={t('baseband.detect.animation')}>
          <button type="button" onClick={playFromStart} disabled={loop.running}>
            {t('baseband.detect.play')}
          </button>
          <TransportControls loop={loop} />
          <button type="button" onClick={reset}>
            {t('baseband.reset')}
          </button>
        </Panel>
      </aside>

      <div className="baseband__content">
        <div className="baseband__readouts">
          <Readout
            label={t('baseband.detect.readout.errors')}
            value={`${view.errors} / ${view.nBits}`}
          />
          <Readout label={t('baseband.detect.readout.ber')} value={view.ber.toFixed(3)} />
          <Readout label={t('baseband.detect.readout.pb')} value={view.pbTheory.toExponential(2)} />
        </div>

        <Panel title={t('baseband.detect.panel.signal')}>
          <LcSignalPanel key={`s${resetKey}`} view={view} progress={progress} />
        </Panel>
        <Panel title={t('baseband.detect.panel.received')}>
          <LcReceivedPanel key={`r${resetKey}`} view={view} progress={progress} />
        </Panel>
        <Panel title={t('baseband.detect.panel.correlator')}>
          <LcCorrelatorPanel key={`c${resetKey}`} view={view} progress={progress} />
        </Panel>
        <Panel title={t('baseband.detect.panel.decision')}>
          <LcDecisionPanel key={`d${resetKey}`} view={view} progress={progress} />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('baseband.detect.card.correlator.title')} accent="blue">
            <p>
              <HintText text={t('baseband.detect.card.correlator.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.detect.card.mf.title')} accent="orange">
            <p>
              <HintText text={t('baseband.detect.card.mf.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.detect.card.decision.title')} accent="green">
            <p>
              <HintText text={t('baseband.detect.card.decision.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.detect.card.template.title')} accent="blue">
            <p>
              <HintText text={t('baseband.detect.card.template.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('baseband.detect.theory.title')}>
          <p>
            <Formula tex="y_k=\frac{1}{E}\int_{0}^{T} x(t)\,p(t)\,dt,\qquad h(t)=p(T-t)" block />
          </p>
          <p>
            <Formula
              tex="\hat b_k=\begin{cases}1,& y_k>\gamma\\0,& y_k\le\gamma\end{cases}\quad\gamma=\begin{cases}0&\text{antipodal}\\0.5&\text{OOK}\end{cases}"
              block
            />
          </p>
          <p>
            <Formula
              tex="P_b=Q\!\left(\sqrt{2E_b/N_0}\right)\ \text{(antipodal)},\qquad P_b=Q\!\left(\sqrt{E_b/N_0}\right)\ \text{(OOK)}"
              block
            />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
