/**
 * Instrument screen palette. Fixed regardless of page theme (dark/light):
 * dark screen + bright neon trace like a real oscilloscope. Colors match
 * signal meanings in tokens.css (input/sample/system/channel).
 */
export const VIZ = {
  screen: '#04050f', // --scope-bg
  trail: 'rgba(4, 5, 15, 0.22)', // phosphor persistence
  green: '#39ff85', // input / trace      (--color-x)
  blue: '#7b8cff', // samples             (--color-y)
  orange: '#ff8c42', // system / S&H      (--color-h)
  pink: '#ff4f9a', // channel / noise     (--color-marker)
  grid: 'rgba(57, 255, 133, 0.07)',
  gridStrong: 'rgba(57, 255, 133, 0.14)',
  axis: 'rgba(123, 140, 255, 0.18)',
  dim: 'rgba(122, 130, 166, 0.4)',
} as const;

/** Standard normal sample via Box-Muller (for noise spread). */
export function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
