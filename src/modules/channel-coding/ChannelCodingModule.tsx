import { useState } from 'react';
import { t } from '@/i18n';
import { ChannelsCapacitySection } from './ChannelsCapacitySection';
import { ShannonLimitSection } from './ShannonLimitSection';
import { BlockCodesSection } from './BlockCodesSection';
import { ConvCodesSection } from './ConvCodesSection';
import { CyclicCodesSection } from './CyclicCodesSection';
import { GfBchSection } from './GfBchSection';
import './channel-coding.css';

type Tab = 'channels' | 'shannon' | 'block' | 'conv' | 'cyclic' | 'gfbch';

const TABS: { id: Tab; key: string }[] = [
  { id: 'channels', key: 'cc.tab.channels' },
  { id: 'shannon', key: 'cc.tab.shannon' },
  { id: 'block', key: 'cc.tab.block' },
  { id: 'conv', key: 'cc.tab.conv' },
  { id: 'cyclic', key: 'cc.tab.cyclic' },
  { id: 'gfbch', key: 'cc.tab.gfbch' },
];

export function ChannelCodingModule() {
  const [tab, setTab] = useState<Tab>('channels');
  return (
    <div className="cc-module">
      <header className="cc-head">
        <h1>{t('cc.title')}</h1>
        <p>{t('cc.subtitle')}</p>
      </header>
      <nav className="cc-tabs">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            className={tab === tb.id ? 'cc-tab cc-tab--active' : 'cc-tab'}
            onClick={() => setTab(tb.id)}
          >
            {t(tb.key)}
          </button>
        ))}
      </nav>
      {tab === 'channels' && <ChannelsCapacitySection />}
      {tab === 'shannon' && <ShannonLimitSection />}
      {tab === 'block' && <BlockCodesSection />}
      {tab === 'conv' && <ConvCodesSection />}
      {tab === 'cyclic' && <CyclicCodesSection />}
      {tab === 'gfbch' && <GfBchSection />}
    </div>
  );
}
