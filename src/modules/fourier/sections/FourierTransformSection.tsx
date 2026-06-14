import { Panel } from '@/components';
import { t } from '@/i18n';
import type { SectionProps } from './types';

export function FourierTransformSection(_props: SectionProps) {
  return (
    <div className="fourier__section">
      <Panel title={t('fourier.tab.transform')}>
        <p className="fourier__hint">Coming up in the next task.</p>
      </Panel>
    </div>
  );
}
