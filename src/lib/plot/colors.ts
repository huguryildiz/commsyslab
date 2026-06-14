/**
 * CommSysLab chart palette — theme-aware colors for canvas drawing.
 *
 * Canvas `fillStyle`/`strokeStyle` cannot read CSS variables, so the signal
 * colors are pinned here. Two palettes are kept: dark (neon traces on a near-
 * black screen) and light (deepened traces on a soft light-blue screen). Values
 * mirror tokens.css `--color-*` per theme. The active palette is resolved live
 * from the document's `data-theme`, so every CHART.* lookup flips when the user
 * toggles the theme — no per-module changes needed.
 */
type Chart = {
  green: string; // --color-x : primary / input / ML / quantization
  orange: string; // --color-h : sample / simulation / cursor
  blue: string; // --color-y : analog / theory / constellation point
  pink: string; // --color-marker : emphasis
  red: string; // --err : error
  text: string; // --text : label
  dim: string; // --text-dim : axis / helper line
  bgDeep: string; // canvas fill (label background)
};

const DARK: Chart = {
  green: '#39ff85',
  orange: '#ff8c42',
  blue: '#7b8cff',
  pink: '#ff4f9a',
  red: '#ff5b6b',
  text: '#e2e6f0',
  dim: '#7a82a6',
  bgDeep: '#0a0a16',
};

const LIGHT: Chart = {
  green: '#0a6428',
  orange: '#c2410c',
  blue: '#2c43c4',
  pink: '#c8186a',
  red: '#cc2b2b',
  text: '#16203f',
  dim: '#4d5470',
  bgDeep: '#f4f6fb', // light canvas/label background — matches --canvas-bg token
};

function isLight(): boolean {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
}

/** Live theme-aware palette: CHART.green etc. resolve against the current theme on every read. */
export const CHART: Chart = new Proxy({} as Chart, {
  get(_target, prop: string | symbol): string {
    const p = isLight() ? LIGHT : DARK;
    return p[prop as keyof Chart];
  },
});

/** Convert "#rrggbb" color to semi-transparent `rgba(...)` string with alpha. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
