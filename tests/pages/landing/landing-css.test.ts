import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const landingCss = readFileSync('src/pages/landing/landing.css', 'utf8');

describe('landing module tile CSS', () => {
  it('places the random-process noise animation below the open-module link', () => {
    const compactVizRule = /\.tile__viz--fourier,\s*\.tile__viz--amfm,\s*\.tile__viz--noise\s*\{[^}]*bottom:\s*0;[^}]*height:\s*56%;/s;

    expect(landingCss).toMatch(compactVizRule);
  });
});
