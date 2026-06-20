import { useParams, useNavigate } from 'react-router-dom';
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
import { PnCodesSection } from './sections/PnCodesSection';
import './wireless.css';

type Tab =
  | 'fading'
  | 'doppler'
  | 'ber'
  | 'spread'
  | 'fhss'
  | 'cdma'
  | 'ofdm'
  | 'linkbudget'
  | 'rake'
  | 'mimo'
  | 'cpm'
  | 'pn';

export function WirelessModule() {
  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: Tab = (slug as Tab) || 'fading';

  const handleTabChange = (v: string) => {
    navigate(v === 'fading' ? '/wireless' : `/wireless/${v}`, { replace: true });
  };

  return (
    <div className="wl">
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
          { value: 'pn', label: t('wl.tab.pn') },
        ]}
        onChange={handleTabChange}
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
        {tab === 'pn' && <PnCodesSection />}
      </div>
    </div>
  );
}
