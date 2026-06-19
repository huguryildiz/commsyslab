import { useState } from 'react';
import { Panel, Segmented, Formula, HintText } from '@/components';
import { t } from '@/i18n';
import type { Derived, ProcessParams } from '../model';
import { ProcessControls, EnsemblePanel, AutocorrPanel, PsdPanel, FilterMagPanel } from '../panels';
import { CrossCorrSection } from './process/CrossCorrSection';
import { FormulaCards, FormulaCard, CardFormula } from '../cards';

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
            </Panel>

            <Panel title={t('rp.autocorr.title')}>
              <AutocorrPanel d={d} />
              <Formula tex="R_X(\tau)=E[X(t)\,X(t+\tau)]=R_X(-\tau)" />
            </Panel>

            <Panel title={t('rp.psd.title')}>
              <PsdPanel d={d} params={params} />
              <Formula tex="S_X(f)=\mathcal{F}\{R_X(\tau)\},\quad P_X=\int_{-\infty}^{\infty} S_X(f)\,df=R_X(0)" />
            </Panel>

            <Panel title={t('rp.filter.title')}>
              <FilterMagPanel d={d} params={params} />
              <Formula tex="m_Y=m_X\,H(0),\quad S_Y(f)=|H(f)|^2\,S_X(f)" />
            </Panel>

            {/* Book formulas — §5.2.1 averages · §5.2.2 WSS · §5.2.4 LTI · §5.2.5 PSD */}
            <FormulaCards>
              <FormulaCard
                title={<>Statistical averages (§5.2.1, Eqs. 5.2.1–5.2.2)</>}
                accent="green"
              >
                <p>
                  The <strong>mean</strong> is the ensemble average at each instant; the{' '}
                  <strong>autocorrelation</strong> measures how the process at two times relates:
                </p>
                <CardFormula tex="m_X(t)=E[X(t)]" />
                <CardFormula tex="R_X(t_1,t_2)=E[X(t_1)\,X(t_2)]" />
              </FormulaCard>

              <FormulaCard title={<>Wide-sense stationary (§5.2.2)</>} accent="orange">
                <p>
                  A process is WSS when its mean is constant and its autocorrelation depends only on
                  the lag <Formula tex="\tau=t_1-t_2" />:
                </p>
                <CardFormula tex="m_X(t)=m_X,\qquad R_X(t_1,t_2)=R_X(\tau)" />
                <p>The autocorrelation is then even, peaks at the origin, and gives the power:</p>
                <CardFormula tex="R_X(\tau)=R_X(-\tau),\quad R_X(0)=E[X^2]\ge|R_X(\tau)|" />
              </FormulaCard>

              <FormulaCard title={<>Power spectral density (§5.2.5, Eq. 5.2.15)</>} accent="blue">
                <p>
                  The <strong>Wiener–Khinchin theorem</strong>: the PSD is the Fourier transform of
                  the autocorrelation. It is real, even, and nonnegative:
                </p>
                <CardFormula tex="S_X(f)=\mathcal{F}\{R_X(\tau)\}\ \ge 0" />
                <p>Total power is the area under the PSD, equal to the zero-lag autocorrelation:</p>
                <CardFormula tex="P_X=\int_{-\infty}^{\infty} S_X(f)\,df=R_X(0)" />
              </FormulaCard>

              <FormulaCard title={<>Process through an LTI system (§5.2.4)</>} accent="green">
                <p>
                  Filtering a WSS process keeps it WSS. The mean scales by the DC gain{' '}
                  <Formula tex="H(0)" /> (Eq. 5.2.22) and the spectrum by <Formula tex="|H(f)|^2" />{' '}
                  (Eq. 5.2.23):
                </p>
                <CardFormula tex="m_Y=m_X\,H(0),\qquad S_Y(f)=|H(f)|^2\,S_X(f)" />
                <p>In the time domain the output autocorrelation is a double convolution:</p>
                <CardFormula tex="R_Y(\tau)=R_X(\tau)*h(\tau)*h(-\tau)" />
              </FormulaCard>
            </FormulaCards>
          </div>
        </div>
      )}
    </div>
  );
}
