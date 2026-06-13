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
