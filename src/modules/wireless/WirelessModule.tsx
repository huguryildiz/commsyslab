import { useState } from 'react';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { FadingChannelSection } from './sections/FadingChannelSection';
import { DopplerSection } from './sections/DopplerSection';
import { RayleighBerSection } from './sections/RayleighBerSection';
import { SpreadSpectrumSection } from './sections/SpreadSpectrumSection';
import { FhssSection } from './sections/FhssSection';
import { CdmaSection } from './sections/CdmaSection';
import { OfdmSection } from './sections/OfdmSection';
import { LinkBudgetSection } from './sections/LinkBudgetSection';
import { RakeSection } from './sections/RakeSection';
import { MimoSection } from './sections/MimoSection';
import { CpmSection } from './sections/CpmSection';
import './wireless.css';

type Tab = 'fading' | 'doppler' | 'ber' | 'spread' | 'fhss' | 'cdma' | 'ofdm' | 'linkbudget' | 'rake' | 'mimo' | 'cpm';

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
          { value: 'doppler', label: t('wl.tab.doppler') },
          { value: 'ber', label: t('wl.tab.ber') },
          { value: 'spread', label: t('wl.tab.spread') },
          { value: 'fhss', label: t('wl.tab.fhss') },
          { value: 'cdma', label: t('wl.tab.cdma') },
          { value: 'ofdm', label: t('wl.tab.ofdm') },
          { value: 'linkbudget', label: t('wl.tab.linkbudget') },
          { value: 'rake', label: t('wl.tab.rake') },
          { value: 'mimo', label: t('wl.tab.mimo') },
          { value: 'cpm', label: t('wl.tab.cpm') },
        ]}
        onChange={(v) => setTab(v as Tab)}
      />
      <div className="wl__grid">
        {tab === 'fading' && <FadingChannelSection />}
        {tab === 'doppler' && <DopplerSection />}
        {tab === 'ber' && <RayleighBerSection />}
        {tab === 'spread' && <SpreadSpectrumSection />}
        {tab === 'fhss' && <FhssSection />}
        {tab === 'cdma' && <CdmaSection />}
        {tab === 'ofdm' && <OfdmSection />}
        {tab === 'linkbudget' && <LinkBudgetSection />}
        {tab === 'rake' && <RakeSection />}
        {tab === 'mimo' && <MimoSection />}
        {tab === 'cpm' && <CpmSection />}
      </div>
    </div>
  );
}
