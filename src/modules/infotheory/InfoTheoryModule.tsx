import { useState } from 'react';
import { t } from '@/i18n';
import { EntropySection } from './EntropySection';
import { PrefixKraftSection } from './PrefixKraftSection';
import { HuffmanSection } from './HuffmanSection';
import { LempelZivSection } from './LempelZivSection';
import { CapacitySection } from './CapacitySection';
import './infotheory.css';

type Tab = 'entropy' | 'prefix' | 'huffman' | 'lz' | 'capacity';

const TABS: { id: Tab; key: string }[] = [
  { id: 'entropy', key: 'it.tab.entropy' },
  { id: 'prefix', key: 'it.tab.prefix' },
  { id: 'huffman', key: 'it.tab.huffman' },
  { id: 'lz', key: 'it.tab.lz' },
  { id: 'capacity', key: 'it.tab.capacity' },
];

export function InfoTheoryModule() {
  const [tab, setTab] = useState<Tab>('entropy');
  return (
    <div className="it-module">
      <nav className="it-tabs">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            className={tab === tb.id ? 'it-tab it-tab--active' : 'it-tab'}
            onClick={() => setTab(tb.id)}
          >
            {t(tb.key)}
          </button>
        ))}
      </nav>
      {tab === 'entropy' && <EntropySection />}
      {tab === 'prefix' && <PrefixKraftSection />}
      {tab === 'huffman' && <HuffmanSection />}
      {tab === 'lz' && <LempelZivSection />}
      {tab === 'capacity' && <CapacitySection />}
    </div>
  );
}
