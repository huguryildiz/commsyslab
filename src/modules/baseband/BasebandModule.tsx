// src/modules/baseband/BasebandModule.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { PulseShapingSection } from './PulseShapingSection';
import { ReceiverSection } from './ReceiverSection';
import { PowerSpectrumSection } from './PowerSpectrumSection';
import { PartialResponseSection } from './PartialResponseSection';
import { PrDetectionSection } from './PrDetectionSection';
import { EyeEqualizationSection } from './EyeEqualizationSection';
import { ChannelDistortionSection } from './ChannelDistortionSection';
import './baseband.css';

type Tab = 'pulse' | 'receiver' | 'psd' | 'pr' | 'prdet' | 'eye' | 'distortion';
const TABS: { value: Tab; key: string }[] = [
  { value: 'pulse', key: 'baseband.tab.pulse' },
  { value: 'receiver', key: 'baseband.tab.receiver' },
  { value: 'psd', key: 'baseband.tab.psd' },
  { value: 'pr', key: 'baseband.tab.pr' },
  { value: 'prdet', key: 'baseband.tab.prdet' },
  { value: 'eye', key: 'baseband.tab.eye' },
  { value: 'distortion', key: 'baseband.tab.distortion' },
];

export function BasebandModule() {
  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: Tab = (slug as Tab) || 'pulse';

  return (
    <div className="bb-module">
      <Segmented<Tab>
        ariaLabel={t('nav.baseband')}
        value={tab}
        options={TABS.map((tb) => ({ value: tb.value, label: t(tb.key) }))}
        onChange={(v) => navigate(v === 'pulse' ? '/baseband' : `/baseband/${v}`, { replace: true })}
      />
      {tab === 'pulse' && <PulseShapingSection />}
      {tab === 'receiver' && <ReceiverSection />}
      {tab === 'psd' && <PowerSpectrumSection />}
      {tab === 'pr' && <PartialResponseSection />}
      {tab === 'prdet' && <PrDetectionSection />}
      {tab === 'eye' && <EyeEqualizationSection />}
      {tab === 'distortion' && <ChannelDistortionSection />}
    </div>
  );
}
