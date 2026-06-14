import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeltaModModule } from '@/modules/deltamod/DeltaModModule';

describe('DeltaModModule', () => {
  it('renders controls, panels, and key readouts', () => {
    render(<DeltaModModule />);
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(2); // 2 Canvas panels
    expect(screen.getByText('Step size Δ')).toBeInTheDocument();
    expect(screen.getByText('Slope-overload limit')).toBeInTheDocument();
    // default tone f=2,A=1 with small step overloads -> badge reads "Slope overload"
    expect(screen.getByText('Slope overload')).toBeInTheDocument();
  });
});
