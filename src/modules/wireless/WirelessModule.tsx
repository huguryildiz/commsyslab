import { useState } from 'react';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { FadingChannelSection } from './sections/FadingChannelSection';
import { RayleighBerSection } from './sections/RayleighBerSection';
import { SpreadSpectrumSection } from './sections/SpreadSpectrumSection';
import { OfdmSection } from './sections/OfdmSection';
import { LinkBudgetSection } from './sections/LinkBudgetSection';
import { RakeSection } from './sections/RakeSection';
import { MimoSection } from './sections/MimoSection';
import './wireless.css';

type Tab = 'fading' | 'ber' | 'spread' | 'ofdm' | 'linkbudget' | 'rake' | 'mimo';

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
          { value: 'linkbudget', label: t('wl.tab.linkbudget') },
          { value: 'rake', label: t('wl.tab.rake') },
          { value: 'mimo', label: t('wl.tab.mimo') },
        ]}
        onChange={(v) => setTab(v as Tab)}
      />
      <div className="wl__grid">
        {tab === 'fading' && <FadingChannelSection />}
        {tab === 'ber' && <RayleighBerSection />}
        {tab === 'spread' && <SpreadSpectrumSection />}
        {tab === 'ofdm' && <OfdmSection />}
        {tab === 'linkbudget' && <LinkBudgetSection />}
        {tab === 'rake' && <RakeSection />}
        {tab === 'mimo' && <MimoSection />}
      </div>
    </div>
  );
}
