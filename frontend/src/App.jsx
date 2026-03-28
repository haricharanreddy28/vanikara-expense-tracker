import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import api from './api';

import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import AddExpense from './pages/AddExpense';
import ExpenseList from './pages/ExpenseList';
import PaymentTracking from './pages/PaymentTracking';
import ShareManagement from './pages/ShareManagement';
import Documents from './pages/Documents';
import AuditLog from './pages/AuditLog';
import AdminDashboard from './pages/AdminDashboard';

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  const [needsSetup, setNeedsSetup] = useState(null); // null = loading

  useEffect(() => {
    api.get('/setup/status')
      .then(r => setNeedsSetup(r.data.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  if (needsSetup === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af', fontSize: 16 }}>
        Loading…
      </div>
    );
  }

  if (needsSetup) {
    return <Setup onComplete={() => setNeedsSetup(false)} />;
  }

  return (
    <Routes>
      <Route path="/login"              element={<Login />} />
      <Route path="/"                   element={<Protected><Dashboard /></Protected>} />
      <Route path="/expenses"           element={<Protected><ExpenseList /></Protected>} />
      <Route path="/expenses/add"       element={<Protected><AddExpense /></Protected>} />
      <Route path="/payments"           element={<Protected><PaymentTracking /></Protected>} />
      <Route path="/share-management"   element={<Protected><ShareManagement /></Protected>} />
      <Route path="/documents"          element={<Protected><Documents /></Protected>} />
      <Route path="/audit"              element={<Protected><AuditLog /></Protected>} />
      <Route path="/admin"              element={<Protected><AdminDashboard /></Protected>} />
      <Route path="*"                   element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
