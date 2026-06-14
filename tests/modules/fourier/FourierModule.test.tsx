import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FourierModule } from '@/modules/fourier/FourierModule';

describe('FourierModule tabs', () => {
  it('renders 4 tabs and defaults to Signals & Systems', () => {
    render(<FourierModule />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(screen.getByRole('tab', { name: /Signals & Systems/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('switches to the Filters & Bandpass tab', () => {
    render(<FourierModule />);
    fireEvent.click(screen.getByRole('tab', { name: /Filters & Bandpass/i }));
    expect(screen.getByRole('tab', { name: /Filters & Bandpass/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
