import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const [directors, setDirectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ userId: null, password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isAdmin, setIsAdmin] = useState(false);

  const load = async () => {
    const [usersRes, meRes] = await Promise.all([api.get('/users'), api.get('/users/me')]);
    setDirectors(usersRes.data);
    setIsAdmin(!!meRes.data.is_admin);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (d) => {
    setEditingId(d.id);
    setEditForm({ name: d.name, email: d.email, share_percentage: d.share_percentage });
    setMessage({ type: '', text: '' });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  };

  const saveProfile = async (id) => {
    setSaving(true);
    try {
      await api.put(`/users/${id}`, editForm);
      showMsg('success', 'Profile updated successfully');
      setEditingId(null);
      await load();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Update failed');
    } finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (passwordForm.password !== passwordForm.confirm)
      return showMsg('error', 'Passwords do not match');
    if (passwordForm.password.length < 6)
      return showMsg('error', 'Password must be at least 6 characters');
    setSaving(true);
    try {
      await api.put(`/users/${passwordForm.userId}/password`, { password: passwordForm.password });
      showMsg('success', 'Password changed successfully');
      setPasswordForm({ userId: null, password: '', confirm: '' });
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to change password');
    } finally { setSaving(false); }
  };

  const toggleAdmin = async (id) => {
    try {
      const res = await api.put(`/users/${id}/toggle-admin`);
      showMsg('success', res.data.message);
      await load();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to toggle admin');
    }
  };

  if (loading) return <div className="loading">Loading admin panel…</div>;

  if (!isAdmin) {
    return (
      <div>
        <div className="page-header"><h1>Admin Dashboard</h1></div>
        <div className="card">
          <div className="empty-state">
            <div className="icon">🔒</div>
            <p>You don't have admin access. Contact the admin director.</p>
          </div>
        </div>
      </div>
    );
  }

  const shareTotal = directors.reduce((s, d) => s + d.share_percentage, 0);

  return (
    <div>
      <div className="page-header">
        <h1>⚙️ Admin Dashboard</h1>
        <p>Manage director profiles, emails, passwords and share percentages</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type === 'error' ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}

      {/* Share summary */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2>Share Distribution</h2>
          <span className={`badge ${Math.abs(shareTotal - 100) < 0.01 ? 'badge-green' : 'badge-red'}`}>
            Total: {shareTotal.toFixed(1)}%
          </span>
        </div>
        <div className="card-body">
          <div className="share-bars">
            {directors.map(d => (
              <div key={d.id} className="share-bar-item">
                <div className="share-bar-label">{d.name.split(' ')[0]}</div>
                <div className="share-bar-track">
                  <div className="share-bar-fill" style={{ width: `${d.share_percentage}%` }} />
                </div>
                <div className="share-bar-pct">{d.share_percentage}%</div>
              </div>
            ))}
          </div>
          {Math.abs(shareTotal - 100) > 0.01 && (
            <p style={{ color: '#dc2626', fontSize: 12, marginTop: 10 }}>
              ⚠️ Total is {shareTotal.toFixed(1)}% — should be 100% for correct expense splits
            </p>
          )}
        </div>
      </div>

      {/* Director cards */}
      <div style={{ display: 'grid', gap: 16 }}>
        {directors.map(d => (
          <div className="card" key={d.id}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="sidebar-avatar" style={{ width: 36, height: 36, fontSize: 16 }}>
                  {d.name[0]}
                </div>
                <div>
                  <strong>{d.name}</strong>
                  {d.is_admin ? <span className="badge badge-blue" style={{ marginLeft: 8 }}>Admin</span> : null}
                  {d.id === currentUser?.id ? <span className="badge badge-gray" style={{ marginLeft: 8 }}>You</span> : null}
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{d.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {editingId === d.id ? (
                  <>
                    <button className="btn btn-success btn-sm" disabled={saving} onClick={() => saveProfile(d.id)}>
                      💾 Save
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={cancelEdit}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => startEdit(d)}>✏️ Edit</button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setPasswordForm({ userId: d.id, password: '', confirm: '' })}>
                      🔑 Password
                    </button>
                    {d.id !== currentUser?.id && (
                      <button className="btn btn-outline btn-sm" onClick={() => toggleAdmin(d.id)}>
                        {d.is_admin ? '🔒 Revoke Admin' : '🔓 Make Admin'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="card-body">
              {editingId === d.id ? (
                /* ── Edit form ── */
                <div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input className="form-control" value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input className="form-control" type="email" value={editForm.email}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Share Percentage (%)</label>
                      <input className="form-control" type="number" min="0" max="100" step="0.1"
                        value={editForm.share_percentage}
                        onChange={e => setEditForm({ ...editForm, share_percentage: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ fontSize: 12, color: '#6b7280', paddingBottom: 12 }}>
                        Current total with this change:{' '}
                        <strong>
                          {(directors.reduce((s, x) => s + (x.id === d.id ? parseFloat(editForm.share_percentage || 0) : x.share_percentage), 0)).toFixed(1)}%
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Read-only view ── */
                <div style={{ display: 'flex', gap: 32, fontSize: 13 }}>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Email</div>
                    <div>{d.email}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Share %</div>
                    <span className="badge badge-blue">{d.share_percentage}%</span>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Role</div>
                    <span className={`badge ${d.is_admin ? 'badge-yellow' : 'badge-gray'}`}>
                      {d.is_admin ? 'Admin' : 'Director'}
                    </span>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Member Since</div>
                    <div>{new Date(d.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Password modal */}
      {passwordForm.userId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div className="card" style={{ width: 360, margin: 0 }}>
            <div className="card-header">
              <h2>🔑 Change Password</h2>
              <button className="btn btn-outline btn-sm" onClick={() => setPasswordForm({ userId: null, password: '', confirm: '' })}>✕</button>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: 12, fontSize: 13, color: '#6b7280' }}>
                For: <strong>{directors.find(d => d.id === passwordForm.userId)?.name}</strong>
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input className="form-control" type="password" placeholder="Min 6 characters"
                  value={passwordForm.password}
                  onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input className="form-control" type="password" placeholder="Repeat password"
                  value={passwordForm.confirm}
                  onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
              </div>
              {passwordForm.password && passwordForm.confirm && passwordForm.password !== passwordForm.confirm && (
                <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 12 }}>Passwords do not match</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" disabled={saving} onClick={savePassword}>
                  {saving ? 'Saving…' : '💾 Update Password'}
                </button>
                <button className="btn btn-outline" onClick={() => setPasswordForm({ userId: null, password: '', confirm: '' })}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
