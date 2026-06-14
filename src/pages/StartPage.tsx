import { t } from '@/i18n';
import { ModuleMenu } from '@/components/ModuleMenu';
import './landing/landing.css';

/** Full-page module launcher reached from the hero CTA. */
export function StartPage() {
  return (
    <section className="startpage">
      <header className="startpage__head">
        <h1 className="startpage__title">{t('start.title')}</h1>
        <p className="startpage__sub">{t('start.subtitle')}</p>
      </header>
      <ModuleMenu variant="page" />
    </section>
  );
}
