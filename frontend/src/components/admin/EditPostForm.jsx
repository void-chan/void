/** EditPostForm — pre-filled edit form for an existing blog post */

import { useState, useRef } from 'react';
import { api, fileUrl } from '../../services/api';
import { Input }  from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert }  from '../ui/Alert';

export function EditPostForm({ post, onDone }) {
  const [form, setForm] = useState({
    title:          post.title          ?? '',
    body:           post.body           ?? '',
    is_published:   String(post.is_published ?? 1),
    wallet_enabled: Boolean(post.wallet_enabled),
    eth_address:    post.eth_address    ?? '',
    btc_address:    post.btc_address    ?? '',
  });
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors]   = useState({});
  const [alert, setAlert]     = useState({ text: '', type: 'info' });
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    if (!form.body.trim())  e.body  = 'Body is required.';
    if (form.wallet_enabled) {
      const ethRe = /^0x[0-9a-fA-F]{40}$/;
      const btcRe = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
      if (form.eth_address && !ethRe.test(form.eth_address.trim())) e.eth_address = 'Invalid ETH address.';
      if (form.btc_address && !btcRe.test(form.btc_address.trim())) e.btc_address = 'Invalid BTC address.';
      if (!form.eth_address && !form.btc_address) e.eth_address = 'Enter at least one wallet address.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);

    // Use FormData so we can attach a new image if chosen
    const fd = new FormData();
    fd.append('title',          form.title);
    fd.append('body',           form.body);
    fd.append('is_published',   form.is_published);
    fd.append('wallet_enabled', form.wallet_enabled ? '1' : '0');
    if (form.wallet_enabled) {
      if (form.eth_address) fd.append('eth_address', form.eth_address.trim());
      if (form.btc_address) fd.append('btc_address', form.btc_address.trim());
    }
    if (imageFile) fd.append('image', imageFile);

    // api.uploadPatch sends multipart PATCH; fall back to regular patch if no image
    const { ok, data } = imageFile
      ? await api.uploadPatch(`/blog/${post.id}`, fd)
      : await api.patch(`/blog/${post.id}`, {
          title:          form.title,
          body:           form.body,
          is_published:   Number(form.is_published),
          wallet_enabled: form.wallet_enabled ? 1 : 0,
          eth_address:    form.eth_address || null,
          btc_address:    form.btc_address || null,
        });

    setLoading(false);

    if (ok) {
      setAlert({ text: 'Post updated!', type: 'success' });
      setTimeout(onDone, 900);
    } else {
      setAlert({ text: data?.message ?? 'Failed to update post.', type: 'error' });
    }
  }

  function handleImageChange(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    ev.target.value = '';
  }

  const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--green-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
        :: Editing — {post.title}
      </div>

      <form onSubmit={handleSubmit} className="form-stack" noValidate>
        <Alert type={alert.type}>{alert.text}</Alert>

        {/* Title */}
        <Input id="edit-title" label="Title" value={form.title}
          onChange={set('title')} error={errors.title} placeholder="Post title" />

        {/* Body */}
        <div className="field">
          <label className="label" htmlFor="edit-body">Body</label>
          <textarea id="edit-body" className={`input ${errors.body ? 'is-error' : ''}`}
            rows={12} value={form.body} onChange={set('body')} placeholder="Write your post..." />
          {errors.body && <span className="field-error">{errors.body}</span>}
        </div>

        {/* Image upload */}
        <div className="field">
          <label className="label">Image (leave blank to keep existing)</label>
          {post.image_stored && !imagePreview && (
            <div style={{ marginBottom: '0.4rem', border: '1px solid var(--border-dim)' }}>
              <img
                src={fileUrl(post.image_stored)}
                alt="current"
                style={{ width: '100%', objectFit: 'contain', display: 'block', filter: 'saturate(0.85)', opacity: 0.7 }}
              />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--green-muted)', padding: '0.2rem 0.5rem', background: 'var(--bg-panel)', textTransform: 'uppercase' }}>
                CURRENT IMAGE — Upload new to replace
              </div>
            </div>
          )}
          <div className="upload-zone" onClick={() => fileRef.current?.click()} style={{ padding: '0.6rem' }}>
            {imageFile ? imageFile.name : 'CLICK TO REPLACE IMAGE'}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange} style={{ display: 'none' }} />
          {imagePreview && (
            <div style={{ marginTop: '0.5rem', border: '1px solid var(--border-dim)', position: 'relative' }}>
              <img src={imagePreview} alt="preview"
                style={{ width: '100%', objectFit: 'contain', display: 'block', filter: 'saturate(0.85)' }} />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--amber)', padding: '0.25rem 0.5rem', background: 'var(--bg-panel)', textTransform: 'uppercase' }}>
                !! EXIF METADATA WILL BE STRIPPED ON UPLOAD
              </div>
              <button type="button" className="btn btn-danger btn-sm"
                style={{ position: 'absolute', top: '0.3rem', right: '0.3rem' }}
                onClick={() => { setImageFile(null); setImagePreview(null); }}>
                REMOVE
              </button>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="field">
          <label className="label" htmlFor="edit-pub">Status</label>
          <select id="edit-pub" className="input" value={form.is_published} onChange={set('is_published')}>
            <option value="1">Published</option>
            <option value="0">Draft</option>
          </select>
        </div>

        {/* Wallet toggle */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '0.75rem', background: 'var(--bg-panel)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={form.wallet_enabled}
              onChange={(e) => setForm((f) => ({ ...f, wallet_enabled: e.target.checked }))}
              style={{ accentColor: 'var(--green)', width: '1rem', height: '1rem' }} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Enable Wallet on Post
            </span>
            <span className="badge badge-cyan">LIVE BLOCKCHAIN</span>
          </label>

          {form.wallet_enabled && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--green-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                :: Visitors will see live balances + transactions + MetaMask send button
              </div>
              <div className="field">
                <label className="label" htmlFor="edit-eth">ETH Address (ERC-20)</label>
                <input id="edit-eth" className={`input ${errors.eth_address ? 'is-error' : ''}`}
                  value={form.eth_address} onChange={set('eth_address')}
                  placeholder="0xABCD..." style={{ fontFamily: 'var(--font)', fontSize: 'var(--text-sm)' }} />
                {errors.eth_address && <span className="field-error">{errors.eth_address}</span>}
              </div>
              <div className="field">
                <label className="label" htmlFor="edit-btc">BTC Address</label>
                <input id="edit-btc" className={`input ${errors.btc_address ? 'is-error' : ''}`}
                  value={form.btc_address} onChange={set('btc_address')}
                  placeholder="1A1zP1..." style={{ fontFamily: 'var(--font)', fontSize: 'var(--text-sm)' }} />
                {errors.btc_address && <span className="field-error">{errors.btc_address}</span>}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button type="submit" loading={loading}>SAVE CHANGES</Button>
          <Button type="button" variant="ghost" onClick={onDone}>CANCEL</Button>
        </div>
      </form>
    </div>
  );
}
