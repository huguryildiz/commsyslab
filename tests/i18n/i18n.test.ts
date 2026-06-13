import { describe, it, expect } from 'vitest';
import { t } from '@/i18n';

describe('t()', () => {
  it('returns the English string for a known key', () => {
    expect(t('app.title')).toBe('DigiCommLab');
  });

  it('falls back to the key itself when missing', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });
});
