import { useState } from 'react';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { FadingChannelSection } from './sections/FadingChannelSection';
import { RayleighBerSection } from './sections/RayleighBerSection';
import { SpreadSpectrumSection } from './sections/SpreadSpectrumSection';
import { OfdmSection } from './sections/OfdmSection';
import './wireless.css';

type Tab = 'fading' | 'ber' | 'spread' | 'ofdm';

export function WirelessModule() {
  const [tab, setTab] = useState<Tab>('fading');

  return (
    <div className="wl">
      <header className="wl__head">
        <h1>{t('wl.title')}</h1>
        <p>{t('wl.subtitle')}</p>
      </header>
      <Segmented
        ariaLabel={t('wl.title')}
        value={tab}
        options={[
          { value: 'fading', label: t('wl.tab.fading') },
          { value: 'ber', label: t('wl.tab.ber') },
          { value: 'spread', label: t('wl.tab.spread') },
          { value: 'ofdm', label: t('wl.tab.ofdm') },
        ]}
        onChange={(v) => setTab(v as Tab)}
      />
      <div className="wl__grid">
        {tab === 'fading' && <FadingChannelSection />}
        {tab === 'ber' && <RayleighBerSection />}
        {tab === 'spread' && <SpreadSpectrumSection />}
        {tab === 'ofdm' && <OfdmSection />}
      </div>
    </div>
  );
}
