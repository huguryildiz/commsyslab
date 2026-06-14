import type { useSimulationLoop } from '@/lib/sim/useSimulationLoop';

/** Props every Signals & Spectra section receives from the module shell. */
export interface SectionProps {
  /** Shared animation clock in seconds. */
  clock: number;
  /** Shared transport loop (start/stop/reset) for <TransportControls>. */
  loop: ReturnType<typeof useSimulationLoop>;
}
