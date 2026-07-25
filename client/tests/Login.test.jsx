import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext.jsx';
import Login from '../src/pages/Login.jsx';

vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    api: {
      ...actual.api,
      refresh: vi.fn().mockRejectedValue(new Error('No active session')),
    },
  };
});

function renderLogin() {
  return render(
    <AuthProvider>
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    </AuthProvider>
  );
}

describe('Login page', () => {
  test('renders email and password fields and a sign-in button', async () => {
    renderLogin();
    expect(screen.getByText('Simple Recruit')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });
});
