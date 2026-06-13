import type { SimLoop } from '@/lib/sim/useSimulationLoop';

export interface TransportControlsProps {
  loop: SimLoop;
  speedMin?: number;
  speedMax?: number;
}

export function TransportControls({ loop, speedMin = 0.25, speedMax = 8 }: TransportControlsProps) {
  return (
    <div className="transport">
      <button onClick={loop.toggle}>{loop.running ? '❚❚ Pause' : '▶ Play'}</button>
      <button onClick={loop.step} disabled={loop.running}>
        ⏭ Step
      </button>
      <button onClick={loop.reset}>↺ Reset</button>
      <label className="transport__speed">
        Speed ×{loop.speed}
        <input
          type="range"
          min={speedMin}
          max={speedMax}
          step={0.25}
          value={loop.speed}
          onChange={(e) => loop.setSpeed(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
