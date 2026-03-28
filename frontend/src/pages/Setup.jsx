import { useState } from 'react';
import api from '../api';

const INITIAL_DIRECTORS = [
  { name: '', email: '', password: '', share_percentage: '' },
  { name: '', email: '', password: '', share_percentage: '' },
  { name: '', email: '', password: '', share_percentage: '' },
];

export default function Setup({ onComplete }) {
  const [directors, setDirectors] = useState(INITIAL_DIRECTORS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0); // 0 = form, 1 = success

  const update = (i, field, value) => {
    const updated = [...directors];
    updated[i] = { ...updated[i], [field]: value };
    setDirectors(updated);
  };

  const total = directors.reduce((s, d) => s + parseFloat(d.share_percentage || 0), 0);
  const validTotal = Math.abs(total - 100) < 0.01;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    for (const d of directors) {
      if (!d.name || !d.email || !d.password)
        return setError('All fields are required for each director');
      if (d.password.length < 6)
        return setError(`Password for ${d.name || 'a director'} must be at least 6 characters`);
      if (!d.email.includes('@'))
        return setError(`Invalid email: ${d.email}`);
    }
    if (!validTotal)
      return setError(`Share percentages must total 100% (currently ${total.toFixed(1)}%)`);

    setSubmitting(true);
    try {
      await api.post('/setup', { directors: directors.map(d => ({ ...d, share_percentage: parseFloat(d.share_percentage) })) });
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Setup failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (step === 1) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Setup Complete!</h1>
          <p style={{ color: '#9ca3af', marginBottom: 24 }}>
            {directors[0].name} is set as admin. All directors can now log in.
          </p>
          <div className="split-chips" style={{ marginBottom: 24 }}>
            {directors.map((d, i) => (
              <div key={i} className="split-chip">
                <span className="name">{d.name}</span>
                <span className="pct">{i === 0 ? '👑 Admin' : 'Director'}</span>
                <span className="amt">{d.share_percentage}%</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onComplete}>
            Go to Login →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: 560 }}>
        <div className="login-logo">⚙️</div>
        <h1 className="login-title">Initial Setup</h1>
        <p className="login-subtitle">Configure the 3 directors to get started. The first director will be the admin.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {directors.map((d, i) => (
            <div key={i} style={{ marginBottom: 20, padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa', marginBottom: 12 }}>
                Director {i + 1} {i === 0 ? '(Admin)' : ''}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="form-control" placeholder="e.g. Rajesh Kumar" value={d.name}
                    onChange={e => update(i, 'name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Share %</label>
                  <input className="form-control" type="number" min="0" max="100" step="0.1" placeholder="e.g. 40"
                    value={d.share_percentage} onChange={e => update(i, 'share_percentage', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input className="form-control" type="email" placeholder="director@company.com" value={d.email}
                    onChange={e => update(i, 'email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input className="form-control" type="password" placeholder="Min 6 characters" value={d.password}
                    onChange={e => update(i, 'password', e.target.value)} />
                </div>
              </div>
            </div>
          ))}

          <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 14, fontWeight: 500 }}>
            Share Total:{' '}
            <strong style={{ color: validTotal ? '#16a34a' : '#dc2626' }}>{total.toFixed(1)}%</strong>
            {!validTotal && <span style={{ color: '#dc2626' }}> — must equal 100%</span>}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Setting up…' : '🚀 Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
