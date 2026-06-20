import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeltaModSection } from '@/modules/sampling-quantization/sections/waveform/DeltaModSection';

describe('DeltaModSection', () => {
  it('renders the DM staircase + error plots and info cards', () => {
    render(<DeltaModSection />);
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Slope-overload limit')).toBeInTheDocument();
    expect(screen.getByText('Delta modulation')).toBeInTheDocument(); // info card
  });
  it('offers an Adaptive DM mode showing step-size tracking', () => {
    render(<DeltaModSection />);
    fireEvent.click(screen.getByRole('tab', { name: 'Adaptive DM' }));
    expect(screen.getByText('Step size over time')).toBeInTheDocument();
    expect(screen.getByText('Adaptive step')).toBeInTheDocument(); // info card
  });
});
