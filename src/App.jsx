import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { AcceptInvite } from './pages/auth/AcceptInvite';
import { CreateCircle } from './pages/onboarding/CreateCircle';
import { Dashboard } from './pages/dashboard/Dashboard';
import { InviteMembers } from './pages/admin/InviteMembers';
import { ActivityLog } from './pages/logs/ActivityLog';
import { PatientDashboard } from './pages/patient/PatientDashboard';

function AppRoutes() {
  const { userDoc } = useAuth();
  const userId = userDoc?.id || null;

  return (
    <ThemeProvider userId={userId}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/invite/:circleId/:code" element={<AcceptInvite />} />

        {/* Onboarding (authenticated, no circle yet) */}
        <Route
          path="/onboarding/create-circle"
          element={
            <ProtectedRoute requireCircle={false}>
              <CreateCircle />
            </ProtectedRoute>
          }
        />

        {/* Protected app routes */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={userDoc?.role === 'patient' ? <Navigate to="/patient" replace /> : <Dashboard />}
          />
          <Route path="/patient" element={<PatientDashboard />} />
          <Route path="/logs" element={<ActivityLog />} />
          <Route path="/admin/invite" element={<InviteMembers />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
