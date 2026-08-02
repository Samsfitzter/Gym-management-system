import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';

// Import Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { MemberProfile } from './pages/MemberProfile';
import { Attendance } from './pages/Attendance';
import { Payments } from './pages/Payments';
import { Renewals } from './pages/Renewals';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { Expenses } from './pages/Expenses';
import { PT } from './pages/PT';

// Standard App Shell Layout for authenticated pages
const AppLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {children}
      </div>
    </div>
  );
};

// Route Redirector if already authenticated
const LoginRoute = ({ children }) => {
  const { token, user } = useAuth();
  if (token && user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <LoginRoute>
            <Login />
          </LoginRoute>
        }
      />

      {/* Protected Layout Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/members"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Members />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/members/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MemberProfile />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Attendance />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Payments />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/renewals"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Renewals />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Expenses />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/PT"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PT />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Notifications />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout>
              <Reports />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SidebarProvider>
          <AppRoutes />
        </SidebarProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
