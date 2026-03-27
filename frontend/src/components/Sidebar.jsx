import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/',                icon: '📊', label: 'Dashboard' },
  { to: '/expenses/add',    icon: '➕', label: 'Add Expense' },
  { to: '/expenses',        icon: '📋', label: 'Expenses' },
  { to: '/payments',        icon: '💳', label: 'Payments' },
  { to: '/share-management',icon: '⚖️', label: 'Shares' },
  { to: '/documents',       icon: '📁', label: 'Documents' },
  { to: '/audit',           icon: '🔍', label: 'Audit Log' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h2>💼 ExpenseTrack</h2>
        <p>Director Management System</p>
      </div>

      <nav>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="icon">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.name?.[0] || '?'}</div>
          <div className="sidebar-user-info">
            <strong>{user?.name}</strong>
            <small>{user?.share_percentage}% share</small>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>🚪 Sign Out</button>
      </div>
    </div>
  );
}
