import { useState } from 'react';
import { Panel, Formula, TheoryBox, HintText } from '@/components';
import { t } from '@/i18n';
import type { Derived, ProcessParams } from '../model';
import { GaussianControls, FilterMagPanel, FilterHistPanel } from '../panels';

interface Props {
  params: ProcessParams;
  set: (patch: Partial<ProcessParams>) => void;
  resample: () => void;
  reset: () => void;
  d: Derived;
}

/**
 * §5.3 Gaussian and White Processes.
 * Phase 1 ships the filtered-noise view (5.3.3): white Gaussian noise through a filter stays
 * Gaussian, with the filter |H(f)|² and the output amplitude histogram. The dedicated §5.3.1
 * Gaussian-process and §5.3.2 white-noise sections (thermal model, in-phase/quadrature
 * decomposition, noise-equivalent bandwidth) arrive in Phase 4.
 */
export function GaussianTab({ params, set, resample, reset, d }: Props) {
  const [resetKey, setResetKey] = useState(0);
  const handleReset = () => {
    reset();
    setResetKey((k) => k + 1);
  };

  return (
    <div className="rp__section">
      <div className="module-layout">
        <aside className="rp__controls">
          <GaussianControls params={params} set={set} resample={resample} reset={handleReset} />
        </aside>

        <div className="rp__content" key={resetKey}>
          <Panel title={t('rp.filtermag.title')}>
            <FilterMagPanel d={d} params={params} />
            <Formula tex="S_Y(f)=|H(f)|^2\,S_X(f),\quad S_n(f)=\tfrac{N_0}{2}" />
            <TheoryBox>
              White Gaussian noise has a flat PSD <Formula tex="S_n(f)=N_0/2" /> (§5.3.2). After an
              LTI filter the output spectrum is shaped by <Formula tex="|H(f)|^2" /> (Eq. 5.2.23).
            </TheoryBox>
          </Panel>

          <Panel title={t('rp.filterhist.title')}>
            <FilterHistPanel params={params} />
            <Formula tex="X\sim\mathcal{N}\ \Rightarrow\ Y=h*X\sim\mathcal{N}" />
            <TheoryBox>
              Filtering Gaussian white noise yields a colored but still <em>Gaussian</em> process
              (§5.3.1): an LTI system maps a Gaussian process to a jointly Gaussian one, so the
              output amplitude histogram stays bell-shaped.
            </TheoryBox>
          </Panel>

          <div className="rp__placeholder">
            <h3>{t('rp.soon.title')}</h3>
            <p>
              <HintText text={t('rp.soon.gaussianExtra')} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
