/**
 * src/pages/BlogPostPage.jsx — Single blog post with image + live wallet
 */
import { useEffect, useState } from 'react';
import { api, fileUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { WalletWidget } from '../components/wallet/WalletWidget';
import { EditPostForm } from '../components/admin/EditPostForm';

export function BlogPostPage({ slug, onNavigate }) {
  const { user, loading: authLoading } = useAuth();
  const [post, setPost]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [editing, setEditing] = useState(false);

  function reload() {
    setLoading(true);
    api.get(`/blog/${slug}`)
      .then(({ ok, data }) => {
        if (ok) setPost(data.data.post);
        else setError('Post not found or deleted.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!slug) { onNavigate('home'); return; }
    reload();
  }, [slug]);

  function formatDate(ts) {
    return new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  }

  if (loading || authLoading) return (
    <div className="page" style={{textAlign:'center',paddingTop:'4rem'}}>
      <div className="spinner" style={{width:'1.5rem',height:'1.5rem',margin:'0 auto 0.5rem'}} />
      <div style={{fontSize:'var(--text-xs)',color:'var(--green-muted)',textTransform:'uppercase',letterSpacing:'0.1em'}}>
        Loading transmission...
      </div>
    </div>
  );

  if (error || !post) return (
    <div className="page">
      <div className="container">
        <button className="back-link" onClick={() => onNavigate('home')}>BACK TO BOARD</button>
        <div className="empty-state" style={{color:'var(--red)'}}>{error || 'Post not found'}</div>
      </div>
    </div>
  );

  // Non-admins (or logged-out admins) clicking an unpublished post
  const isAdmin = user?.role === 'admin';
  if (!post.is_published && !isAdmin) return (
    <div className="page">
      <div className="container">
        <button className="back-link" onClick={() => onNavigate('home')}>BACK TO BOARD</button>
        <div className="empty-state" style={{color:'var(--red)'}}>Post not found or removed.</div>
        {!user && (
          <div style={{textAlign:'center',marginTop:'0.5rem',fontSize:'var(--text-xs)',color:'var(--green-muted)',textTransform:'uppercase',letterSpacing:'0.08em'}}>
            :: <button className="link-btn" style={{fontSize:'var(--text-xs)'}} onClick={() => onNavigate('login')}>
              LOGIN
            </button> if you have access ::
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="container animate-fade-in" style={{maxWidth:780}}>
        <button className="back-link" onClick={() => onNavigate('home')}>BACK TO BOARD</button>

        <div className="post-page">

          {/* Edit mode */}
          {editing && (
            <EditPostForm
              post={post}
              onDone={() => { setEditing(false); reload(); }}
            />
          )}

          {!editing && (
          <>
            {/* Title + meta */}
            <div className="post-page-header">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div className="post-page-title">{post.title}</div>
                {isAdmin && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flexShrink: 0, marginTop: '0.2rem' }}
                    onClick={() => setEditing(true)}
                  >
                    EDIT
                  </button>
                )}
              </div>
              <div className="post-page-meta">
                {formatDate(post.created_at)}
                {post.updated_at !== post.created_at && (
                  <span style={{marginLeft:'0.75rem'}}>[EDITED: {formatDate(post.updated_at)}]</span>
                )}
              </div>
            </div>

            {/* Image */}
            {post.image_stored && (
              <div style={{marginBottom:'1.25rem',border:'1px solid var(--border-dim)'}}>
                <img
                  src={fileUrl(post.image_stored)}
                  alt={post.image_original ?? post.title}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    filter: 'saturate(0.85) contrast(1.05)',
                    objectFit: 'contain',
                  }}
                />
                <div style={{
                  padding:'0.25rem 0.5rem',
                  fontSize:'var(--text-xs)',
                  color:'var(--green-muted)',
                  background:'var(--bg-panel)',
                  textTransform:'uppercase',
                  letterSpacing:'0.06em',
                }}>
                  :: IMAGE METADATA STRIPPED FOR PRIVACY ::
                </div>
              </div>
            )}

            {/* Post body */}
            <div className="post-body">{post.body}</div>

            {/* Live wallet widget */}
            {post.wallet_enabled === 1 && (post.eth_address || post.btc_address) && (
              <WalletWidget
                ethAddress={post.eth_address}
                btcAddress={post.btc_address}
              />
            )}

            <div style={{
              marginTop:'2rem',
              borderTop:'1px solid var(--border-dim)',
              paddingTop:'1rem',
              fontSize:'var(--text-xs)',
              color:'var(--green-muted)',
              textTransform:'uppercase',
              letterSpacing:'0.08em',
            }}>
              :: <button className="link-btn" style={{fontSize:'var(--text-xs)'}} onClick={() => onNavigate('chat')}>
                DISCUSS IN CHAT
              </button> ::
            </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
