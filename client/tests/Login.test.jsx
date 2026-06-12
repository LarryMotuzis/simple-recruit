import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext.jsx';
import Login from '../src/pages/Login.jsx';

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
  test('renders email and password fields and a sign-in button', () => {
    renderLogin();
    expect(screen.getByText('Simple Recruit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
