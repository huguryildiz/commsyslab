import { useParams, useNavigate } from 'react-router-dom';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { EntropySection } from './EntropySection';
import { PrefixKraftSection } from './PrefixKraftSection';
import { HuffmanSection } from './HuffmanSection';
import { LempelZivSection } from './LempelZivSection';
import './infotheory.css';

type Tab = 'entropy' | 'prefix' | 'huffman' | 'lz';

const TABS: { value: Tab; label: string }[] = [
  { value: 'entropy', label: t('it.tab.entropy') },
  { value: 'prefix', label: t('it.tab.prefix') },
  { value: 'huffman', label: t('it.tab.huffman') },
  { value: 'lz', label: t('it.tab.lz') },
];

export function InfoTheoryModule() {
  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: Tab = (slug as Tab) || 'entropy';

  const handleTabChange = (v: string) => {
    navigate(v === 'entropy' ? '/information-theory' : `/information-theory/${v}`, {
      replace: true,
    });
  };

  return (
    <div className="it-module">
      <Segmented<Tab>
        ariaLabel={t('it.tab.aria')}
        value={tab}
        options={TABS}
        onChange={handleTabChange}
      />
      {tab === 'entropy' && <EntropySection />}
      {tab === 'prefix' && <PrefixKraftSection />}
      {tab === 'huffman' && <HuffmanSection />}
      {tab === 'lz' && <LempelZivSection />}
    </div>
  );
}
