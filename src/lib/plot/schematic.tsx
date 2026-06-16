/* eslint-disable react-refresh/only-export-components */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import katex from 'katex';

/**
 * Responsive SVG wrapper. Children draw in the given `width`×`height` coordinate
 * space. When `zoomable` (default), scroll-wheel zooms toward the pointer and a
 * pointer drag pans — implemented by mutating the SVG `viewBox` (1.0× fit down to
 * 4× zoom-in). A "scroll: zoom · drag: pan" badge mirrors the `<Canvas>` plots.
 */
export function Schematic({
  width,
  height,
  children,
  ariaLabel,
  zoomable = true,
}: {
  width: number;
  height: number;
  children: ReactNode;
  ariaLabel?: string;
  zoomable?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, w: width, h: height });
  // Mirror committed view so the pointerdown handler can read the live origin.
  const viewRef = useRef(view);
  viewRef.current = view;
  const dragRef = useRef<{ px: number; py: number; vx: number; vy: number } | null>(null);

  // Reset to the fitted view whenever the base dimensions change (e.g. switching
  // to a differently-sized schematic).
  useEffect(() => {
    setView({ x: 0, y: 0, w: width, h: height });
  }, [width, height]);

  // Wire wheel/pointer listeners imperatively so `wheel` is non-passive and
  // preventDefault can stop the page from scrolling while zooming.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !zoomable) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / Math.max(1, rect.width);
      const fy = (e.clientY - rect.top) / Math.max(1, rect.height);
      setView((v) => {
        const px = v.x + fx * v.w; // pointer in viewBox coords (held fixed)
        const py = v.y + fy * v.h;
        const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1; // scroll down → zoom out
        const nw = Math.max(width / 4, Math.min(width, v.w * factor));
        const f = nw / v.w;
        const nh = v.h * f; // aspect ratio preserved
        return { x: px - fx * nw, y: py - fy * nh, w: nw, h: nh };
      });
    };

    const handlePointerDown = (e: PointerEvent) => {
      const v = viewRef.current;
      svg.setPointerCapture(e.pointerId);
      dragRef.current = { px: e.clientX, py: e.clientY, vx: v.x, vy: v.y };
    };
    const handlePointerMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const rect = svg.getBoundingClientRect();
      setView((v) => {
        const dx = ((e.clientX - d.px) / Math.max(1, rect.width)) * v.w;
        const dy = ((e.clientY - d.py) / Math.max(1, rect.height)) * v.h;
        return { ...v, x: d.vx - dx, y: d.vy - dy };
      });
    };
    const handlePointerUp = (e: PointerEvent) => {
      dragRef.current = null;
      try {
        svg.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    svg.addEventListener('pointerdown', handlePointerDown);
    svg.addEventListener('pointermove', handlePointerMove);
    svg.addEventListener('pointerup', handlePointerUp);
    svg.addEventListener('pointerleave', handlePointerUp);
    return () => {
      svg.removeEventListener('wheel', handleWheel);
      svg.removeEventListener('pointerdown', handlePointerDown);
      svg.removeEventListener('pointermove', handlePointerMove);
      svg.removeEventListener('pointerup', handlePointerUp);
      svg.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [zoomable, width, height]);

  const svg = (
    <svg
      ref={svgRef}
      className="schematic"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
      style={zoomable ? { cursor: 'grab' } : undefined}
    >
      {children}
    </svg>
  );

  if (!zoomable) return svg;

  return (
    <div style={{ position: 'relative' }}>
      {svg}
      <span className="zoom-hint" aria-hidden="true">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="4.5" cy="4.5" r="3" stroke="currentColor" strokeWidth="1.2" />
          <line x1="7" y1="7" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="4.5" y1="2.5" x2="4.5" y2="6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="2.5" y1="4.5" x2="6.5" y2="4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
        scroll: zoom · drag: pan
      </span>
    </div>
  );
}

/** Wire as a polyline through points [x,y,x,y,…]. */
export function Wire({
  points,
  active = false,
  color,
}: {
  points: number[];
  active?: boolean;
  /** Override the active glow colour (defaults to the green --accent). */
  color?: string;
}) {
  const d = points.reduce(
    (acc, v, i) => acc + (i % 2 === 0 ? (i === 0 ? 'M' : 'L') + v : ' ' + v + ' '),
    '',
  );
  const style =
    active && color ? { stroke: color, filter: `drop-shadow(0 0 4px ${color})` } : undefined;
  return (
    <path
      className={active ? 'schematic__wire schematic__active' : 'schematic__wire'}
      style={style}
      d={d}
    />
  );
}

/** Labeled rounded-rect block. Pass `tex` to render the label with KaTeX instead of plain text. */
export function Block({
  x,
  y,
  w,
  h,
  label,
  tex,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tex?: string;
}) {
  // Auto-fit the KaTeX label: measure its natural width and scale it down when it
  // would overflow the block, so long labels (e.g. "Demod", "Freq. synth") stay
  // inside the box instead of being clipped. Short labels keep full size.
  const fitRef = useRef<HTMLDivElement>(null);
  const [texScale, setTexScale] = useState(1);
  useLayoutEffect(() => {
    if (!tex) return;
    let cancelled = false;
    const measure = () => {
      const box = fitRef.current;
      const content = box?.firstElementChild as HTMLElement | null;
      if (!box || !content || cancelled) return;
      const avail = box.clientWidth - 4; // ~2px padding each side (user units)
      const natural = content.offsetWidth; // unscaled — transforms don't affect layout size
      const next = natural > avail && avail > 0 ? avail / natural : 1;
      setTexScale((prev) => (Math.abs(prev - next) > 0.01 ? next : prev));
    };
    measure();
    // Re-measure once KaTeX fonts finish loading (first paint can mis-measure).
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(measure);
    }
    return () => {
      cancelled = true;
    };
  }, [tex, w, h]);
  return (
    <g>
      <rect className="schematic__fill" x={x} y={y} width={w} height={h} rx={3} />
      {tex ? (
        <foreignObject x={x} y={y} width={w} height={h}>
          <div
            ref={fitRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                color: 'var(--text)',
                transform: `scale(${texScale})`,
                transformOrigin: 'center',
              }}
              dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { throwOnError: false }) }}
            />
          </div>
        </foreignObject>
      ) : (
        <text
          className="schematic__label"
          style={{ fontSize: '10px' }}
          x={x + w / 2}
          y={y + h / 2}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {label}
        </text>
      )}
    </g>
  );
}

/** Connection dot. */
export function Node({ x, y }: { x: number; y: number }) {
  return <circle className="schematic__node" cx={x} cy={y} r={1.8} />;
}

/** Free text label. */
export function Label({
  x,
  y,
  text,
  anchor = 'middle',
}: {
  x: number;
  y: number;
  text: string;
  anchor?: 'start' | 'middle' | 'end';
}) {
  return (
    <text className="schematic__label" x={x} y={y} textAnchor={anchor} dominantBaseline="middle">
      {text}
    </text>
  );
}

/** KaTeX math label embedded via foreignObject. `w` is the reserved horizontal space. */
export function MathLabel({
  x,
  y,
  tex,
  anchor = 'middle',
  w = 50,
}: {
  x: number;
  y: number;
  tex: string;
  anchor?: 'start' | 'middle' | 'end';
  w?: number;
}) {
  const html = katex.renderToString(tex, { throwOnError: false });
  const H = 20;
  const foX = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return (
    <foreignObject x={foX} y={y - H / 2} width={w} height={H}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: anchor === 'middle' ? 'center' : anchor === 'end' ? 'flex-end' : 'flex-start',
          fontSize: '10px',
          lineHeight: 1,
          color: 'var(--text)',
          pointerEvents: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </foreignObject>
  );
}

/**
 * Diode pointing along +x by default; rotate via `rot` (deg). When `active` the
 * triangle fills with the accent color (conducting).
 */
export function Diode({
  x,
  y,
  rot = 0,
  s = 1,
  active = false,
}: {
  x: number;
  y: number;
  rot?: number;
  s?: number;
  active?: boolean;
}) {
  const cls = active ? 'schematic__symbol schematic__active' : 'schematic__symbol';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <polygon className={cls} points="-5,-5 5,0 -5,5" />
      <line className="schematic__symbol" x1={5} y1={-5} x2={5} y2={5} />
    </g>
  );
}

/** Resistor (IEC box) centred at (x,y). `rot=90` makes it vertical. */
export function Resistor({ x, y, len = 18, rot = 0 }: { x: number; y: number; len?: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect className="schematic__symbol" x={-len / 2} y={-4} width={len} height={8} />
    </g>
  );
}

/** Capacitor (two plates) centred at (x,y); size via `s`. */
export function Capacitor({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g className="schematic__symbol" transform={`translate(${x} ${y}) scale(${s})`}>
      <line x1={-6} y1={-3} x2={6} y2={-3} />
      <line x1={-6} y1={3} x2={6} y2={3} />
    </g>
  );
}

/** Transformer (two coils + core) centred at (x,y). */
export function Transformer({ x, y }: { x: number; y: number }) {
  const coil = (cx: number) => (
    <path
      className="schematic__symbol"
      d={`M${cx} ${y - 12} a3 3 0 0 1 0 6 a3 3 0 0 1 0 6 a3 3 0 0 1 0 6 a3 3 0 0 1 0 6`}
    />
  );
  return (
    <g>
      {coil(x - 6)}
      {coil(x + 6)}
      <line className="schematic__symbol" x1={x} y1={y - 12} x2={x} y2={y + 12} />
    </g>
  );
}

/** Ground symbol at (x,y); size via `s`. */
export function Ground({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g className="schematic__symbol" transform={`translate(${x} ${y}) scale(${s})`}>
      <line x1={0} y1={0} x2={0} y2={4} />
      <line x1={-6} y1={4} x2={6} y2={4} />
      <line x1={-3} y1={7} x2={3} y2={7} />
    </g>
  );
}

/** Mixer / multiplier: circle with ⊗. */
export function Mixer({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return (
    <g className="schematic__symbol">
      <circle cx={x} cy={y} r={r} />
      <line x1={x - r * 0.7} y1={y - r * 0.7} x2={x + r * 0.7} y2={y + r * 0.7} />
      <line x1={x - r * 0.7} y1={y + r * 0.7} x2={x + r * 0.7} y2={y - r * 0.7} />
    </g>
  );
}

/** Sinusoidal source / oscillator: circle with a sine-wave inside. */
export function Oscillator({ x, y, r = 10 }: { x: number; y: number; r?: number }) {
  const hw = r * 0.6;
  const ah = r * 0.45;
  // Two cubic-bezier segments forming an S-curve (half-period sine approximation)
  const p = `M${x - hw} ${y} C${x - hw} ${y - ah} ${x} ${y - ah} ${x} ${y} S${x + hw} ${y + ah} ${x + hw} ${y}`;
  return (
    <g className="schematic__symbol">
      <circle cx={x} cy={y} r={r} />
      <path d={p} fill="none" />
    </g>
  );
}

/** Summing junction: circle with the given sign, e.g. "+", "Σ", "−". */
export function Summer({ x, y, sign = '+', r = 7 }: { x: number; y: number; sign?: string; r?: number }) {
  return (
    <g>
      <circle className="schematic__symbol" cx={x} cy={y} r={r} />
      <text className="schematic__label" x={x} y={y} textAnchor="middle" dominantBaseline="middle">
        {sign}
      </text>
    </g>
  );
}

/** Small filled arrowhead pointing along +x by default; rotate via `rot` (deg), size via `s`. */
export function Arrowhead({
  x,
  y,
  rot = 0,
  s = 1,
  active = false,
}: {
  x: number;
  y: number;
  rot?: number;
  s?: number;
  active?: boolean;
}) {
  const cls = active ? 'schematic__arrow schematic__active' : 'schematic__arrow';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <polygon className={cls} points="-4,-3 2,0 -4,3" />
    </g>
  );
}

/** Glowing signal packet flowing along a wire path (drives the animation-first diagrams). */
export function FlowPacket({
  x,
  y,
  color = 'var(--color-marker)',
  r = 3.2,
}: {
  x: number;
  y: number;
  color?: string;
  r?: number;
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      style={{ fill: color, stroke: 'none', filter: `drop-shadow(0 0 5px ${color})` }}
    />
  );
}

/** Point at fractional length `u` ∈ [0,1] along a polyline of [x,y] vertices. */
export function pointAlong(pts: [number, number][], u: number): [number, number] {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d);
    total += d;
  }
  let target = Math.max(0, Math.min(1, u)) * total;
  for (let i = 1; i < pts.length; i++) {
    if (target <= seg[i - 1] || i === pts.length - 1) {
      const f = seg[i - 1] > 0 ? target / seg[i - 1] : 0;
      return [
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f,
      ];
    }
    target -= seg[i - 1];
  }
  return pts[pts.length - 1];
}
