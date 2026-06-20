// Source & Media Coding tab (Proakis §7.2 / §7.5–7.7)
// Four sub-tabs: Quantization Effects · LPC Vocoder · Digital Audio · JPEG (DCT)
import { useState } from 'react';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { QuantizationEffectsSection } from './QuantizationEffectsSection';
import { LpcSection } from './LpcSection';
import { DigitalAudioSection } from './DigitalAudioSection';
import { JpegSection } from './JpegSection';

type Sub = 'quant' | 'lpc' | 'audio' | 'jpeg';

/** §7.2 / §7.5–7.7 Source & Media Coding — Quantization Effects, LPC Vocoder, Digital Audio, JPEG sub-tabs. */
export default function MediaTab() {
  const [sub, setSub] = useState<Sub>('quant');
  return (
    <div className="adc__section">
      <div className="adc__subtabbar">
        <Segmented<Sub>
          ariaLabel={t('adc.tab.media')}
          value={sub}
          onChange={setSub}
          options={[
            { value: 'quant', label: t('adc.sub.quant') },
            { value: 'lpc',   label: t('adc.sub.lpc') },
            { value: 'audio', label: t('adc.sub.audio') },
            { value: 'jpeg',  label: t('adc.sub.jpeg') },
          ]}
        />
      </div>
      {sub === 'quant' && <QuantizationEffectsSection />}
      {sub === 'lpc'   && <LpcSection />}
      {sub === 'audio' && <DigitalAudioSection />}
      {sub === 'jpeg'  && <JpegSection />}
    </div>
  );
}
