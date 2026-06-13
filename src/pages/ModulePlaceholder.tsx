import { Panel } from '@/components';
import { t } from '@/i18n';

export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <Panel title={title}>
      <p>{t('common.comingSoon')}</p>
    </Panel>
  );
}
