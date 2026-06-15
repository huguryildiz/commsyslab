import { useState } from 'react';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { LtiFilterPanel } from '../LtiFilterPanel';
import { RealizableFilterPanel } from '../RealizableFilterPanel';
import { FilterStudioPanel } from '../FilterStudioPanel';

type SubTab = 'lti' | 'butter' | 'studio';

/**
 * Filtering — Proakis & Salehi §2.4 (p. 85). Three sub-tabs:
 *  • LTI         — pick an input + ideal filter, see X / H / Y spectra
 *  • Butterworth — realizable analog filters (Butterworth / Chebyshev)
 *  • Studio      — interactive filter studio (source → cutoff drag → listen)
 */
export function FiltersSection() {
  const [sub, setSub] = useState<SubTab>('lti');

  return (
    <div className="fourier__filters">
      <div className="fourier__subtabbar">
        <Segmented
          ariaLabel={t('fourier.tab.filters')}
          value={sub}
          options={[
            { value: 'lti', label: t('fourier.filters.sub.lti') },
            { value: 'butter', label: t('fourier.filters.sub.butter') },
            { value: 'studio', label: t('fourier.filters.sub.studio') },
          ]}
          onChange={setSub}
        />
      </div>

      {sub === 'lti' && <LtiFilterPanel />}
      {sub === 'butter' && <RealizableFilterPanel />}
      {sub === 'studio' && <FilterStudioPanel />}
    </div>
  );
}
