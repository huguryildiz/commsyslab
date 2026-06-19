import { useParams, useNavigate } from 'react-router-dom';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { SamplingSection } from './sections/sampling/SamplingSection';
import { QuantizationTab } from './sections/quantization/QuantizationTab';
import { WaveformTab } from './sections/waveform/WaveformTab';
import { PlaceholderSection } from './sections/PlaceholderSection';
import './sampling-quantization.css';

type Tab = 'sampling' | 'quantization' | 'waveform' | 'media';
const TABS: Tab[] = ['sampling', 'quantization', 'waveform', 'media'];

/**
 * Analog-to-Digital Conversion (Proakis & Salehi, Ch. 7), book-aligned 4-tab shell:
 * Sampling (§7.1) · Quantization (§7.2) · Waveform Coding (§7.3–7.4) ·
 * Source & Media Coding (§7.5–7.7).
 */
export function AdcModule() {
  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: Tab = (TABS as string[]).includes(slug) ? (slug as Tab) : 'sampling';

  const onTab = (v: Tab) =>
    navigate(v === 'sampling' ? '/sampling' : `/sampling/${v}`, { replace: true });

  return (
    <div className="adc__tabwrap">
      <div className="adc__tabbar">
        <Segmented<Tab>
          ariaLabel={t('nav.adc')}
          value={tab}
          onChange={onTab}
          options={[
            { value: 'sampling', label: t('adc.tab.sampling2') },
            { value: 'quantization', label: t('adc.tab.quantization') },
            { value: 'waveform', label: t('adc.tab.waveform') },
            { value: 'media', label: t('adc.tab.media') },
          ]}
        />
      </div>
      {tab === 'sampling' && <SamplingSection />}
      {tab === 'quantization' && <QuantizationTab />}
      {tab === 'waveform' && <WaveformTab />}
      {tab === 'media' && <PlaceholderSection bodyKey="adc.placeholder.media" />}
    </div>
  );
}
