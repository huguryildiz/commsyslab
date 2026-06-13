import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BasebandModule } from '@/modules/baseband/BasebandModule';

describe('BasebandModule', () => {
  it('renders the three tabs and shows pulse shaping by default', () => {
    render(<BasebandModule />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Pulse Shaping & Nyquist')).toBeTruthy();
    expect(screen.getByText('Optimum Receiver')).toBeTruthy();
    expect(screen.getByText('Eye, ISI & Equalization')).toBeTruthy();
    expect(screen.getByLabelText(/Pulse p\(t\) with zero crossings/i)).toBeTruthy();
  });
  it('switches to the receiver tab and shows the matched-filter panel', () => {
    render(<BasebandModule />);
    fireEvent.click(screen.getByRole('button', { name: /Optimum Receiver/i }));
    expect(screen.getByLabelText(/Transmit pulse and its matched filter/i)).toBeTruthy();
  });
  it('switches to the eye tab and shows the eye diagram', () => {
    render(<BasebandModule />);
    fireEvent.click(screen.getByRole('button', { name: /Eye, ISI & Equalization/i }));
    expect(screen.getByLabelText(/Eye diagram before equalization/i)).toBeTruthy();
  });
});
