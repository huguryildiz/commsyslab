import { useParams, useNavigate } from 'react-router-dom';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { SamplingModule } from './SamplingModule';
import { DeltaModModule } from '@/modules/deltamod/DeltaModModule';
import './sampling-quantization.css';

type Tab = 'sampling' | 'deltamod';

/**
 * Analog-to-Digital Conversion (Proakis & Salehi, Ch. 7).
 * Combines the two §7-level waveform-coding views under one module:
 * Sampling & Quantization (§7.1–7.4.1) and Delta Modulation (§7.4.3).
 */
export function AdcModule() {
  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: Tab = (slug as Tab) || 'sampling';

  const handleTabChange = (v: string) => {
    navigate(v === 'sampling' ? '/sampling' : `/sampling/${v}`, { replace: true });
  };

  return (
    <div className="adc__tabwrap">
      <Segmented<Tab>
        ariaLabel={t('nav.adc')}
        value={tab}
        onChange={handleTabChange}
        options={[
          { value: 'sampling', label: t('adc.tab.sampling') },
          { value: 'deltamod', label: t('adc.tab.deltamod') },
        ]}
      />
      {tab === 'sampling' ? <SamplingModule /> : <DeltaModModule />}
    </div>
  );
}
