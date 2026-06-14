import type { ReactNode } from 'react';

export interface SliderProps {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Fixed number of decimals for the displayed value (default: raw value). */
  precision?: number;
  onChange: (v: number) => void;
}

export function Slider({ label, value, min, max, step = 1, unit, precision, onChange }: SliderProps) {
  const display = precision != null ? value.toFixed(precision) : value;
  return (
    <label className="ctl-slider">
      <span className="ctl-slider__row">
        <span>{label}</span>
        <span className="ctl-slider__val">
          {display}
          {unit ? ` ${unit}` : ''}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
