import { useParams, useNavigate } from 'react-router-dom';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { AmNoiseTab } from './sections/AmNoiseTab';
import { AngleNoiseTab } from './sections/AngleNoiseTab';
import { ComparisonSection } from './sections/ComparisonSection';
import { LinkBudgetTab } from './sections/LinkBudgetTab';
import './analog-noise.css';

type Tab = 'am' | 'angle' | 'compare' | 'link';

export function AnalogNoiseModule() {
  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: Tab = (['am', 'angle', 'compare', 'link'].includes(slug) ? slug : 'am') as Tab;

  const onTab = (v: Tab) =>
    navigate(v === 'am' ? '/analog-noise' : `/analog-noise/${v}`, { replace: true });

  return (
    <div className="an">
      <div className="an__tabbar">
        <Segmented<Tab>
          ariaLabel={t('an.tab.ariaLabel')}
          value={tab}
          options={[
            { value: 'am', label: t('an.tab.am') },
            { value: 'angle', label: t('an.tab.angle') },
            { value: 'compare', label: t('an.tab.compare') },
            { value: 'link', label: t('an.tab.link') },
          ]}
          onChange={onTab}
        />
      </div>
      {tab === 'am' && <AmNoiseTab />}
      {tab === 'angle' && <AngleNoiseTab />}
      {tab === 'compare' && <ComparisonSection />}
      {tab === 'link' && <LinkBudgetTab />}
    </div>
  );
}
