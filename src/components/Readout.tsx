export interface ReadoutProps {
  label: string;
  value: string | number;
  unit?: string;
  tone?: 'default' | 'ok' | 'err' | 'warn';
}

export function Readout({ label, value, unit, tone = 'default' }: ReadoutProps) {
  return (
    <div className={`readout readout--${tone}`}>
      <span className="readout__label">{label}</span>
      <span className="readout__value">
        {value}
        {unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}
