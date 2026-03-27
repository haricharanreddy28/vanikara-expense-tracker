import { useState, useEffect, useRef } from 'react';
import api from '../api';

const docIcons = { company: '🏢', director: '👤', letter: '📨', default: '📄' };

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('company');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef();

  const load = () => api.get('/documents').then(r => setDocs(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) return setError('Please select a file');
    setError(''); setSuccess(''); setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', uploadType);
    try {
      await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(`"${file.name}" uploaded successfully`);
      fileRef.current.value = '';
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await api.delete(`/documents/${id}`);
    await load();
  };

  const filtered = filter === 'all' ? docs : docs.filter(d => d.type === filter);

  if (loading) return <div className="loading">Loading documents…</div>;

  return (
    <div>
      <div className="page-header"><h1>Documents</h1><p>Company files, director documents, and scanned letters</p></div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Upload card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Upload Document</h2></div>
        <div className="card-body">
          <form onSubmit={handleUpload}>
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select className="form-control" value={uploadType} onChange={e => setUploadType(e.target.value)}>
                  <option value="company">🏢 Company Document</option>
                  <option value="director">👤 Director Document</option>
                  <option value="letter">📨 Scanned Letter</option>
                </select>
              </div>
              <div className="form-group">
                <label>File</label>
                <input className="form-control" type="file" ref={fileRef}
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx" />
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
              Supported: PDF, images (PNG/JPG/GIF/WebP), Word, Excel — Max 20MB
            </div>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Uploading…' : '📤 Upload'}
            </button>
          </form>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="doc-type-tabs">
        {[['all','All Documents'],['company','Company'],['director','Director'],['letter','Letters']].map(([v,l]) => (
          <button key={v} className={`tab-btn${filter===v?' active':''}`} onClick={() => setFilter(v)}>
            {l} {v !== 'all' && <span>({docs.filter(d=>d.type===v).length})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><div className="icon">📭</div><p>No documents in this category.</p></div>
      ) : (
        <div className="doc-list">
          {filtered.map(d => (
            <div key={d.id} className="doc-item">
              <div className="doc-item-left">
                <div className="doc-icon">{docIcons[d.type] || docIcons.default}</div>
                <div>
                  <div className="doc-name">{d.original_name}</div>
                  <div className="doc-meta">
                    <span className="badge badge-blue" style={{ marginRight: 6 }}>{d.type}</span>
                    Uploaded by {d.uploaded_by_name} · {new Date(d.uploaded_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={`/api/documents/${d.id}/download`}
                  className="btn btn-outline btn-sm"
                  download>
                  ⬇ Download
                </a>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d.id, d.original_name)}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
