import { Link } from 'react-router-dom';
import { t } from '@/i18n';

const MODULES = [
  { path: '/sampling', key: 'nav.sampling', chapter: 'CH7' },
  { path: '/modulation', key: 'nav.modulation', chapter: 'CH9' },
  { path: '/baseband', key: 'nav.baseband', chapter: 'CH8' },
  { path: '/huffman', key: 'nav.huffman', chapter: 'CH10' },
  { path: '/end-to-end', key: 'nav.endToEnd', chapter: 'All' },
] as const;

export function Home() {
  return (
    <div className="home">
      <h1>{t('app.title')}</h1>
      <p className="home__subtitle">{t('app.subtitle')}</p>
      <div className="home__grid">
        {MODULES.map((m) => (
          <Link key={m.path} to={m.path} className="home__card">
            <span className="home__chapter">{m.chapter}</span>
            <span className="home__cardtitle">{t(m.key)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
