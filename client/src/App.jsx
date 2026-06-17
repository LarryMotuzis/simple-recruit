import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Prospects from './pages/Prospects.jsx';
import Board from './pages/Board.jsx';
import ProspectDetail from './pages/ProspectDetail.jsx';
import Portal from './pages/Portal.jsx';
import MyTeam from './pages/MyTeam.jsx';
import AdminUsers from './pages/AdminUsers.jsx';

function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <Prospects />
              </ProtectedLayout>
            }
          />
          <Route
            path="/board"
            element={
              <ProtectedLayout>
                <Board />
              </ProtectedLayout>
            }
          />
          <Route
            path="/prospects/:id"
            element={
              <ProtectedLayout>
                <ProspectDetail />
              </ProtectedLayout>
            }
          />
          <Route
            path="/portal"
            element={
              <ProtectedLayout>
                <Portal />
              </ProtectedLayout>
            }
          />
          <Route
            path="/my-team"
            element={
              <ProtectedLayout>
                <MyTeam />
              </ProtectedLayout>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedLayout>
                <AdminUsers />
              </ProtectedLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
