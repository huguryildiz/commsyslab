import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { Oscilloscope } from './viz/Oscilloscope';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero__copy">
        <span className="hero__eyebrow">{t('landing.eyebrow')}</span>
        <h1 className="hero__title">
          {t('landing.headline.l1')}
          <br />
          <span className="hero__title-em">{t('landing.headline.l2')}</span>
        </h1>
        <p className="hero__lead">{t('landing.lead')}</p>

        <div className="hero__cta">
          <Link to="/start" className="btn btn--primary">
            ▶ {t('landing.cta.primary')}
          </Link>
          <a href="#lab" className="btn btn--ghost">
            {t('landing.cta.secondary')} →
          </a>
        </div>

        <div className="hero__stats">
          <div className="stat">
            <span className="stat__n">
              3<span className="stat__u"> live</span>
            </span>
            <span className="stat__l">{t('landing.stats.modules')}</span>
          </div>
          <div className="stat">
            <span className="stat__n">
              9<span className="stat__u">+</span>
            </span>
            <span className="stat__l">{t('landing.stats.panels')}</span>
          </div>
          <div className="stat">
            <span className="stat__n">
              0<span className="stat__u"> setup</span>
            </span>
            <span className="stat__l">{t('landing.stats.setup')}</span>
          </div>
        </div>
      </div>

      <div className="hero__scope">
        <Oscilloscope />
        <div className="hero__hud" aria-hidden="true">
          <span className="hud hud--tl">
            <i className="hud__rec" /> {t('landing.scope.live')}
          </span>
          <span className="hud hud--tr">
            f<sub>s</sub> = <b>8.0 kHz</b>
            <br />
            SNR = <b>14 dB</b>
          </span>
          <span className="hud hud--bl">{t('landing.scope.caption')}</span>
          <span className="hud hud--br">
            SQNR <b>49.9 dB</b>
          </span>
        </div>
      </div>
    </section>
  );
}
