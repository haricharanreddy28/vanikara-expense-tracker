import { useState, useEffect } from 'react';
import api from '../api';

const ACTION_ICONS = {
  expense_created:       { icon: '💰', label: 'Expense Created' },
  payment_marked:        { icon: '✅', label: 'Payment Marked Paid' },
  share_change_requested:{ icon: '📝', label: 'Share Change Requested' },
  share_change_approved: { icon: '👍', label: 'Share Change Approved' },
  share_change_rejected: { icon: '👎', label: 'Share Change Rejected' },
  document_uploaded:     { icon: '📁', label: 'Document Uploaded' },
  document_deleted:      { icon: '🗑️', label: 'Document Deleted' },
};

export default function AuditLog() {
  const [data, setData] = useState({ logs: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = (p) => {
    setLoading(true);
    api.get(`/audit-logs?page=${p}&limit=30`).then(r => setData(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  return (
    <div>
      <div className="page-header">
        <h1>Audit Log</h1>
        <p>{data.total} total events recorded</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : data.logs.length === 0 ? (
          <div className="empty-state"><div className="icon">🔍</div><p>No audit events yet.</p></div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>User</th>
                    <th>Details</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map(l => {
                    const meta = ACTION_ICONS[l.action] || { icon: '🔔', label: l.action };
                    return (
                      <tr key={l.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{meta.icon}</span>
                            <span style={{ fontWeight: 500, fontSize: 13 }}>{meta.label}</span>
                          </div>
                        </td>
                        <td>{l.user_name || <span style={{ color: '#9ca3af' }}>System</span>}</td>
                        <td>
                          <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, color: '#374151' }}>
                            {JSON.stringify(l.details)}
                          </code>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', color: '#6b7280', fontSize: 12 }}>
                          {new Date(l.timestamp).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.pages > 1 && (
              <div className="pagination">
                <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p-1)}>← Prev</button>
                <span>Page {data.page} of {data.pages}</span>
                <button className="btn btn-outline btn-sm" disabled={page === data.pages} onClick={() => setPage(p => p+1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
