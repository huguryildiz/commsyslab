import { useState } from 'react';
import { Panel, Slider, Select, TheoryBox, Formula, HintText } from '@/components';
import { t } from '@/i18n';
import { buildFilter } from '../model';
import { FilterPlots } from '../panels';
import { RealizableFilterPanel } from '../RealizableFilterPanel';
import { FilterStudioPanel } from '../FilterStudioPanel';
import type { SectionProps } from './types';

type FilterKind = 'lpf' | 'hpf' | 'bpf' | 'bsf' | 'rc';

const DEFAULTS = {
  filterType: 'lpf' as FilterKind, fc: 30, fc2: 70,
};

/**
 * Filtering — Proakis & Salehi §2.4 (p. 85).
 * Ideal filter magnitude responses (LPF/HPF/BPF/BSF/RC) + realizable analog filters.
 */
export function FiltersSection({ clock }: SectionProps) {
  const [filterType, setFilterType] = useState<FilterKind>(DEFAULTS.filterType);
  const [fc, setFc] = useState(DEFAULTS.fc);
  const [fc2, setFc2] = useState(DEFAULTS.fc2);
  const filterData = buildFilter(filterType, fc, fc2, 30, 500, clock);

  // Bumping this key remounts <RealizableFilterPanel> so its internal controls reset too.
  const [realFiltKey, setRealFiltKey] = useState(0);

  const showFc2 = filterType === 'bpf' || filterType === 'bsf';

  function handleReset() {
    setFilterType(DEFAULTS.filterType);
    setFc(DEFAULTS.fc);
    setFc2(DEFAULTS.fc2);
    setRealFiltKey((k) => k + 1);
  }

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('fourier.panel.filter')}>
          <Select
            label={t('fourier.filter.type')}
            value={filterType}
            options={[
              { value: 'lpf', label: t('fourier.filter.type.lpf') },
              { value: 'hpf', label: t('fourier.filter.type.hpf') },
              { value: 'bpf', label: t('fourier.filter.type.bpf') },
              { value: 'bsf', label: t('fourier.filter.type.bsf') },
              { value: 'rc', label: t('fourier.filter.type.rc') },
            ]}
            onChange={setFilterType}
          />
          <Slider label={t('fourier.filter.fc')} value={fc} min={5} max={100} step={5} unit="Hz" onChange={setFc} />
          {showFc2 && (
            <Slider label={t('fourier.filter.fc2')} value={fc2} min={fc + 5} max={150} step={5} unit="Hz" onChange={setFc2} />
          )}
          <div className="transport">
            <button type="button" onClick={handleReset}>{t('fourier.filter.reset')}</button>
          </div>
        </Panel>
      </aside>

      <div className="fourier__content">
        <FilterStudioPanel />

        <Panel title={t('fourier.panel.filter')}>
          <FilterPlots data={filterData} />
          <p className="fourier__hint"><HintText text={t('fourier.hint.filter')} /></p>
        </Panel>

        <RealizableFilterPanel key={realFiltKey} />

        <TheoryBox title={t('fourier.tab.filters')}>
          {filterType === 'rc' ? (
            <Formula tex="|H(f)|=\dfrac{1}{\sqrt{1+(f/f_c)^2}}" block />
          ) : (
            <Formula tex="Y(f)=H(f)\,X(f)" block />
          )}
          <p>Proakis §2.4 (p. 85): filtering multiplies the spectrum by |H(f)|. Band-stop is the complement of band-pass.</p>
        </TheoryBox>
      </div>
    </div>
  );
}
