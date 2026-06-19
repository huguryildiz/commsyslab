import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScalarQuantSection } from '@/modules/sampling-quantization/sections/quantization/ScalarQuantSection';

describe('ScalarQuantSection', () => {
  it('renders the quantizer + error plots, SQNR readout, and info cards', () => {
    render(<ScalarQuantSection />);
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(2); // Quant + Error
    expect(screen.getByText('SQNR (theory)')).toBeInTheDocument();
    expect(screen.getByText('Uniform quantization')).toBeInTheDocument(); // info card
  });
});
