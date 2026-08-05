import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext.jsx';
import ProspectDetail from '../src/pages/ProspectDetail.jsx';

vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    api: {
      ...actual.api,
      refresh: vi.fn().mockRejectedValue(new Error('No active session')),
      getProspect: vi.fn().mockResolvedValue({
        prospect: {
          id: 'prospect-1',
          full_name: 'Taylor Jordan',
          stage: 'evaluating',
          in_portal: false,
          notes: null,
        },
      }),
      listEvaluations: vi.fn().mockResolvedValue({ evaluations: [] }),
      listStatEntries: vi.fn().mockRejectedValue(new Error('Route not found')),
    },
  };
});

import { api } from '../src/api/client.js';

function renderDetail() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/prospects/prospect-1']}>
        <Routes>
          <Route path="/prospects/:id" element={<ProspectDetail />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('ProspectDetail page', () => {
  test('a failed box-score fetch shows a scoped error without hiding the rest of the page', async () => {
    renderDetail();

    expect(await screen.findByText('Taylor Jordan')).toBeInTheDocument();
    expect(await screen.findByText('Route not found')).toBeInTheDocument();
    expect(screen.getByText('Rating trend')).toBeInTheDocument();
    expect(screen.getByText('Evaluation history')).toBeInTheDocument();
    expect(api.getProspect).toHaveBeenCalledWith('prospect-1');
  });
});
