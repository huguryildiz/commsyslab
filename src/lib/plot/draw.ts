export type ScaleKind = 'linear' | 'log';

export interface ScaleMeta {
  kind: ScaleKind;
  domain: [number, number];
  range: [number, number];
}

export type Scale = ((v: number) => number) & { meta?: ScaleMeta };

export interface PlotBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface PlotPoint {
  x: number;
  y: number;
  px: number;
  py: number;
  color: string;
  bounds?: PlotBounds;
}

interface PlotFrame {
  points: PlotPoint[];
}

const plotFrames = new WeakMap<CanvasRenderingContext2D, PlotFrame>();

// Plot chrome is theme-aware: light traces/labels on a dark screen (dark mode),
// dark traces/labels on a light-blue screen (light mode). Resolved live from
// the document's `data-theme` so plots follow the theme toggle.
const isLightTheme = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
const pickColor = (dark: string, light: string): string => (isLightTheme() ? light : dark);

const DEFAULT_AXIS = (): string => pickColor('rgba(154,167,180,0.55)', 'rgba(40,70,130,0.42)');
const DEFAULT_GRID = (): string => pickColor('rgba(122,130,166,0.16)', 'rgba(40,70,130,0.12)');
const DEFAULT_TICK = (): string => pickColor('rgba(154,167,180,0.78)', 'rgba(54,64,96,0.72)');
const DEFAULT_LABEL = (): string => pickColor('rgba(226,230,240,0.84)', 'rgba(22,32,63,0.9)');

const SUBSCRIPT: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  i: 'ᵢ',
  j: 'ⱼ',
  k: 'ₖ',
  m: 'ₘ',
  n: 'ₙ',
};

/** Prepare a canvas context for one plot frame so draw helpers can register cursor points. */
export function beginPlotFrame(ctx: CanvasRenderingContext2D): void {
  plotFrames.set(ctx, { points: [] });
}

/** Return the nearest registered data point to a CSS-pixel cursor position. */
export function getNearestPlotPoint(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  radius = 14,
): PlotPoint | null {
  const frame = plotFrames.get(ctx);
  if (!frame) return null;
  let best: PlotPoint | null = null;
  let bestD2 = radius * radius;
  for (const p of frame.points) {
    const dx = p.px - px;
    const dy = p.py - py;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) {
      best = p;
      bestD2 = d2;
    }
  }
  return best;
}

function withMeta(kind: ScaleKind, domain: [number, number], range: [number, number], fn: Scale) {
  fn.meta = { kind, domain: [...domain], range: [...range] };
  return fn;
}

/** Linear scale mapping a domain interval to a range interval. */
export function linScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const m = (r1 - r0) / (d1 - d0);
  return withMeta('linear', domain, range, ((v: number) => r0 + (v - d0) * m) as Scale);
}

export interface Axes {
  x: Scale;
  y: Scale;
}

/** Clear the canvas. */
export function clear(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
}

export interface DrawAxesOptions {
  color?: string;
  gridColor?: string;
  tickColor?: string;
  labelColor?: string;
  domainY?: [number, number];
  xTicks?: number[];
  yTicks?: number[];
  tickCount?: number;
  grid?: boolean;
  ticks?: boolean;
  tickLabels?: boolean;
  xLabel?: string;
  yLabel?: string;
}

function finitePair(pair?: [number, number]): pair is [number, number] {
  return !!pair && Number.isFinite(pair[0]) && Number.isFinite(pair[1]) && pair[0] !== pair[1];
}

function minMax(pair: [number, number]): [number, number] {
  return pair[0] <= pair[1] ? pair : [pair[1], pair[0]];
}

function includes(domain: [number, number], value: number): boolean {
  const [lo, hi] = minMax(domain);
  return value >= lo && value <= hi;
}

function plotBounds(ax: Axes): PlotBounds | undefined {
  const xr = ax.x.meta?.range;
  const yr = ax.y.meta?.range;
  if (!finitePair(xr) || !finitePair(yr)) return undefined;
  const [left, right] = minMax(xr);
  const [top, bottom] = minMax(yr);
  return { left, right, top, bottom };
}

function niceNumber(value: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * 10 ** exponent;
}

function linearTicks(domain: [number, number], count: number): number[] {
  const [lo, hi] = minMax(domain);
  const span = hi - lo;
  if (!Number.isFinite(span) || span <= 0) return [];
  const step = niceNumber(span / Math.max(1, count - 1), true);
  const start = Math.ceil(lo / step) * step;
  const end = Math.floor(hi / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step * 1e-9; v += step) {
    ticks.push(Math.abs(v) < step * 1e-10 ? 0 : Number(v.toPrecision(12)));
  }
  return ticks;
}

function logTicks(domain: [number, number]): number[] {
  const [lo, hi] = minMax(domain);
  if (lo <= 0 || hi <= 0) return linearTicks(domain, 5);
  const start = Math.ceil(Math.log10(lo));
  const end = Math.floor(Math.log10(hi));
  const ticks: number[] = [];
  for (let e = start; e <= end; e++) ticks.push(10 ** e);
  if (ticks.length === 0) return [lo, hi];
  return ticks;
}

function ticksFor(domain: [number, number], kind: ScaleKind | undefined, count = 5): number[] {
  return kind === 'log' ? logTicks(domain) : linearTicks(domain, count);
}

function formatTick(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Math.abs(value) < 1e-12) return '0';
  const abs = Math.abs(value);
  if (abs >= 10000 || abs < 0.001) return value.toExponential(0).replace('+', '');
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return Number(value.toFixed(1)).toString();
  if (abs >= 1) return Number(value.toFixed(2)).toString();
  return Number(value.toFixed(3)).toString();
}

function toSubscript(value: string): string {
  return Array.from(value)
    .map((ch) => SUBSCRIPT[ch] ?? `_${ch}`)
    .join('');
}

/** Normalize a compact TeX-ish label into text Canvas can render legibly. */
export function formatMathLabel(label: string): string {
  return label
    .trim()
    .replace(/^\$(.*)\$$/, '$1')
    .replace(/\\mathrm\{([^}]*)\}/g, '$1')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\\lvert|\\rvert|\\vert/g, '|')
    .replace(/\(\^\\circ\)/g, '°')
    .replace(/\^\\circ/g, '°')
    .replace(/\\circ/g, '°')
    .replace(/\\angle/g, '∠')
    .replace(/\\theta/g, 'θ')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\pi/g, 'π')
    .replace(/\\tau/g, 'τ')
    .replace(/\\mu/g, 'µ')
    .replace(/\\Omega/g, 'Ω')
    .replace(/\\omega/g, 'ω')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\phi/g, 'φ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\delta/g, 'δ')
    .replace(/\\rho/g, 'ρ')
    .replace(/\\,/g, ' ')
    .replace(/\\;/g, ' ')
    .replace(/\\quad/g, ' ')
    .replace(/_\{([^}]*)\}/g, (_, sub: string) => toSubscript(sub))
    .replace(/_([0-9ijkmn+\-=()])/g, (_, sub: string) => toSubscript(sub))
    .replace(/\s+/g, ' ')
    .trim();
}

function drawAxisLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  rotated = false,
): void {
  ctx.save();
  ctx.fillStyle = DEFAULT_TICK();
  ctx.font = '12px var(--mono)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (rotated) {
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(formatMathLabel(text), 0, 0);
  } else {
    ctx.fillText(formatMathLabel(text), x, y);
  }
  ctx.restore();
}

function drawTickLabels(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  bounds: PlotBounds,
  xTicks: number[],
  yTicks: number[],
): void {
  ctx.fillStyle = DEFAULT_TICK();
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  for (const x of xTicks) {
    const px = ax.x(x);
    if (px < bounds.left - 0.5 || px > bounds.right + 0.5) continue;
    ctx.fillText(formatTick(x), px, bounds.bottom + 5);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const y of yTicks) {
    const py = ax.y(y);
    if (py < bounds.top - 0.5 || py > bounds.bottom + 0.5) continue;
    ctx.fillText(formatTick(y), bounds.left - 5, py);
  }
}

/** Draw x/y axes, grid, tick marks, tick labels, and optional TeX-style axis labels. */
export function drawAxes(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  domainX: [number, number],
  colorOrOptions: string | DrawAxesOptions = DEFAULT_AXIS(),
): void {
  const options: DrawAxesOptions =
    typeof colorOrOptions === 'string' ? { color: colorOrOptions } : colorOrOptions;
  const bounds = plotBounds(ax);
  const xDomain = finitePair(ax.x.meta?.domain) ? ax.x.meta.domain : domainX;
  const yDomain = finitePair(options.domainY)
    ? options.domainY
    : finitePair(ax.y.meta?.domain)
      ? ax.y.meta.domain
      : undefined;
  const xTicks = options.xTicks ?? ticksFor(xDomain, ax.x.meta?.kind, options.tickCount);
  const yTicks = yDomain ? (options.yTicks ?? ticksFor(yDomain, ax.y.meta?.kind, options.tickCount)) : [];
  const grid = options.grid ?? true;
  const ticks = options.ticks ?? true;
  const labels = options.tickLabels ?? Boolean(options.xLabel || options.yLabel);

  if (bounds && grid) {
    ctx.strokeStyle = options.gridColor ?? DEFAULT_GRID();
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    for (const x of xTicks) {
      const px = ax.x(x);
      if (px < bounds.left - 0.5 || px > bounds.right + 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(px, bounds.top);
      ctx.lineTo(px, bounds.bottom);
      ctx.stroke();
    }
    for (const y of yTicks) {
      const py = ax.y(y);
      if (py < bounds.top - 0.5 || py > bounds.bottom + 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(bounds.left, py);
      ctx.lineTo(bounds.right, py);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = options.color ?? DEFAULT_AXIS();
  ctx.lineWidth = 1;
  const y0 = yDomain && includes(yDomain, 0) ? ax.y(0) : bounds?.bottom ?? ax.y(0);
  ctx.beginPath();
  ctx.moveTo(ax.x(domainX[0]), y0);
  ctx.lineTo(ax.x(domainX[1]), y0);
  ctx.stroke();

  if (!bounds) return;

  const x0 = includes(xDomain, 0) ? ax.x(0) : bounds.left;
  ctx.beginPath();
  ctx.moveTo(x0, bounds.top);
  ctx.lineTo(x0, bounds.bottom);
  ctx.stroke();

  if (ticks) {
    ctx.strokeStyle = options.tickColor ?? DEFAULT_TICK();
    ctx.lineWidth = 1;
    const tickSize = 4;
    for (const x of xTicks) {
      const px = ax.x(x);
      if (px < bounds.left - 0.5 || px > bounds.right + 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(px, bounds.bottom);
      ctx.lineTo(px, bounds.bottom + tickSize);
      ctx.stroke();
    }
    for (const y of yTicks) {
      const py = ax.y(y);
      if (py < bounds.top - 0.5 || py > bounds.bottom + 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(bounds.left, py);
      ctx.lineTo(bounds.left - tickSize, py);
      ctx.stroke();
    }
  }

  if (labels) {
    ctx.fillStyle = options.labelColor ?? DEFAULT_TICK();
    drawTickLabels(ctx, ax, bounds, xTicks, yTicks);
  }

  if (options.xLabel) {
    drawAxisLabel(ctx, options.xLabel, (bounds.left + bounds.right) / 2, bounds.bottom + 30);
  }
  if (options.yLabel) {
    drawAxisLabel(ctx, options.yLabel, bounds.left - 34, (bounds.top + bounds.bottom) / 2, true);
  }
}

function recordPlotPoints(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xs: number[],
  ys: number[],
  color: string,
): void {
  const frame = plotFrames.get(ctx);
  if (!frame) return;
  const bounds = plotBounds(ax);
  const n = Math.min(xs.length, ys.length);
  const stride = Math.max(1, Math.floor(n / 1200));
  for (let i = 0; i < n; i += stride) {
    const x = xs[i];
    const y = ys[i];
    const px = ax.x(x);
    const py = ax.y(y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(px) || !Number.isFinite(py)) {
      continue;
    }
    frame.points.push({ x, y, px, py, color, bounds });
  }
}

/** Draw a crosshair and coordinate badge for an interactive data cursor. */
export function drawPointCursor(ctx: CanvasRenderingContext2D, point: PlotPoint): void {
  const bounds = point.bounds;
  const color = pickColor('rgba(255,140,66,0.9)', 'rgba(194,65,12,0.95)');
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  if (bounds) {
    ctx.moveTo(point.px, bounds.top);
    ctx.lineTo(point.px, bounds.bottom);
    ctx.moveTo(bounds.left, point.py);
    ctx.lineTo(bounds.right, point.py);
  } else {
    ctx.moveTo(point.px, point.py - 12);
    ctx.lineTo(point.px, point.py + 12);
    ctx.moveTo(point.px - 12, point.py);
    ctx.lineTo(point.px + 12, point.py);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = point.color || color;
  ctx.beginPath();
  ctx.arc(point.px, point.py, 4, 0, Math.PI * 2);
  ctx.fill();

  const label = `x=${formatTick(point.x)}, y=${formatTick(point.y)}`;
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  const metrics = ctx.measureText(label);
  const pad = 6;
  const bw = metrics.width + pad * 2;
  const bh = 22;
  const maxRight = bounds?.right ?? Number.POSITIVE_INFINITY;
  const minLeft = bounds?.left ?? 0;
  const minTop = bounds?.top ?? 0;
  let bx = point.px + 10;
  let by = point.py - bh - 10;
  if (bx + bw > maxRight) bx = point.px - bw - 10;
  if (bx < minLeft) bx = minLeft + 2;
  if (by < minTop) by = point.py + 10;
  ctx.fillStyle = pickColor('rgba(10,10,22,0.9)', 'rgba(255,255,255,0.94)');
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = pickColor('rgba(255,140,66,0.45)', 'rgba(194,65,12,0.5)');
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = DEFAULT_LABEL();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + pad, by + bh / 2);
  ctx.restore();
}

/** Draw a polyline through (xs[i], ys[i]). */
export function drawLine(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xs: number[],
  ys: number[],
  color: string,
  width = 2,
  dashed = false,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dashed ? [5, 4] : []);
  ctx.beginPath();
  for (let i = 0; i < xs.length; i++) {
    const px = ax.x(xs[i]);
    const py = ax.y(ys[i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  recordPlotPoints(ctx, ax, xs, ys, color);
}

/** Draw stems (vertical lines from y=0) with dot heads — for sampled signals. */
export function drawStems(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xs: number[],
  ys: number[],
  color: string,
  radius = 3,
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  const y0 = ax.y(0);
  for (let i = 0; i < xs.length; i++) {
    const px = ax.x(xs[i]);
    const py = ax.y(ys[i]);
    ctx.beginPath();
    ctx.moveTo(px, y0);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  recordPlotPoints(ctx, ax, xs, ys, color);
}

/** Draw a scatter of points. */
export function drawScatter(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xs: number[],
  ys: number[],
  color: string,
  radius = 2,
): void {
  ctx.fillStyle = color;
  for (let i = 0; i < xs.length; i++) {
    ctx.beginPath();
    ctx.arc(ax.x(xs[i]), ax.y(ys[i]), radius, 0, Math.PI * 2);
    ctx.fill();
  }
  recordPlotPoints(ctx, ax, xs, ys, color);
}

/** Fill a rectangular data region (e.g. spectral overlap). */
export function shadeRegion(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  fill: string,
): void {
  const px = ax.x(x0);
  const py = ax.y(y1);
  ctx.fillStyle = fill;
  ctx.fillRect(px, py, ax.x(x1) - px, ax.y(y0) - py);
}

/** Draw a sample-and-hold staircase through (xs[i], ys[i]). */
export function drawStep(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xs: number[],
  ys: number[],
  color: string,
  width = 2,
): void {
  if (xs.length === 0) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(ax.x(xs[0]), ax.y(ys[0]));
  for (let i = 1; i < xs.length; i++) {
    ctx.lineTo(ax.x(xs[i]), ax.y(ys[i - 1])); // hold previous level
    ctx.lineTo(ax.x(xs[i]), ax.y(ys[i])); // step to new level
  }
  ctx.stroke();
  recordPlotPoints(ctx, ax, xs, ys, color);
}

/** Draw a vertical line at data-x spanning data-y [y0, y1]. */
export function drawVLine(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xData: number,
  y0: number,
  y1: number,
  color: string,
  dashed = false,
  width = 1,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dashed ? [4, 4] : []);
  const px = ax.x(xData);
  ctx.beginPath();
  ctx.moveTo(px, ax.y(y0));
  ctx.lineTo(px, ax.y(y1));
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Logarithmic (base-10) scale. Inputs <= 0 clamp to the domain floor. */
export function logScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const l0 = Math.log10(d0);
  const l1 = Math.log10(d1);
  const m = (r1 - r0) / (l1 - l0);
  return withMeta('log', domain, range, ((v: number) => {
    const lv = v <= d0 ? l0 : Math.log10(v);
    return r0 + (lv - l0) * m;
  }) as Scale);
}

/** M evenly-spaced translucent hues for decision-region fills. */
export function regionColors(M: number, alpha = 0.16): string[] {
  const out: string[] = [];
  for (let i = 0; i < M; i++) {
    const hue = Math.round((360 * i) / M);
    out.push(`hsla(${hue}, 70%, 55%, ${alpha})`);
  }
  return out;
}

/** Draw an arrow from (x0,y0) to (x1,y1) in data coordinates. */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  width = 1.5,
): void {
  const px0 = ax.x(x0);
  const py0 = ax.y(y0);
  const px1 = ax.x(x1);
  const py1 = ax.y(y1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(px0, py0);
  ctx.lineTo(px1, py1);
  ctx.stroke();
  const ang = Math.atan2(py1 - py0, px1 - px0);
  const head = 7;
  ctx.beginPath();
  ctx.moveTo(px1, py1);
  ctx.lineTo(px1 - head * Math.cos(ang - Math.PI / 6), py1 - head * Math.sin(ang - Math.PI / 6));
  ctx.lineTo(px1 - head * Math.cos(ang + Math.PI / 6), py1 - head * Math.sin(ang + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

/** Draw a text label anchored at a data point (pixel offsets in CSS px). */
export function drawText(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xData: number,
  yData: number,
  text: string,
  color: string,
  dx = 6,
  dy = -6,
  font = '11px system-ui, sans-serif',
): void {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, ax.x(xData) + dx, ax.y(yData) + dy);
}

/**
 * Shade decision regions by classifying a coarse data-space grid.
 * `classify(x, y)` returns a symbol index; `colors[index]` fills that cell.
 */
export function drawRegions(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  domainX: [number, number],
  domainY: [number, number],
  classify: (x: number, y: number) => number,
  colors: string[],
  n = 80,
): void {
  const [x0, x1] = domainX;
  const [y0, y1] = domainY;
  const dx = (x1 - x0) / n;
  const dy = (y1 - y0) / n;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const cx = x0 + (i + 0.5) * dx;
      const cy = y0 + (j + 0.5) * dy;
      const idx = classify(cx, cy);
      const left = ax.x(x0 + i * dx);
      const right = ax.x(x0 + (i + 1) * dx);
      const top = ax.y(y0 + (j + 1) * dy);
      const bottom = ax.y(y0 + j * dy);
      ctx.fillStyle = colors[idx] ?? 'transparent';
      ctx.fillRect(left, top, right - left + 1, bottom - top + 1);
    }
  }
}

/**
 * Draw a bandwidth annotation on a magnitude-spectrum plot: a shaded
 * frequency span [fLo, fHi] with a centered "W = …" label. Proakis §2.7.
 */
export function drawBandwidthSpan(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  fLo: number,
  fHi: number,
  label: string,
): void {
  const x0 = ax.x(fLo);
  const x1 = ax.x(fHi);
  ctx.save();
  ctx.fillStyle = 'rgba(124,131,253,0.12)'; // accent-blue, low alpha
  ctx.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), ctx.canvas.height);
  ctx.strokeStyle = 'rgba(124,131,253,0.6)';
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(x0, 0);
  ctx.lineTo(x0, ctx.canvas.height);
  ctx.moveTo(x1, 0);
  ctx.lineTo(x1, ctx.canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(230,232,255,0.9)';
  ctx.font = '12px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, (x0 + x1) / 2, 14);
  ctx.restore();
}
