import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function AddExpense() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [directors, setDirectors] = useState([]);
  const [form, setForm] = useState({ amount: '', reason: '', isCustomSplit: false });
  const [customSplits, setCustomSplits] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/users').then(r => {
      setDirectors(r.data);
      setCustomSplits(r.data.map(d => ({ userId: d.id, name: d.name, percentage: d.share_percentage })));
    });
  }, []);

  const customTotal = customSplits.reduce((s, c) => s + parseFloat(c.percentage || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.isCustomSplit && Math.abs(customTotal - 100) > 0.01) {
      return setError(`Custom splits must total 100% (currently ${customTotal.toFixed(1)}%)`);
    }
    setLoading(true);
    try {
      await api.post('/expenses', {
        amount: parseFloat(form.amount),
        reason: form.reason,
        isCustomSplit: form.isCustomSplit,
        customSplits: form.isCustomSplit ? customSplits.map(c => ({ userId: c.userId, percentage: parseFloat(c.percentage) })) : undefined,
      });
      setSuccess('Expense added successfully! Emails sent to directors.');
      setTimeout(() => navigate('/expenses'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Add Expense</h1>
        <p>Record a new shared expense</p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div className="card-header"><h2>Expense Details</h2></div>
        <div className="card-body">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Amount (₹)</label>
                <input className="form-control" type="number" min="0.01" step="0.01" required
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Added By</label>
                <input className="form-control" value={user?.name || ''} disabled />
              </div>
            </div>

            <div className="form-group">
              <label>Reason / Description</label>
              <textarea className="form-control" rows={3} required
                placeholder="e.g., Office supplies, client dinner…"
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="toggle-switch">
                <input type="checkbox"
                  checked={form.isCustomSplit}
                  onChange={e => setForm({ ...form, isCustomSplit: e.target.checked })} />
                <span className="toggle-label">
                  {form.isCustomSplit ? '✏️ Custom Split (edit below)' : '✅ Use Default Shares'}
                </span>
              </label>
            </div>

            {!form.isCustomSplit && directors.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Default Split Preview
                </div>
                <div className="share-bars">
                  {directors.map(d => (
                    <div key={d.id} className="share-bar-item">
                      <div className="share-bar-label">{d.name}</div>
                      <div className="share-bar-track">
                        <div className="share-bar-fill" style={{ width: `${d.share_percentage}%` }} />
                      </div>
                      <div className="share-bar-pct">{d.share_percentage}%</div>
                    </div>
                  ))}
                </div>
                {form.amount && (
                  <div className="split-chips" style={{ marginTop: 12 }}>
                    {directors.map(d => (
                      <div key={d.id} className="split-chip">
                        <span className="name">{d.name}</span>
                        <span className="amt">₹{((parseFloat(form.amount) * d.share_percentage) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {form.isCustomSplit && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Custom Splits — Total: <strong style={{ color: Math.abs(customTotal - 100) < 0.01 ? '#16a34a' : '#dc2626' }}>{customTotal.toFixed(1)}%</strong>
                </div>
                {customSplits.map((cs, i) => (
                  <div key={cs.userId} className="form-row" style={{ marginBottom: 8 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <input className="form-control" value={cs.name} disabled />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <input className="form-control" type="number" min="0" max="100" step="0.1"
                        placeholder="%" value={cs.percentage}
                        onChange={e => {
                          const updated = [...customSplits];
                          updated[i] = { ...cs, percentage: e.target.value };
                          setCustomSplits(updated);
                        }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving…' : '💾 Save Expense'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/expenses')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
