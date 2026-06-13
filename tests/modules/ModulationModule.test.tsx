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

  it('defaults to the detection view and switches to the optimum receiver', () => {
    render(<ModulationModule />);
    // both tabs exist
    const optrxTab = screen.getByRole('tab', { name: 'Optimum receiver' });
    expect(screen.getByRole('tab', { name: 'Constellation & detection' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // switch tabs → optimum-receiver-only readout appears
    fireEvent.click(optrxTab);
    expect(optrxTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Peak SNR 2E/N₀')).toBeInTheDocument();
    expect(screen.getByText('Live Pₑ (Monte Carlo)')).toBeInTheDocument();
  });

  it('on the optimum-receiver tab, selecting QPSK shows the constellation-landing decision panel', () => {
    render(<ModulationModule />);
    fireEvent.click(screen.getByRole('tab', { name: 'Optimum receiver' }));
    const setSelect = screen.getByLabelText('Signal set') as HTMLSelectElement;
    fireEvent.change(setSelect, { target: { value: 'qpsk' } });
    expect(
      screen.getByLabelText('Constellation with decision regions and the received point'),
    ).toBeInTheDocument();
    // the carrier-cycles control appears for non-1-D schemes
    expect(screen.getByLabelText(/Carrier cycles/i)).toBeInTheDocument();
  });

  it('on the optimum-receiver tab, selecting Custom shows the editor and the dim≥3 min-distance panel', () => {
    render(<ModulationModule />);
    fireEvent.click(screen.getByRole('tab', { name: 'Optimum receiver' }));
    const setSelect = screen.getByLabelText('Signal set') as HTMLSelectElement;
    fireEvent.change(setSelect, { target: { value: 'custom' } });
    // editor grid present (Example 7.1.1 → 4×3 cells)
    expect(screen.getByLabelText('Signal 1 segment 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Signal 4 segment 3')).toBeInTheDocument();
    // default preset has dim 3 → MinDistancePanel renders
    expect(
      screen.getByLabelText(/Distances from the received vector to each candidate/i),
    ).toBeInTheDocument();
    // carrier-cycles control is hidden for custom (basis comes from Gram-Schmidt)
    expect(screen.queryByLabelText(/Carrier cycles/i)).not.toBeInTheDocument();
  });
});
