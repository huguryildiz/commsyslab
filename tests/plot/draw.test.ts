import { describe, it, expect } from 'vitest';
import {
  beginPlotFrame,
  drawAxes,
  drawLine,
  formatMathLabel,
  getNearestPlotPoint,
  linScale,
} from '@/lib/plot/draw';

type CanvasCall = { name: string; args: unknown[] };

function mockContext() {
  const calls: CanvasCall[] = [];
  const ctx = {
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    beginPath: () => calls.push({ name: 'beginPath', args: [] }),
    moveTo: (...args: unknown[]) => calls.push({ name: 'moveTo', args }),
    lineTo: (...args: unknown[]) => calls.push({ name: 'lineTo', args }),
    stroke: () => calls.push({ name: 'stroke', args: [] }),
    setLineDash: (...args: unknown[]) => calls.push({ name: 'setLineDash', args }),
    fillText: (...args: unknown[]) => calls.push({ name: 'fillText', args }),
    save: () => calls.push({ name: 'save', args: [] }),
    restore: () => calls.push({ name: 'restore', args: [] }),
    translate: (...args: unknown[]) => calls.push({ name: 'translate', args }),
    rotate: (...args: unknown[]) => calls.push({ name: 'rotate', args }),
  } as unknown as CanvasRenderingContext2D;

  return { ctx, calls };
}

describe('linScale', () => {
  it('maps domain endpoints to range endpoints', () => {
    const s = linScale([0, 1], [0, 100]);
    expect(s(0)).toBe(0);
    expect(s(1)).toBe(100);
    expect(s(0.5)).toBe(50);
  });
  it('supports inverted ranges (screen y grows downward)', () => {
    const s = linScale([0, 1], [100, 0]);
    expect(s(0)).toBe(100);
    expect(s(1)).toBe(0);
  });

  it('retains domain and range metadata for shared plot helpers', () => {
    const s = linScale([-1, 1], [160, 20]);
    expect(s.meta).toEqual({ kind: 'linear', domain: [-1, 1], range: [160, 20] });
  });
});

describe('formatMathLabel', () => {
  it('normalizes a compact TeX axis label for canvas drawing', () => {
    expect(formatMathLabel('$|C_n|$')).toBe('|Cₙ|');
    expect(formatMathLabel('$E_b/N_0\\,(dB)$')).toBe('E_b/N₀ (dB)');
  });
});

describe('drawAxes', () => {
  it('draws grid lines, tick labels, and TeX-style axis labels', () => {
    const { ctx, calls } = mockContext();
    const ax = {
      x: linScale([0, 10], [50, 250]),
      y: linScale([-1, 1], [150, 20]),
    };

    drawAxes(ctx, ax, [0, 10], {
      xLabel: '$t\\,(s)$',
      yLabel: '$x(t)$',
      tickCount: 3,
    });

    const labels = calls.filter((c) => c.name === 'fillText').map((c) => c.args[0]);
    expect(labels).toContain('t (s)');
    expect(labels).toContain('x(t)');
    expect(labels).toContain('0');
    expect(calls.filter((c) => c.name === 'lineTo').length).toBeGreaterThan(8);
  });
});

describe('plot point cursor helpers', () => {
  it('records line points and returns the nearest point within the hit radius', () => {
    const { ctx } = mockContext();
    const ax = {
      x: linScale([0, 2], [10, 110]),
      y: linScale([0, 1], [110, 10]),
    };

    beginPlotFrame(ctx);
    drawLine(ctx, ax, [0, 1, 2], [0, 1, 0], '#fff');

    const point = getNearestPlotPoint(ctx, ax.x(1) + 2, ax.y(1) + 1, 6);
    expect(point).toMatchObject({ x: 1, y: 1, px: ax.x(1), py: ax.y(1) });
    expect(getNearestPlotPoint(ctx, ax.x(1) + 20, ax.y(1), 6)).toBeNull();
  });
});
