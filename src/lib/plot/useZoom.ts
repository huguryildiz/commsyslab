import { useState, useRef, useCallback } from 'react';

interface ZoomOptions {
  minSpan?: number;
  maxSpan?: number;
  clampMin?: number;
  clampMax?: number;
}

/**
 * Scroll-wheel zoom and drag-pan for a 1-D axis range [lo, hi].
 *
 * Returns `[lo, hi, handleWheel, reset, handlePan]`.
 * - Pass `handleWheel` to `Canvas.onWheel` for scroll zoom.
 * - Pass `handlePan` to `Canvas.onPan` for drag panning.
 */
export function useZoom(
  initialLo: number,
  initialHi: number,
  opts: ZoomOptions = {},
): [number, number, (xFrac: number, deltaY: number) => void, () => void, (deltaFrac: number) => void] {
  const {
    minSpan = 0.5,
    maxSpan = Math.abs(initialHi - initialLo) * 4,
    clampMin = -Infinity,
    clampMax = +Infinity,
  } = opts;

  const [lo, setLo] = useState(initialLo);
  const [hi, setHi] = useState(initialHi);

  // Refs keep handlers stable across renders without re-subscribing listeners
  const loRef = useRef(lo);
  const hiRef = useRef(hi);
  loRef.current = lo;
  hiRef.current = hi;

  const handleWheel = useCallback((xFrac: number, deltaY: number) => {
    const scale = Math.exp(deltaY * 0.001);
    const cur0 = loRef.current;
    const cur1 = hiRef.current;
    const center = cur0 + xFrac * (cur1 - cur0);
    let newLo = center - (center - cur0) * scale;
    let newHi = center + (cur1 - center) * scale;
    const span = newHi - newLo;
    if (span < minSpan) {
      const mid = (newLo + newHi) / 2;
      newLo = mid - minSpan / 2;
      newHi = mid + minSpan / 2;
    } else if (span > maxSpan) {
      const mid = (newLo + newHi) / 2;
      newLo = mid - maxSpan / 2;
      newHi = mid + maxSpan / 2;
    }
    setLo(Math.max(clampMin, newLo));
    setHi(Math.min(clampMax, newHi));
  }, [minSpan, maxSpan, clampMin, clampMax]);

  const reset = useCallback(() => {
    setLo(initialLo);
    setHi(initialHi);
  }, [initialLo, initialHi]);

  // Drag right → view shifts left (drag right to reveal content to the left).
  const handlePan = useCallback((deltaFrac: number) => {
    const cur0 = loRef.current;
    const cur1 = hiRef.current;
    const span = cur1 - cur0;
    const shift = -deltaFrac * span;
    let newLo = cur0 + shift;
    let newHi = cur1 + shift;
    if (newLo < clampMin) { newLo = clampMin; newHi = clampMin + span; }
    if (newHi > clampMax) { newHi = clampMax; newLo = clampMax - span; }
    setLo(newLo);
    setHi(newHi);
  }, [clampMin, clampMax]);

  return [lo, hi, handleWheel, reset, handlePan];
}
