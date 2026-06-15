import { useParams, useNavigate } from 'react-router-dom';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { ChannelsCapacitySection } from './ChannelsCapacitySection';
import { ShannonLimitSection } from './ShannonLimitSection';
import { BlockCodesSection } from './BlockCodesSection';
import { ConvCodesSection } from './ConvCodesSection';
import { CyclicCodesSection } from './CyclicCodesSection';
import { GfBchSection } from './GfBchSection';
import { ReedSolomonSection } from './ReedSolomonSection';
import { CodesVsShannonSection } from './CodesVsShannonSection';
import { ConcatenatedSection } from './ConcatenatedSection';
import './channel-coding.css';

type Tab = 'channels' | 'shannon' | 'block' | 'conv' | 'cyclic' | 'gfbch' | 'rs' | 'compare' | 'concat';

const TABS: { value: Tab; label: string }[] = [
  { value: 'channels', label: t('cc.tab.channels') },
  { value: 'shannon', label: t('cc.tab.shannon') },
  { value: 'block', label: t('cc.tab.block') },
  { value: 'conv', label: t('cc.tab.conv') },
  { value: 'cyclic', label: t('cc.tab.cyclic') },
  { value: 'gfbch', label: t('cc.tab.gfbch') },
  { value: 'rs', label: t('cc.tab.rs') },
  { value: 'compare', label: t('cc.tab.compare') },
  { value: 'concat', label: t('cc.tab.concat') },
];

export function ChannelCodingModule() {
  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: Tab = (slug as Tab) || 'channels';

  const handleTabChange = (v: string) => {
    navigate(v === 'channels' ? '/channel-coding' : `/channel-coding/${v}`, { replace: true });
  };

  return (
    <div className="cc-module">
      <header className="cc-head">
        <h1>{t('cc.title')}</h1>
        <p>{t('cc.subtitle')}</p>
      </header>
      <Segmented<Tab>
        ariaLabel={t('cc.title')}
        value={tab}
        options={TABS}
        onChange={handleTabChange}
      />
      {tab === 'channels' && <ChannelsCapacitySection />}
      {tab === 'shannon' && <ShannonLimitSection />}
      {tab === 'block' && <BlockCodesSection />}
      {tab === 'conv' && <ConvCodesSection />}
      {tab === 'cyclic' && <CyclicCodesSection />}
      {tab === 'gfbch' && <GfBchSection />}
      {tab === 'rs' && <ReedSolomonSection />}
      {tab === 'compare' && <CodesVsShannonSection />}
      {tab === 'concat' && <ConcatenatedSection />}
    </div>
  );
}
