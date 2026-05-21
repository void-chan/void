/**
 * src/pages/DashboardPage.jsx
 *
 * Protected dashboard with file upload example.
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export function DashboardPage() {
  const { user } = useAuth();
  const [uploads, setUploads]       = useState([]);
  const [uploading, setUploading]   = useState(false);
  const [fetchingUploads, setFetchingUploads] = useState(true);
  const [message, setMessage]       = useState({ text: '', type: 'info' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get('/uploads')
      .then(({ ok, data }) => {
        if (ok) setUploads(data.data.uploads ?? []);
      })
      .finally(() => setFetchingUploads(false));
  }, []);

  async function handleUpload(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;

    setMessage({ text: '', type: 'info' });
    setUploading(true);

    const fd = new FormData();
    fd.append('file', file);

    const { ok, data } = await api.upload('/uploads', fd);
    setUploading(false);

    if (ok) {
      setUploads((prev) => [data.data.file, ...prev]);
      setMessage({ text: 'File uploaded successfully.', type: 'success' });
    } else {
      setMessage({ text: data.message ?? 'Upload failed.', type: 'error' });
    }

    ev.target.value = '';
  }

  async function handleDelete(id) {
    const { ok, data } = await api.delete(`/uploads/${id}`);
    if (ok) {
      setUploads((prev) => prev.filter((u) => u.id !== id));
      setMessage({ text: 'File deleted.', type: 'success' });
    } else {
      setMessage({ text: data.message ?? 'Delete failed.', type: 'error' });
    }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-sub">Signed in as <strong>{user?.email}</strong></p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="section-header">
            <h2 className="section-title">Upload a file</h2>
            <p className="section-sub">Images and PDFs up to 10 MB.</p>
          </div>

          <Alert type={message.type}>{message.text}</Alert>

          <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
            <div className="upload-icon">↑</div>
            <p className="upload-label">
              {uploading ? 'Uploading...' : 'Click to select a file'}
            </p>
            <p className="upload-hint">JPEG, PNG, WebP, GIF, PDF</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={handleUpload}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </div>
        </div>

        {/* Uploads List */}
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: 'var(--space-4)' }}>
            Your files
          </h2>

          {fetchingUploads ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <div className="spinner spinner-lg" />
            </div>
          ) : uploads.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>
              No files uploaded yet.
            </p>
          ) : (
            <ul className="upload-list">
              {uploads.map((u) => (
                <li key={u.id} className="upload-item">
                  <div className="upload-info">
                    <span className="upload-name">{u.original_name}</span>
                    <span className="upload-meta">
                      {u.mime_type} · {formatBytes(u.size_bytes)}
                    </span>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(u.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
