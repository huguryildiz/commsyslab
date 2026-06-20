import { useState } from 'react';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { ScalarQuantSection } from './ScalarQuantSection';
import { VectorQuantSection } from './VectorQuantSection';

type Sub = 'scalar' | 'vector';

/** §7.2 Quantization — Scalar (uniform/Lloyd-Max) and Vector sub-tabs. */
export function QuantizationTab() {
  const [sub, setSub] = useState<Sub>('scalar');
  return (
    <div className="adc__section">
      <div className="adc__subtabbar">
        <Segmented<Sub>
          ariaLabel={t('adc.tab.quantization')}
          value={sub}
          onChange={setSub}
          options={[
            { value: 'scalar', label: t('adc.sub.scalar') },
            { value: 'vector', label: t('adc.sub.vector') },
          ]}
        />
      </div>
      {sub === 'scalar' ? <ScalarQuantSection /> : <VectorQuantSection />}
    </div>
  );
}
