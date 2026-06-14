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
  /**
   * Enable press-and-drag scrubbing. While the pointer is down inside the plot
   * area, the canvas reports the normalized x position [0, 1] (left→right of the
   * area between `scrubPadding.l` and width − `scrubPadding.r`). Used for the
   * convolution "grab and slide" interaction.
   */
  onScrub?: (xFraction: number) => void;
  /** Horizontal plot-area inset used to map pixels → [0, 1] for `onScrub`. */
  scrubPadding?: { l: number; r: number };
  /**
   * Enable scroll-wheel zoom. Reports the horizontal fraction [0, 1] of the
   * canvas where the wheel event occurred, plus the raw deltaY.
   */
  onWheel?: (xFraction: number, deltaY: number) => void;
  /**
   * Enable pointer-drag panning. Reports the horizontal movement as a fraction
   * of the canvas width (positive = dragged right). Only fires when `onScrub`
   * is not set — scrub takes priority on canvases that need both interactions.
   */
  onPan?: (deltaFraction: number) => void;
}

export function Canvas({
  draw,
  deps = [],
  height = 240,
  className,
  ariaLabel,
  onScrub,
  scrubPadding,
  onWheel,
  onPan,
}: CanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  // Hold latest callbacks in refs so the effect doesn't re-subscribe on every render.
  const onScrubRef = useRef(onScrub);
  onScrubRef.current = onScrub;
  const scrubPadRef = useRef(scrubPadding);
  scrubPadRef.current = scrubPadding;
  const onWheelRef = useRef(onWheel);
  onWheelRef.current = onWheel;
  const onPanRef = useRef(onPan);
  onPanRef.current = onPan;

  const scrubbable = Boolean(onScrub);
  const pannable = Boolean(onPan) && !scrubbable;

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
      const isPanning = Boolean(onPanRef.current) && !onScrubRef.current && event.buttons !== 0;
      if (isPanning) {
        // Hide the data-point cursor tooltip while panning — the chart is moving
        // so the tooltip value would be wrong and visually noisy.
        pointerRef.current = null;
        onPanRef.current!(event.movementX / Math.max(1, rect.width));
      } else {
        pointerRef.current = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
      }
      scheduleRender();
    };

    const handlePointerLeave = () => {
      pointerRef.current = null;
      scheduleRender();
    };

    // Map a pointer x (CSS px) to the normalized [0, 1] position inside the plot
    // area, then forward it to the scrub callback.
    const reportScrub = (clientX: number) => {
      const cb = onScrubRef.current;
      if (!cb) return;
      const rect = canvas.getBoundingClientRect();
      const pad = scrubPadRef.current ?? { l: 0, r: 0 };
      const usable = Math.max(1, rect.width - pad.l - pad.r);
      const frac = (clientX - rect.left - pad.l) / usable;
      cb(Math.min(1, Math.max(0, frac)));
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (onScrubRef.current) {
        canvas.setPointerCapture(event.pointerId);
        reportScrub(event.clientX);
      } else if (onPanRef.current) {
        // Capture so dragging outside the canvas still pans.
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = 'grabbing';
      }
    };

    const handlePointerUp = () => {
      if (onPanRef.current && !onScrubRef.current) {
        canvas.style.cursor = 'grab';
      }
    };

    const handleScrubMove = (event: PointerEvent) => {
      // Only scrub while the pointer is held down (buttons bit set).
      if (!onScrubRef.current || event.buttons === 0) return;
      reportScrub(event.clientX);
    };

    const handleWheel = (event: WheelEvent) => {
      if (!onWheelRef.current) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const frac = (event.clientX - rect.left) / Math.max(1, rect.width);
      onWheelRef.current(frac, event.deltaY);
    };

    render();
    const ro = new ResizeObserver(render);
    ro.observe(canvas);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointermove', handleScrubMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      ro.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointermove', handleScrubMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, ...deps]);

  const cursor = scrubbable ? 'ew-resize' : pannable ? 'grab' : 'crosshair';

  const canvasEl = (
    <canvas
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ width: '100%', display: 'block', cursor, touchAction: scrubbable ? 'none' : undefined }}
    />
  );

  if (!onWheel) return canvasEl;

  const hintText = onPan && !scrubbable ? 'scroll: zoom · drag: pan' : 'scroll to zoom';

  return (
    <div style={{ position: 'relative' }}>
      {canvasEl}
      <span className="zoom-hint" aria-hidden="true">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="4.5" cy="4.5" r="3" stroke="currentColor" strokeWidth="1.2" />
          <line x1="7" y1="7" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="4.5" y1="2.5" x2="4.5" y2="6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="2.5" y1="4.5" x2="6.5" y2="4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
        {hintText}
      </span>
    </div>
  );
}
