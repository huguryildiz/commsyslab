export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

export function Slider({ label, value, min, max, step = 1, unit, onChange }: SliderProps) {
  return (
    <label className="ctl-slider">
      <span className="ctl-slider__row">
        <span>{label}</span>
        <span className="ctl-slider__val">
          {value}
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
