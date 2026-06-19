import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RandomProcessModule } from '@/modules/random-process/RandomProcessModule';

// The module reads its active tab from the URL (useParams/useNavigate), so it must be
// rendered inside a router with the same routes registered in App.tsx.
function renderModule() {
  return render(
    <MemoryRouter initialEntries={['/random-process']}>
      <Routes>
        <Route path="/random-process" element={<RandomProcessModule />} />
        <Route path="/random-process/:tab" element={<RandomProcessModule />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RandomProcessModule (Chapter 5)', () => {
  it('renders the three Chapter-5 tabs and defaults to Probability & RVs', () => {
    renderModule();
    expect(screen.getByRole('tab', { name: 'Probability & RVs' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Random Processes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Gaussian & White' })).toBeInTheDocument();
  });

  it('switches to the Gaussian & White tab', () => {
    renderModule();
    fireEvent.click(screen.getByRole('tab', { name: 'Gaussian & White' }));
    expect(screen.getByRole('tab', { name: 'Gaussian & White' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // §5.3 sub-tabs appear
    expect(screen.getByRole('tab', { name: 'White noise' })).toBeInTheDocument();
  });
});
