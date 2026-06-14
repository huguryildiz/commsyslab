import { describe, it, expect } from 'vitest';
import { LANDING_MODULES } from '@/pages/landing/modules.config';

describe('LANDING_MODULES', () => {
  it('has all eleven modules numbered 01..11 in chapter order', () => {
    expect(LANDING_MODULES.map((m) => m.num)).toEqual([
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11',
    ]);
  });

  it('orders module ids by book chapter (fourier → end-to-end)', () => {
    expect(LANDING_MODULES.map((m) => m.id)).toEqual([
      'fourier',
      'analog',
      'random-process',
      'sampling',
      'analog-noise',
      'infotheory',
      'modulation',
      'baseband',
      'channel-coding',
      'wireless',
      'end-to-end',
    ]);
  });
});
