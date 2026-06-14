import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildOptRxView, simulateReception } from '@/modules/modulation/model';
import { MinDistancePanel } from '@/modules/modulation/optreceiver-panels';
import { makeRng } from '@/lib/sim/sources';

describe('MinDistancePanel', () => {
  it('renders a labelled canvas for a dim≥3 custom view', () => {
    const view = buildOptRxView({
      signalSetId: 'custom',
      ebN0Db: 8,
      symbolIndex: 0,
      sps: 48,
      cycles: 4,
    });
    expect(view.dim).toBeGreaterThanOrEqual(3);
    const reception = simulateReception(view, 0, makeRng(1));
    render(<MinDistancePanel view={view} reception={reception} />);
    expect(
      screen.getByLabelText(/Distances from the received vector to each candidate/i),
    ).toBeInTheDocument();
  });
});
