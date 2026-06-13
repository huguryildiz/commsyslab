import { t } from '@/i18n';
import { LANDING_MODULES } from './modules.config';
import { ModuleTile } from './ModuleTile';

export function ModuleBento() {
  return (
    <section className="lab" id="lab">
      <div className="lab__head">
        <span className="lab__kicker">{t('landing.section.kicker')}</span>
        <span className="lab__rule" />
      </div>
      <div className="bento">
        {LANDING_MODULES.map((m) => (
          <ModuleTile key={m.id} m={m} />
        ))}
      </div>
    </section>
  );
}
