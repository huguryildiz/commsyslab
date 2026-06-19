import { useState } from 'react';
import { Panel, Segmented, Formula, TheoryBox, HintText } from '@/components';
import { t } from '@/i18n';
import type { Derived, ProcessParams } from '../model';
import { ProcessControls, EnsemblePanel, AutocorrPanel, PsdPanel, FilterMagPanel } from '../panels';
import { CrossCorrSection } from './process/CrossCorrSection';

type Sub = 'single' | 'multiple';

interface Props {
  params: ProcessParams;
  set: (patch: Partial<ProcessParams>) => void;
  resample: () => void;
  reset: () => void;
  d: Derived;
}

/**
 * §5.2 Random Processes: Basic Concepts.
 * Ensemble & mean (5.2.1), autocorrelation & ergodicity (5.2.2), PSD (5.2.5),
 * and the LTI filter magnitude response (5.2.4). Shared process generator on the left.
 */
export function ProcessTab({ params, set, resample, reset, d }: Props) {
  const [sub, setSub] = useState<Sub>('single');
  const [resetKey, setResetKey] = useState(0);
  const handleReset = () => {
    reset();
    setResetKey((k) => k + 1);
  };

  const meanAvg = d.mean.reduce((s, v) => s + v, 0) / d.mean.length;
  const power = d.rEnsemble[0];

  return (
    <div className="rp__section">
      <div className="rp__subtabbar">
        <Segmented<Sub>
          ariaLabel={t('rp.process.sub.ariaLabel')}
          value={sub}
          options={[
            { value: 'single', label: t('rp.process.sub.single') },
            { value: 'multiple', label: t('rp.process.sub.multiple') },
          ]}
          onChange={setSub}
        />
      </div>

      {sub === 'multiple' && <CrossCorrSection />}
      {sub === 'single' && (
        <div className="module-layout">
          <aside className="rp__controls">
            <ProcessControls params={params} set={set} resample={resample} reset={handleReset} />
          </aside>

          <div className="rp__content" key={resetKey}>
            <div className="rp__readouts">
              <div className="rp__metric">
                <span className="rp__metric__label">
                  <HintText text={t('rp.readout.mean')} />
                </span>
                <span className="rp__metric__value">{meanAvg.toFixed(3)}</span>
              </div>
              <div className="rp__metric">
                <span className="rp__metric__label">
                  <HintText text={t('rp.readout.power')} />
                </span>
                <span className="rp__metric__value">{power.toFixed(3)}</span>
              </div>
            </div>

            <Panel title={t('rp.ensemble.title')}>
              <EnsemblePanel d={d} params={params} />
              <Formula tex="m_X(t)=E[X(t)],\quad R_X(t_1,t_2)=E[X(t_1)X(t_2)]" />
              <TheoryBox>
                A random process is an <em>ensemble</em> of sample functions. The mean is an average
                down the ensemble at each instant <Formula tex="t" />; for a stationary process it
                does not depend on <Formula tex="t" /> (Proakis §5.2.1).
              </TheoryBox>
            </Panel>

            <Panel title={t('rp.autocorr.title')}>
              <AutocorrPanel d={d} />
              <Formula tex="R_X(\tau)=E[X(t)\,X(t+\tau)]=R_X(-\tau)" />
              <TheoryBox>
                A wide-sense stationary (WSS) process has a constant mean and an autocorrelation
                that depends only on the lag <Formula tex="\tau=t_1-t_2" /> (Def. 5.2.3). When the
                time average from one realization matches the ensemble average, the process is
                <em> ergodic</em> in autocorrelation — raise <Formula tex="M" /> to watch them
                converge.
              </TheoryBox>
            </Panel>

            <Panel title={t('rp.psd.title')}>
              <PsdPanel d={d} params={params} />
              <Formula tex="S_X(f)=\mathcal{F}\{R_X(\tau)\},\quad P_X=\int_{-\infty}^{\infty} S_X(f)\,df=R_X(0)" />
              <TheoryBox>
                Wiener–Khinchin (Eq. 5.2.15): the power spectral density is the Fourier transform of
                the autocorrelation. Blue is the averaged periodogram estimate (normalized), dashed
                orange is theory. White noise is flat; the RC filter rolls it off; NRZ follows a
                <Formula tex="\operatorname{sinc}^2" /> shape.
              </TheoryBox>
            </Panel>

            <Panel title={t('rp.filter.title')}>
              <FilterMagPanel d={d} params={params} />
              <Formula tex="m_Y=m_X\,H(0),\quad S_Y(f)=|H(f)|^2\,S_X(f)" />
              <TheoryBox>
                Passing a WSS process through an LTI system shapes its spectrum by
                <Formula tex="|H(f)|^2" /> (Eq. 5.2.23); the output stays WSS and jointly stationary
                with the input (§5.2.4).
              </TheoryBox>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
