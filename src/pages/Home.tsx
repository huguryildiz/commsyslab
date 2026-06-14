import { t } from '@/i18n';
import { Hero } from './landing/Hero';
import { SignalChain } from './landing/SignalChain';
import { ModuleBento } from './landing/ModuleBento';
import './landing/landing.css';

export function Home() {
  return (
    <div className="landing">
      <Hero />
      <SignalChain />
      <ModuleBento />
      <footer className="landing__footer">
        <span>
          {t('landing.footer.left')}
        </span>
        <span className="landing__footer-meta">
          © 2026 {t('landing.footer.dev')}{' '}
          <a
            className="landing__dev"
            href="https://huguryildiz.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('landing.footer.devName')}
          </a>
        </span>
      </footer>
    </div>
  );
}
