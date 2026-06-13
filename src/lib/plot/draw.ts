export type Scale = (v: number) => number;

/** Linear scale mapping a domain interval to a range interval. */
export function linScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const m = (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * m;
}

export interface Axes {
  x: Scale;
  y: Scale;
}

/** Clear the canvas. */
export function clear(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
}

/** Draw x/y axes with a baseline at data y=0 if in range. */
export function drawAxes(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  domainX: [number, number],
  color = 'rgba(154,167,180,0.5)',
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const y0 = ax.y(0);
  ctx.beginPath();
  ctx.moveTo(ax.x(domainX[0]), y0);
  ctx.lineTo(ax.x(domainX[1]), y0);
  ctx.stroke();
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
  return (v: number) => {
    const lv = v <= d0 ? l0 : Math.log10(v);
    return r0 + (lv - l0) * m;
  };
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
