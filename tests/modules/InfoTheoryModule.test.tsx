import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InfoTheoryModule } from '@/modules/infotheory/InfoTheoryModule';

// The module reads its active tab from the URL (useParams/useNavigate), so it must be
// rendered inside a router with the same routes registered in App.tsx.
function renderModule() {
  return render(
    <MemoryRouter initialEntries={['/information-theory']}>
      <Routes>
        <Route path="/information-theory" element={<InfoTheoryModule />} />
        <Route path="/information-theory/:tab" element={<InfoTheoryModule />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InfoTheoryModule', () => {
  it('renders tabs and shows the entropy section by default', () => {
    renderModule();
    // Tabs render via the shared <Segmented> control (role="tab"), not plain buttons.
    expect(screen.getByRole('tab', { name: /Entropy/i })).toBeTruthy();
    expect(screen.getByLabelText(/Binary entropy function/i)).toBeTruthy();
  });

  it('switches to the Lempel-Ziv tab and shows the dictionary', () => {
    renderModule();
    fireEvent.click(screen.getByRole('tab', { name: /Lempel-Ziv/i }));
    expect(screen.getByText(/Contents/i)).toBeTruthy();
  });
});
