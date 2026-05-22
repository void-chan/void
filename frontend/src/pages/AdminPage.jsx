/**
 * src/pages/AdminPage.jsx
 * Admin panel: write blog posts, view inbox messages.
 */
import { useState, useEffect } from 'react';
import { api, fileUrl } from '../services/api';
import { Input }  from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert }  from '../components/ui/Alert';
import { NewPostForm }  from '../components/admin/NewPostForm';
import { EditPostForm } from '../components/admin/EditPostForm';

export function AdminPage() {
  const [tab, setTab]         = useState('posts'); // 'posts' | 'inbox' | 'new' | 'edit'
  const [editPost, setEditPost] = useState(null);

  function openEdit(post) {
    setEditPost(post);
    setTab('edit');
  }

  return (
    <div className="page">
      <div className="container animate-fade-in">
        <div className="page-title">Admin Terminal</div>

        <div className="admin-tabs">
          {[['posts','POSTS'],['inbox','INBOX'],['new','NEW POST']].map(([t,l]) => (
            <button
              key={t}
              className={`admin-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >{l}</button>
          ))}
        </div>

        {tab === 'posts' && <PostsTab onNew={() => setTab('new')} onEdit={openEdit} />}
        {tab === 'inbox' && <InboxTab />}
        {tab === 'new'   && <NewPostForm onDone={() => setTab('posts')} />}
        {tab === 'edit'  && editPost && (
          <EditPostForm post={editPost} onDone={() => { setEditPost(null); setTab('posts'); }} />
        )}
      </div>
    </div>
  );
}

// ── Posts tab ─────────────────────────────────────────────────────────────
function PostsTab({ onNew, onEdit }) {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState('');

  useEffect(() => {
    api.get('/blog').then(({ ok, data }) => {
      if (ok) setPosts(data.data.posts ?? []);
      setLoading(false);
    });
  }, []);

  async function togglePublish(post) {
    const { ok } = await api.patch(`/blog/${post.id}`, { is_published: post.is_published ? 0 : 1 });
    if (ok) {
      setPosts((prev) => prev.map((p) => p.id === post.id ? {...p, is_published: p.is_published ? 0 : 1} : p));
    }
  }

  async function deletePost(id) {
    if (!confirm('Delete this post?')) return;
    const { ok } = await api.delete(`/blog/${id}`);
    if (ok) { setPosts((p) => p.filter((x) => x.id !== id)); setMsg('Post deleted.'); }
  }

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <div>
      {msg && <Alert type="success" style={{marginBottom:'0.5rem'}}>{msg}</Alert>}
      <div style={{marginBottom:'0.75rem',display:'flex',justifyContent:'flex-end'}}>
        <Button size="sm" onClick={onNew}>+ NEW POST</Button>
      </div>
      {posts.length === 0 ? (
        <div className="empty-state">No posts yet</div>
      ) : (
        <div className="post-list">
          {posts.map((p) => (
            <div key={p.id} className="post-card" style={{display:'flex',alignItems:'flex-start',gap:'1rem'}}>
              <div style={{flex:1}}>
                <div className="post-card-title">{p.title}</div>
                <div className="post-card-meta">
                  {new Date(p.created_at).toISOString().slice(0,10)}
                  {' '}<span style={{color: p.is_published ? 'var(--green)' : 'var(--amber)'}}>
                    [{p.is_published ? 'PUBLISHED' : 'DRAFT'}]
                  </span>
                </div>
              </div>
              <div style={{display:'flex',gap:'0.4rem',flexShrink:0}}>
                <Button size="sm" variant="ghost" onClick={() => onEdit(p)}>EDIT</Button>
                <Button size="sm" variant="ghost" onClick={() => togglePublish(p)}>
                  {p.is_published ? 'UNPUBLISH' : 'PUBLISH'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => deletePost(p.id)}>DEL</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── New post tab ──────────────────────────────────────────────────────────
function NewPostTab({ onDone }) {
  const [form, setForm]     = useState({ title: '', body: '', is_published: '1' });
  const [errors, setErrors] = useState({});
  const [alert, setAlert]   = useState({ text: '', type: 'info' });
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    if (!form.body.trim())  e.body  = 'Body is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { ok, data } = await api.post('/blog', {
      title: form.title,
      body: form.body,
      is_published: Number(form.is_published),
    });
    setLoading(false);
    if (ok) { setAlert({ text: 'Post created.', type: 'success' }); setTimeout(onDone, 1000); }
    else setAlert({ text: data.message ?? 'Failed.', type: 'error' });
  }

  const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));

  return (
    <div style={{maxWidth:700}}>
      <form onSubmit={handleSubmit} className="form-stack" noValidate>
        <Alert type={alert.type}>{alert.text}</Alert>

        <Input
          id="post-title"
          label="Title"
          value={form.title}
          onChange={set('title')}
          error={errors.title}
          placeholder="Post title"
        />

        <div className="field">
          <label className="label" htmlFor="post-body">Body</label>
          <textarea
            id="post-body"
            className={`input ${errors.body ? 'is-error' : ''}`}
            rows={16}
            value={form.body}
            onChange={set('body')}
            placeholder="Write your post content..."
          />
          {errors.body && <span className="field-error">{errors.body}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="post-pub">Status</label>
          <select id="post-pub" className="input" value={form.is_published} onChange={set('is_published')}>
            <option value="1">Published</option>
            <option value="0">Draft</option>
          </select>
        </div>

        <div style={{display:'flex',gap:'0.5rem'}}>
          <Button type="submit" loading={loading}>PUBLISH</Button>
          <Button type="button" variant="ghost" onClick={onDone}>CANCEL</Button>
        </div>
      </form>
    </div>
  );
}

// ── Inbox tab ─────────────────────────────────────────────────────────────
function InboxTab() {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(null);

  useEffect(() => {
    api.get('/inbox').then(({ ok, data }) => {
      if (ok) setMessages(data.data.messages ?? []);
      setLoading(false);
    });
  }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this message?')) return;
    const { ok } = await api.delete(`/inbox/${id}`);
    if (ok) setMessages((m) => m.filter((x) => x.id !== id));
  }

  async function handleExpand(msg) {
    if (expanded === msg.id) { setExpanded(null); return; }
    setExpanded(msg.id);
    if (!msg.is_read) {
      await api.patch(`/inbox/${msg.id}/read`, {});
      setMessages((m) => m.map((x) => x.id === msg.id ? {...x, is_read: 1} : x));
    }
  }

  if (loading) return <div className="empty-state">Loading inbox...</div>;
  if (messages.length === 0) return <div className="empty-state">Inbox empty</div>;

  return (
    <div className="inbox-list">
      {messages.map((msg) => (
        <div key={msg.id} className={`inbox-item ${!msg.is_read ? 'unread' : ''}`}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'0.5rem'}}>
            <div style={{flex:1,cursor:'pointer'}} onClick={() => handleExpand(msg)}>
              <div className="inbox-subject">
                {!msg.is_read && <span style={{color:'var(--green)',marginRight:'0.4rem'}}>[NEW]</span>}
                {msg.subject}
              </div>
              <div className="inbox-meta">
                FROM: {msg.sender_username} :: {new Date(msg.created_at).toISOString().replace('T',' ').slice(0,16)}
                {msg.attachments?.length > 0 && ` :: ${msg.attachments.length} ATTACHMENT(S)`}
              </div>
            </div>
            <Button size="sm" variant="danger" onClick={() => handleDelete(msg.id)}>DEL</Button>
          </div>

          {expanded === msg.id && (
            <div style={{marginTop:'0.75rem',borderTop:'1px solid var(--border-dim)',paddingTop:'0.75rem'}}>
              <div className="inbox-body">{msg.body}</div>
              {msg.attachments?.length > 0 && (
                <div className="inbox-attachments">
                  {msg.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={fileUrl(att.stored_name)}
                      className="inbox-attachment"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {att.original_name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
