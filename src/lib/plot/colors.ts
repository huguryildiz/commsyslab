/**
 * CommSysLab chart palette — central colors for canvas drawing.
 * CSS "chrome" comes from tokens (tokens.css); but since canvas `fillStyle`/`strokeStyle`
 * cannot read CSS variables, the signal colors are pinned here — values match
 * tokens.css `--color-*` (dark theme). All modules consume from here.
 */
export const CHART = {
  green: '#39ff85', // --color-x : primary / input / ML / quantization
  orange: '#ff8c42', // --color-h : sample / simulation / cursor
  blue: '#7b8cff', // --color-y : analog / theory / constellation point
  pink: '#ff4f9a', // --color-marker : emphasis
  red: '#ff5b6b', // --err : error
  text: '#e2e6f0', // --text : label
  dim: '#7a82a6', // --text-dim : axis / helper line
  bgDeep: '#0a0a16', // dark canvas fill (label background)
} as const;

/** Convert "#rrggbb" color to semi-transparent `rgba(...)` string with alpha. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
