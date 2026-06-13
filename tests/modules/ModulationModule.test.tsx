import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModulationModule } from '@/modules/modulation/ModulationModule';

describe('ModulationModule', () => {
  it('renders controls and the SER panel', () => {
    render(<ModulationModule />);
    expect(screen.getByLabelText(/Scheme/i)).toBeTruthy();
    expect(screen.getByLabelText(/Symbol-error rate versus Eb\/N0/i)).toBeTruthy();
  });

  it('shows the constellation plane for a 2-D scheme (M-PSK) and a not-drawable notice for M-FSK', () => {
    render(<ModulationModule />);
    const scheme = screen.getByLabelText(/Scheme/i) as HTMLSelectElement;
    fireEvent.change(scheme, { target: { value: 'mpsk' } });
    expect(screen.getByLabelText(/Signal-space constellation/i)).toBeTruthy();
    fireEvent.change(scheme, { target: { value: 'mfsk' } });
    fireEvent.change(screen.getByLabelText(/Order M/i), { target: { value: '4' } });
    expect(screen.getByText(/cannot be drawn in a 2-D plane/i)).toBeTruthy();
  });
});
