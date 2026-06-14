import { useEffect, useRef } from 'react';
import { beginPlotFrame, drawPointCursor, getNearestPlotPoint } from './draw';

export interface CanvasProps {
  /** Draw callback; receives the 2D context and CSS-pixel width/height. */
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  /** Re-run draw whenever any dependency changes. */
  deps?: unknown[];
  height?: number;
  className?: string;
  ariaLabel?: string;
}

export function Canvas({ draw, deps = [], height = 240, className, ariaLabel }: CanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      rafRef.current = null;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      beginPlotFrame(ctx);
      draw(ctx, w, h);
      const pointer = pointerRef.current;
      if (pointer) {
        const point = getNearestPlotPoint(ctx, pointer.x, pointer.y);
        if (point) drawPointCursor(ctx, point);
      }
    };

    const scheduleRender = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(render);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      scheduleRender();
    };

    const handlePointerLeave = () => {
      pointerRef.current = null;
      scheduleRender();
    };

    render();
    const ro = new ResizeObserver(render);
    ro.observe(canvas);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      ro.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, ...deps]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ width: '100%', cursor: 'crosshair' }}
    />
  );
}
