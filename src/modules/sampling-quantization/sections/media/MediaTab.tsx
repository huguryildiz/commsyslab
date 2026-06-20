// Source & Media Coding tab (Proakis §7.5–7.7)
// Three sub-tabs: LPC Vocoder · Digital Audio · JPEG (DCT)
import { useState } from 'react';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { LpcSection } from './LpcSection';
import { PlaceholderSection } from '../PlaceholderSection';

type Sub = 'lpc' | 'audio' | 'jpeg';

/** §7.5–7.7 Source & Media Coding — LPC Vocoder, Digital Audio, JPEG sub-tabs. */
export default function MediaTab() {
  const [sub, setSub] = useState<Sub>('lpc');
  return (
    <div className="adc__section">
      <div className="adc__subtabbar">
        <Segmented<Sub>
          ariaLabel={t('adc.tab.media')}
          value={sub}
          onChange={setSub}
          options={[
            { value: 'lpc', label: t('adc.sub.lpc') },
            { value: 'audio', label: t('adc.sub.audio') },
            { value: 'jpeg', label: t('adc.sub.jpeg') },
          ]}
        />
      </div>
      {sub === 'lpc' && <LpcSection />}
      {sub === 'audio' && <PlaceholderSection bodyKey="adc.placeholder.audio" />}
      {sub === 'jpeg' && <PlaceholderSection bodyKey="adc.placeholder.jpeg" />}
    </div>
  );
}
