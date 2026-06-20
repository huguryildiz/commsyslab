// src/modules/baseband/PrDetectionSection.tsx — §10.4 detection of partial-response signals.
import { useState, useMemo } from 'react';
import { Panel, Slider, Toggle, Readout, InfoCard, HintText, TheoryBox, Formula } from '@/components';
import { t } from '@/i18n';
import { linspace } from '@/lib/dsp/math';
import { randomBitSource, type Bit } from '@/lib/sim/sources';
import { buildPrDetectionView, type PrDetectionParams } from './model';
import { EyePanel, PrBerPanel, PrTrellisPanel } from './panels';

const N_SYMBOLS = 15;
const EBN0 = linspace(0, 12, 25);

function makeBits(seed: number): Bit[] {
  const gen = randomBitSource(seed);
  return Array.from({ length: N_SYMBOLS }, () => gen());
}

/** A labelled row of the precoding table (Table 10.1). */
function PrRow({ label, values, errors }: { label: string; values: number[]; errors?: number[] }) {
  return (
    <div className="baseband__pr-row">
      <span className="baseband__pr-head">{label}</span>
      <div className="baseband__pr-values">
        {values.map((v, i) => (
          <span
            key={i}
            className={
              errors && errors[i] ? 'baseband__pr-cell baseband__pr-cell--err' : 'baseband__pr-cell'
            }
          >
            {v < 0 ? `−${Math.abs(v)}` : v}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PrDetectionSection() {
  const [seed, setSeed] = useState(7);
  const [precoding, setPrecoding] = useState(true);
  const [flipIndex, setFlipIndex] = useState(4);
  const [resetKey, setResetKey] = useState(0);

  const bits = useMemo(() => makeBits(seed), [seed]);
  const view = useMemo(() => {
    const params: PrDetectionParams = { bits, precoding, flipIndex, ebN0dB: EBN0, sps: 16 };
    return buildPrDetectionView(params);
  }, [bits, precoding, flipIndex]);

  const totalErrors = view.errorFlags.reduce((s, e) => s + e, 0);

  const reset = () => {
    setSeed(7);
    setPrecoding(true);
    setFlipIndex(4);
    setResetKey((k) => k + 1);
  };

  return (
    <div className="module-layout">
      <aside className="baseband__controls">
        <Panel title={t('baseband.tab.prdet')}>
          <Toggle label={t('baseband.prdet.precoding')} checked={precoding} onChange={setPrecoding} />
          <Slider
            label={t('baseband.prdet.flip')}
            value={flipIndex}
            min={0}
            max={N_SYMBOLS - 1}
            step={1}
            onChange={setFlipIndex}
          />
          <button type="button" onClick={() => setSeed((s) => s + 1)}>
            {t('baseband.prdet.resample')}
          </button>
          <button type="button" onClick={reset}>
            {t('baseband.reset')}
          </button>
        </Panel>
      </aside>

      <div className="baseband__content">
        <div className="baseband__readouts">
          <Readout
            label={t('baseband.prdet.readout.errors')}
            value={totalErrors}
            tone={precoding ? (totalErrors <= 1 ? 'ok' : 'default') : totalErrors > 1 ? 'err' : 'default'}
          />
        </div>

        <Panel title={t('baseband.prdet.panel.table')}>
          <div className="baseband__pr-table">
            <PrRow label="dₙ" values={view.table.d} />
            <PrRow label="pₙ" values={view.table.p} />
            <PrRow label="aₙ" values={view.table.a} />
            <PrRow label="bₙ" values={view.table.b} />
            <PrRow label="d̂ₙ" values={view.table.dHat} errors={view.errorFlags} />
          </div>
        </Panel>

        <Panel title={t('baseband.prdet.panel.eye')}>
          <EyePanel key={resetKey} traces={view.eye} sps={16} label="Three-level duobinary eye diagram" />
        </Panel>
        <Panel title={t('baseband.prdet.panel.trellis')}>
          <PrTrellisPanel view={view} />
        </Panel>
        <Panel title={t('baseband.prdet.panel.ber')}>
          <PrBerPanel key={`${resetKey}-ber`} view={view} />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('baseband.prdet.card.levels.title')} accent="green">
            <p>
              <HintText text={t('baseband.prdet.card.levels.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.prdet.card.precode.title')} accent="orange">
            <p>
              <HintText text={t('baseband.prdet.card.precode.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.prdet.card.sbs.title')} accent="blue">
            <p>
              <HintText text={t('baseband.prdet.card.sbs.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.prdet.card.penalty.title')} accent="green">
            <p>
              <HintText text={t('baseband.prdet.card.penalty.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('baseband.prdet.theory')}>
          <p>
            <Formula tex="p_m=d_m\ominus p_{m-1}\ (\mathrm{mod}\,2),\qquad a_m=2p_m-1" block />
          </p>
          <p>
            <Formula tex="b_m=a_m+a_{m-1}\in\{-2,0,2\},\qquad \hat d_m=\left(\tfrac{b_m}{2}+1\right)\bmod 2" block />
          </p>
          <p>
            <Formula tex="\text{ML sequence detection recovers }\approx 1.76\text{ dB of the } 2.1\text{ dB penalty}" />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
