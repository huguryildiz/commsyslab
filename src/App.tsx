import { useState } from 'react';
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { t } from '@/i18n';
import { Home } from '@/pages/Home';
import { ModulePlaceholder } from '@/pages/ModulePlaceholder';
import './theme/global.css';
import './components/components.css';
import './pages/pages.css';
import './app.css';

const NAV = [
  { to: '/sampling', key: 'nav.sampling' },
  { to: '/modulation', key: 'nav.modulation' },
  { to: '/baseband', key: 'nav.baseband' },
  { to: '/huffman', key: 'nav.huffman' },
  { to: '/end-to-end', key: 'nav.endToEnd' },
];

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const applyTheme = (next: 'dark' | 'light') => {
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <HashRouter>
      <div className="app">
        <nav className="app__nav">
          <NavLink to="/" className="app__brand">
            {t('app.title')}
          </NavLink>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to}>
              {t(n.key)}
            </NavLink>
          ))}
          <span className="app__spacer" />
          <button onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </nav>
        <main className="app__main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sampling" element={<ModulePlaceholder title={t('nav.sampling')} />} />
            <Route
              path="/modulation"
              element={<ModulePlaceholder title={t('nav.modulation')} />}
            />
            <Route path="/baseband" element={<ModulePlaceholder title={t('nav.baseband')} />} />
            <Route path="/huffman" element={<ModulePlaceholder title={t('nav.huffman')} />} />
            <Route
              path="/end-to-end"
              element={<ModulePlaceholder title={t('nav.endToEnd')} />}
            />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
