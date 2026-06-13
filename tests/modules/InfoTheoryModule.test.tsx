import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoTheoryModule } from '@/modules/infotheory/InfoTheoryModule';

describe('InfoTheoryModule', () => {
  it('renders tabs and shows the entropy section by default', () => {
    render(<InfoTheoryModule />);
    expect(screen.getByRole('button', { name: /Entropy/i })).toBeTruthy();
    expect(screen.getByLabelText(/Binary entropy function/i)).toBeTruthy();
  });

  it('switches to the Lempel-Ziv tab and shows the dictionary', () => {
    render(<InfoTheoryModule />);
    fireEvent.click(screen.getByRole('button', { name: /Lempel-Ziv/i }));
    expect(screen.getByText(/Contents/i)).toBeTruthy();
  });

  it('switches to Channel Capacity and shows a capacity curve', () => {
    render(<InfoTheoryModule />);
    fireEvent.click(screen.getByRole('button', { name: /Channel Capacity/i }));
    expect(screen.getByLabelText(/BSC capacity versus crossover probability/i)).toBeTruthy();
  });
});
