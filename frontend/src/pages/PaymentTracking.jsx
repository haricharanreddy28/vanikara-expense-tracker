import { useState, useEffect } from 'react';
import api from '../api';

const fmt = (n) => `₹${(+n || 0).toFixed(2)}`;

export default function PaymentTracking() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [filter, setFilter] = useState('all');

  const load = () => api.get('/expenses').then(r => setExpenses(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const markPaid = async (expenseId, userId) => {
    const key = `${expenseId}-${userId}`;
    setUpdating(p => ({ ...p, [key]: true }));
    await api.put(`/payments/${expenseId}/${userId}`);
    await load();
    setUpdating(p => ({ ...p, [key]: false }));
  };

  const markUnpaid = async (expenseId, userId) => {
    const key = `${expenseId}-${userId}`;
    setUpdating(p => ({ ...p, [key]: true }));
    await api.put(`/payments/${expenseId}/${userId}/unpaid`);
    await load();
    setUpdating(p => ({ ...p, [key]: false }));
  };

  const flatRows = expenses.flatMap(e =>
    e.splits.map(s => ({ ...s, expense: e }))
  ).filter(r => {
    if (filter === 'paid')    return r.payment_status === 'Paid';
    if (filter === 'pending') return r.payment_status === 'Pending';
    return true;
  });

  if (loading) return <div className="loading">Loading payments…</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Payment Tracking</h1>
        <p>Track and update payment status per director per expense</p>
      </div>

      <div className="doc-type-tabs" style={{ marginBottom: 16 }}>
        {[['all','All'],['pending','Pending'],['paid','Paid']].map(([v,l]) => (
          <button key={v} className={`tab-btn${filter===v?' active':''}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      <div className="card">
        {flatRows.length === 0 ? (
          <div className="empty-state"><div className="icon">✅</div><p>No payments to show.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Date</th>
                  <th>Director</th>
                  <th>Share</th>
                  <th>Amount Due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {flatRows.map(r => {
                  const key = `${r.expense.id}-${r.user_id}`;
                  return (
                    <tr key={key}>
                      <td>
                        <div style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.expense.reason}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(r.expense.amount)} total</div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.expense.date).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: 500 }}>{r.name}</td>
                      <td><span className="badge badge-blue">{r.percentage}%</span></td>
                      <td><strong>{fmt(r.amount)}</strong></td>
                      <td>
                        {r.payment_status === 'Paid'
                          ? <span className="badge badge-green">Paid</span>
                          : <span className="badge badge-red">Pending</span>}
                      </td>
                      <td>
                        {r.payment_status === 'Pending' ? (
                          <button
                            className="btn btn-success btn-sm"
                            disabled={updating[key]}
                            onClick={() => markPaid(r.expense.id, r.user_id)}>
                            {updating[key] ? '…' : '✓ Mark Paid'}
                          </button>
                        ) : (
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={updating[key]}
                            onClick={() => markUnpaid(r.expense.id, r.user_id)}>
                            {updating[key] ? '…' : '↩ Revert'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
