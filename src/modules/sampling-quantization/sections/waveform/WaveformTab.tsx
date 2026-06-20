import { useState } from 'react';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { PcmSection } from './PcmSection';
import { DpcmSection } from './DpcmSection';
import { DeltaModSection } from './DeltaModSection';

type Sub = 'pcm' | 'dpcm' | 'dm';

/** §7.3–7.4 Waveform Coding — PCM & Companding, DPCM, Delta Modulation sub-tabs. */
export function WaveformTab() {
  const [sub, setSub] = useState<Sub>('pcm');
  return (
    <div className="adc__section">
      <div className="adc__subtabbar">
        <Segmented<Sub>
          ariaLabel={t('adc.tab.waveform')}
          value={sub}
          onChange={setSub}
          options={[
            { value: 'pcm', label: t('adc.sub.pcm') },
            { value: 'dpcm', label: t('adc.sub.dpcm') },
            { value: 'dm', label: t('adc.sub.dm') },
          ]}
        />
      </div>
      {sub === 'pcm' && <PcmSection />}
      {sub === 'dpcm' && <DpcmSection />}
      {sub === 'dm' && <DeltaModSection />}
    </div>
  );
}
