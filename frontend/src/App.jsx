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
  const [needsSetup, setNeedsSetup] = useState(null);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const checkSetup = () => {
    setTimedOut(false);
    setWaitSeconds(0);
    api.get('/setup/status', { timeout: 90000 })
      .then(r => setNeedsSetup(r.data.needsSetup))
      .catch(() => setTimedOut(true));
  };

  useEffect(() => { checkSetup(); }, []);

  useEffect(() => {
    if (needsSetup !== null || timedOut) return;
    const t = setInterval(() => setWaitSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [needsSetup, timedOut]);

  if (timedOut) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:16, color:'#6b7280' }}>
        <div style={{ fontSize:40 }}>⚠️</div>
        <p style={{ fontSize:16 }}>Server took too long to respond.</p>
        <button className="btn btn-primary" onClick={checkSetup}>🔄 Retry</button>
      </div>
    );
  }

  if (needsSetup === null) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:12, color:'#6b7280' }}>
        <div style={{ fontSize:40, animation:'spin 1.5s linear infinite' }}>⏳</div>
        <p style={{ fontSize:16, fontWeight:600, color:'#374151' }}>Starting up server…</p>
        <p style={{ fontSize:13, textAlign:'center', maxWidth:280 }}>
          The free server wakes up after inactivity.<br/>This takes <strong>30–60 seconds</strong> on first load.
        </p>
        <p style={{ fontSize:20, fontWeight:700, color:'#7c3aed' }}>{waitSeconds}s</p>
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
