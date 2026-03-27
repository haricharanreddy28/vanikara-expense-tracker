import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const fmt = (n) => `${(+n || 0).toFixed(1)}%`;

export default function ShareManagement() {
  const { user } = useAuth();
  const [directors, setDirectors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [newShares, setNewShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    const [d, r] = await Promise.all([api.get('/users'), api.get('/share-requests')]);
    setDirectors(d.data);
    setNewShares(d.data.map(dir => ({ userId: dir.id, name: dir.name, percentage: dir.share_percentage })));
    setRequests(r.data);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const total = newShares.reduce((s, x) => s + parseFloat(x.percentage || 0), 0);

  const submitRequest = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (Math.abs(total - 100) > 0.01) return setError(`Shares must total 100% (currently ${total.toFixed(1)}%)`);
    setSubmitting(true);
    try {
      await api.post('/share-requests', {
        newShares: newShares.map(s => ({ userId: s.userId, percentage: parseFloat(s.percentage) }))
      });
      setSuccess('Share change request submitted! Directors have been notified.');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally { setSubmitting(false); }
  };

  const approve = async (id) => {
    setApproving(p => ({ ...p, [id]: true }));
    setError(''); setSuccess('');
    try {
      const r = await api.post(`/share-requests/${id}/approve`);
      setSuccess(r.data.message);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve');
    } finally { setApproving(p => ({ ...p, [id]: false })); }
  };

  const reject = async (id) => {
    setApproving(p => ({ ...p, [id]: true }));
    setError(''); setSuccess('');
    try {
      await api.post(`/share-requests/${id}/reject`);
      setSuccess('Request rejected.');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject');
    } finally { setApproving(p => ({ ...p, [id]: false })); }
  };

  if (loading) return <div className="loading">Loading share data…</div>;

  const hasPending = requests.some(r => r.status === 'pending');

  return (
    <div>
      <div className="page-header"><h1>Share Management</h1><p>View and change director expense shares</p></div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Current shares */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Current Default Shares</h2></div>
        <div className="card-body">
          <div className="share-bars">
            {directors.map(d => (
              <div key={d.id} className="share-bar-item">
                <div className="share-bar-label">{d.name}</div>
                <div className="share-bar-track">
                  <div className="share-bar-fill" style={{ width: `${d.share_percentage}%` }} />
                </div>
                <div className="share-bar-pct">{fmt(d.share_percentage)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Propose change */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Propose Share Change</h2></div>
        <div className="card-body">
          {hasPending && (
            <div className="alert alert-error">⚠️ A pending request already exists. Approve or wait for it to resolve before submitting a new one.</div>
          )}
          <form onSubmit={submitRequest}>
            <div style={{ marginBottom: 16 }}>
              {newShares.map((s, i) => (
                <div key={s.userId} className="form-row" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{s.name}</label>
                    <input className="form-control" value={s.name} disabled />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>New Share %</label>
                    <input className="form-control" type="number" min="0" max="100" step="0.1"
                      value={s.percentage}
                      onChange={e => {
                        const u = [...newShares];
                        u[i] = { ...s, percentage: e.target.value };
                        setNewShares(u);
                      }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                Total: <strong style={{ color: Math.abs(total-100)<0.01 ? '#16a34a' : '#dc2626' }}>{total.toFixed(1)}%</strong>
                {Math.abs(total-100)>0.01 && <span style={{ color: '#dc2626', marginLeft: 8 }}>Must equal 100%</span>}
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting || hasPending}>
              {submitting ? 'Submitting…' : '📨 Submit Change Request'}
            </button>
          </form>
        </div>
      </div>

      {/* Request history */}
      <div className="card">
        <div className="card-header"><h2>Request History</h2></div>
        {requests.length === 0 ? (
          <div className="empty-state"><div className="icon">📭</div><p>No requests yet.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Approvals</th>
                  <th>Changes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => {
                  const alreadyApproved = r.approvals.includes(user?.id);
                  const alreadyRejected = r.rejections.includes(user?.id);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.requested_by_name}</td>
                      <td>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                      <td>
                        {r.status === 'pending'   && <span className="badge badge-yellow">Pending</span>}
                        {r.status === 'approved'  && <span className="badge badge-green">Approved</span>}
                        {r.status === 'rejected'  && <span className="badge badge-red">Rejected</span>}
                      </td>
                      <td>
                        <div className="approval-dots">
                          {[0,1,2].map(i => (
                            <div key={i} className={`dot ${i < r.approvals.length ? 'filled' : 'empty'}`} title={i < r.approvals.length ? 'Approved' : 'Pending'} />
                          ))}
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>{r.approvals.length}/2 needed</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 11, lineHeight: 1.8 }}>
                          {r.new_config.map(nc => {
                            const old = r.old_config.find(o => o.userId === nc.userId);
                            if (!old || old.percentage === nc.percentage) return null;
                            return <div key={nc.userId}>{nc.name}: {old.percentage}% → <strong>{nc.percentage}%</strong></div>;
                          })}
                        </div>
                      </td>
                      <td>
                        {r.status === 'pending' && !alreadyApproved && !alreadyRejected && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-success btn-sm" disabled={approving[r.id]} onClick={() => approve(r.id)}>✓ Approve</button>
                            <button className="btn btn-danger btn-sm" disabled={approving[r.id]} onClick={() => reject(r.id)}>✗ Reject</button>
                          </div>
                        )}
                        {alreadyApproved && <span className="badge badge-green">You approved</span>}
                        {alreadyRejected && <span className="badge badge-red">You rejected</span>}
                        {r.status !== 'pending' && !alreadyApproved && !alreadyRejected && <span className="badge badge-gray">Resolved</span>}
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
