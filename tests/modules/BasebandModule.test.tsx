import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BasebandModule } from '@/modules/baseband/BasebandModule';

// The module reads its active tab from the URL (useParams/useNavigate), so it must be
// rendered inside a router with the same routes registered in App.tsx.
function renderModule() {
  return render(
    <MemoryRouter initialEntries={['/baseband']}>
      <Routes>
        <Route path="/baseband" element={<BasebandModule />} />
        <Route path="/baseband/:tab" element={<BasebandModule />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BasebandModule', () => {
  it('renders the tabs as a segmented control and shows pulse shaping by default', () => {
    renderModule();
    // Tabs render as role="tab" via the shared <Segmented> control.
    expect(screen.getAllByRole('tab').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('tab', { name: 'Pulse Shaping & Nyquist' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Optimum Receiver' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Eye, ISI & Equalization' })).toBeTruthy();
    expect(screen.getByLabelText(/Pulse p\(t\) with zero crossings/i)).toBeTruthy();
  });
  it('switches to the receiver tab and shows the matched-filter panel', () => {
    renderModule();
    fireEvent.click(screen.getByRole('tab', { name: /Optimum Receiver/i }));
    expect(screen.getByLabelText(/Transmit pulse and its matched filter/i)).toBeTruthy();
  });
  it('switches to the eye tab and shows the eye diagram', () => {
    renderModule();
    fireEvent.click(screen.getByRole('tab', { name: /Eye, ISI & Equalization/i }));
    expect(screen.getByLabelText(/Eye diagram before equalization/i)).toBeTruthy();
  });
  it('switches to the Partial Response tab and shows the PR pulse panel', () => {
    renderModule();
    fireEvent.click(screen.getByRole('tab', { name: /Partial Response/i }));
    expect(screen.getByLabelText(/Partial-response pulse compared to a full-response raised cosine/i)).toBeTruthy();
  });
  it('switches to the PR Detection tab and shows the BER panel', () => {
    renderModule();
    fireEvent.click(screen.getByRole('tab', { name: /PR Detection/i }));
    expect(
      screen.getByLabelText(/Bit-error rate: zero-ISI, symbol-by-symbol, and ML sequence detection/i),
    ).toBeTruthy();
  });
  it('switches to the Power Spectrum tab and shows the S_v(f) panel', () => {
    renderModule();
    fireEvent.click(screen.getByRole('tab', { name: /Power Spectrum/i }));
    expect(
      screen.getByLabelText(/Power spectrum S_v\(f\): continuous part and discrete spectral lines/i),
    ).toBeTruthy();
  });
  it('switches to the Channel Distortion tab and shows the distorted-pulse panel', () => {
    renderModule();
    fireEvent.click(screen.getByRole('tab', { name: /Channel Distortion/i }));
    expect(
      screen.getByLabelText(/Clean raised-cosine pulse versus the channel-distorted pulse/i),
    ).toBeTruthy();
  });
});
