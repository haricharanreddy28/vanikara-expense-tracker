import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const fmt = (n) => `₹${(+n || 0).toFixed(2)}`;

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    api.get('/expenses').then(r => setExpenses(r.data)).finally(() => setLoading(false));
  }, []);

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (loading) return <div className="loading">Loading expenses…</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Expense List</h1>
          <p>{expenses.length} expense{expenses.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link to="/expenses/add" className="btn btn-primary">+ Add Expense</Link>
      </div>

      <div className="card">
        {expenses.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>No expenses yet. <Link to="/expenses/add">Add the first one →</Link></p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Amount</th>
                  <th>Added By</th>
                  <th>Split</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => {
                  const allPaid = e.splits.every(s => s.payment_status === 'Paid');
                  const somePaid = e.splits.some(s => s.payment_status === 'Paid');
                  return [
                    <tr key={e.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                      <td><div style={{ fontWeight: 500 }}>{e.reason}</div></td>
                      <td><strong>{fmt(e.amount)}</strong></td>
                      <td>{e.added_by_name}</td>
                      <td>
                        <span className={`badge ${e.is_custom_split ? 'badge-yellow' : 'badge-blue'}`}>
                          {e.is_custom_split ? 'Custom' : 'Default'}
                        </span>
                      </td>
                      <td>
                        {allPaid
                          ? <span className="badge badge-green">Fully Paid</span>
                          : somePaid
                          ? <span className="badge badge-yellow">Partial</span>
                          : <span className="badge badge-red">Pending</span>}
                      </td>
                      <td>
                        <button className="expand-btn" onClick={() => toggle(e.id)}>
                          {expanded[e.id] ? '▲ Hide' : '▼ Splits'}
                        </button>
                      </td>
                    </tr>,
                    expanded[e.id] && (
                      <tr key={`${e.id}-exp`} className="expanded-row">
                        <td colSpan={7}>
                          <div className="expanded-content">
                            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase' }}>Split Breakdown</div>
                            <div className="split-chips">
                              {e.splits.map(s => (
                                <div key={s.user_id} className="split-chip">
                                  <span className="name">{s.name}</span>
                                  <span className="pct">({s.percentage}%)</span>
                                  <span className="amt">{fmt(s.amount)}</span>
                                  <span className={`badge ${s.payment_status === 'Paid' ? 'badge-green' : 'badge-red'}`}>
                                    {s.payment_status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
