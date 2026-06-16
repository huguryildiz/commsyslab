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
      <button onClick={loop.reset} className="btn--reset">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21.5 2v6h-6" />
          <path d="M2.5 22v-6h6" />
          <path d="M22 11.5A10 10 0 0 0 3.2 7.2" />
          <path d="M2 12.5a10 10 0 0 0 18.8 4.2" />
        </svg>
        Reset
      </button>
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
