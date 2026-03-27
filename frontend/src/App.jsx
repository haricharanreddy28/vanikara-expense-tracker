import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddExpense from './pages/AddExpense';
import ExpenseList from './pages/ExpenseList';
import PaymentTracking from './pages/PaymentTracking';
import ShareManagement from './pages/ShareManagement';
import Documents from './pages/Documents';
import AuditLog from './pages/AuditLog';

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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"                  element={<Protected><Dashboard /></Protected>} />
          <Route path="/expenses"          element={<Protected><ExpenseList /></Protected>} />
          <Route path="/expenses/add"      element={<Protected><AddExpense /></Protected>} />
          <Route path="/payments"          element={<Protected><PaymentTracking /></Protected>} />
          <Route path="/share-management"  element={<Protected><ShareManagement /></Protected>} />
          <Route path="/documents"         element={<Protected><Documents /></Protected>} />
          <Route path="/audit"             element={<Protected><AuditLog /></Protected>} />
          <Route path="*"                  element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
