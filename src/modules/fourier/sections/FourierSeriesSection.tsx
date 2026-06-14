import { Panel } from '@/components';
import { t } from '@/i18n';
import type { SectionProps } from './types';

export function FourierSeriesSection(_props: SectionProps) {
  return (
    <div className="fourier__section">
      <Panel title={t('fourier.tab.series')}>
        <p className="fourier__hint">Coming up in the next task.</p>
      </Panel>
    </div>
  );
}
