import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../src/api/client.js', () => ({
  api: {
    createProspect: vi.fn(),
  },
}));

import { api } from '../src/api/client.js';
import ProspectForm from '../src/components/ProspectForm.jsx';

function renderForm() {
  const onCreated = vi.fn();
  const onError = vi.fn();
  render(<ProspectForm onCreated={onCreated} onError={onError} />);
  return { onCreated, onError };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProspectForm', () => {
  test('reports a blank name without creating a prospect', () => {
    const { onError } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: /save prospect/i }));

    expect(onError).toHaveBeenCalledWith('Name is required');
    expect(api.createProspect).not.toHaveBeenCalled();
  });

  test('trims a valid name and passes the API prospect to onCreated', async () => {
    const prospect = { id: 'prospect-1', fullName: 'Taylor Jordan' };
    api.createProspect.mockResolvedValueOnce({ prospect });
    const { onCreated } = renderForm();

    fireEvent.change(screen.getByPlaceholderText('Full name'), {
      target: { value: '  Taylor Jordan  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save prospect/i }));

    await waitFor(() => expect(api.createProspect).toHaveBeenCalledTimes(1));
    expect(api.createProspect).toHaveBeenCalledWith(expect.objectContaining({
      fullName: 'Taylor Jordan',
      prospectType: 'high_school',
      inPortal: false,
    }));
    expect(onCreated).toHaveBeenCalledWith(prospect);
  });

  test('only sends inPortal as true for transfer prospects', async () => {
    api.createProspect
      .mockResolvedValueOnce({ prospect: { id: 'high-school' } })
      .mockResolvedValueOnce({ prospect: { id: 'transfer' } });
    const { unmount } = render(<ProspectForm onCreated={vi.fn()} onError={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'High School Player' } });
    fireEvent.click(screen.getByRole('button', { name: /save prospect/i }));
    await waitFor(() => expect(api.createProspect).toHaveBeenCalledTimes(1));
    expect(api.createProspect.mock.calls[0][0]).toMatchObject({
      prospectType: 'high_school',
      inPortal: false,
    });

    unmount();
    render(<ProspectForm onCreated={vi.fn()} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^transfer$/i }));
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'Transfer Player' } });
    fireEvent.click(screen.getByLabelText(/in transfer portal/i));
    fireEvent.click(screen.getByRole('button', { name: /save prospect/i }));

    await waitFor(() => expect(api.createProspect).toHaveBeenCalledTimes(2));
    expect(api.createProspect.mock.calls[1][0]).toMatchObject({
      prospectType: 'transfer',
      inPortal: true,
    });
  });
});
