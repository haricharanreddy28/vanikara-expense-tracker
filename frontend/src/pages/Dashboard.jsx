import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const fmt = (n) => `₹${(+n || 0).toFixed(2)}`;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="loading">Loading dashboard…</div>;
  if (!data) return null;

  const { totals, perDirector } = data;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Expense overview for all directors</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Expenses</div>
          <div className="value blue">{totals.total_expenses}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Amount</div>
          <div className="value blue">{fmt(totals.total_amount)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Paid</div>
          <div className="value green">{fmt(totals.total_paid)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Pending</div>
          <div className="value red">{fmt(totals.total_pending)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Per-Director Summary</h2>
          <Link to="/expenses/add" className="btn btn-primary btn-sm">+ Add Expense</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Director</th>
                <th>Default Share</th>
                <th>Total Owed</th>
                <th>Paid</th>
                <th>Pending</th>
              </tr>
            </thead>
            <tbody>
              {perDirector.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="sidebar-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{d.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{d.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-blue">{d.share_percentage}%</span></td>
                  <td style={{ fontWeight: 500 }}>{fmt(d.total_owed)}</td>
                  <td><span style={{ color: '#16a34a', fontWeight: 500 }}>{fmt(d.paid)}</span></td>
                  <td>
                    {d.pending > 0
                      ? <span className="badge badge-red">{fmt(d.pending)}</span>
                      : <span className="badge badge-green">Settled</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        <Link to="/expenses" className="btn btn-outline">View All Expenses →</Link>
        <Link to="/payments" className="btn btn-outline">Manage Payments →</Link>
      </div>
    </div>
  );
}
