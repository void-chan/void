/**
 * src/pages/ContactPage.jsx
 * Registered users send a message (+ up to 3 image/pdf attachments) to admin.
 */
import { useState, useRef } from 'react';
import { api }    from '../services/api';
import { Input }  from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert }  from '../components/ui/Alert';

export function ContactPage() {
  const [form, setForm]     = useState({ subject: '', body: '' });
  const [files, setFiles]   = useState([]);
  const [errors, setErrors] = useState({});
  const [alert, setAlert]   = useState({ text: '', type: 'info' });
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  function validate() {
    const e = {};
    if (!form.subject.trim()) e.subject = 'Subject is required.';
    if (!form.body.trim())    e.body    = 'Message body is required.';
    if (files.length > 3)     e.files   = 'Max 3 attachments.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setAlert({ text: '', type: 'info' });
    if (!validate()) return;

    setLoading(true);
    const fd = new FormData();
    fd.append('subject', form.subject);
    fd.append('body',    form.body);
    files.forEach((f) => fd.append('files', f));

    const { ok, data } = await api.upload('/inbox', fd);
    setLoading(false);

    if (ok) {
      setAlert({ text: 'Message sent to admin.', type: 'success' });
      setForm({ subject: '', body: '' });
      setFiles([]);
    } else {
      setAlert({ text: data.message ?? 'Send failed.', type: 'error' });
    }
  }

  function handleFileChange(ev) {
    const selected = Array.from(ev.target.files).slice(0, 3);
    setFiles(selected);
    ev.target.value = '';
  }

  const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));

  return (
    <div className="page">
      <div className="container animate-fade-in" style={{maxWidth:600}}>
        <div className="page-title">Contact Admin</div>

        <div className="panel" style={{marginBottom:'1rem',fontSize:'var(--text-xs)',color:'var(--green-muted)',lineHeight:1.8}}>
          <div>:: SECURE CHANNEL TO ADMIN ::</div>
          <div>Your account email will be visible to admin.</div>
          <div>Accepted files: JPEG, PNG, WebP, GIF, PDF (max 10MB each, max 3 files)</div>
        </div>

        <form onSubmit={handleSubmit} className="form-stack" noValidate>
          <Alert type={alert.type}>{alert.text}</Alert>

          <Input
            id="subject"
            label="Subject"
            type="text"
            placeholder="Re: [topic]"
            value={form.subject}
            onChange={set('subject')}
            error={errors.subject}
          />

          <div className="field">
            <label className="label" htmlFor="msg-body">Message</label>
            <textarea
              id="msg-body"
              className={`input ${errors.body ? 'is-error' : ''}`}
              placeholder="Write your message..."
              rows={6}
              value={form.body}
              onChange={set('body')}
            />
            {errors.body && <span className="field-error">{errors.body}</span>}
          </div>

          <div className="field">
            <label className="label">Attachments (optional)</label>
            <div
              className="upload-zone"
              onClick={() => fileRef.current?.click()}
              style={{padding:'0.75rem'}}
            >
              {files.length > 0
                ? files.map((f) => f.name).join(', ')
                : 'CLICK TO ATTACH FILES (max 3)'}
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={handleFileChange}
              style={{display:'none'}}
            />
            {errors.files && <span className="field-error">{errors.files}</span>}
          </div>

          <Button type="submit" loading={loading}>TRANSMIT MESSAGE</Button>
        </form>
      </div>
    </div>
  );
}
