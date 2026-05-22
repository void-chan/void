/**
 * src/pages/HomePage.jsx — Blog post list / forum board
 */
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { obfuscate } from '../utils/obfuscate';

export function HomePage({ onNavigate }) {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/blog')
      .then(({ ok, data }) => { if (ok) setPosts(data.data.posts ?? []); })
      .finally(() => setLoading(false));
  }, []);

  function formatDate(ts) {
    return new Date(ts).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  }

  function preview(body) {
    return body?.replace(/\n/g, ' ').slice(0, 180) + (body?.length > 180 ? '...' : '');
  }

  return (
    <div className="page">
      <div className="container">
        <div className="home-header" style={{ position: 'relative' }}>
          <div className="home-title flicker">VOID<span style={{color:'var(--green-muted)'}}>.</span>CHAN</div>
          <div className="home-sub cursor">Anonymous imageboard &amp; discussion board</div>
          <div style={{marginTop:'0.5rem',fontSize:'var(--text-xs)',color:'var(--green-muted)'}}>
            :: READ-ONLY BULLETIN BOARD :: POST TO CHAT :: NO REGISTRATION REQUIRED ::
          </div>

          {/* ── Funky red sticker ── */}
          <div style={{
            position: 'absolute',
            top: '-0.5rem',
            right: '0',
            background: '#cc0000',
            color: '#fff',
            fontFamily: 'var(--font)',
            fontSize: '0.72rem',
            fontWeight: 700,
            lineHeight: 1.35,
            padding: '0.55rem 0.85rem',
            transform: 'rotate(-4deg)',
            boxShadow: '3px 3px 0 #000, 0 0 0 2px #ff2222',
            border: '2px dashed #ff6666',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            maxWidth: '200px',
            textAlign: 'center',
            userSelect: 'none',
            zIndex: 10,
            transition: 'transform 0.15s ease',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'rotate(2deg) scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'rotate(-4deg)'}
          >
            My friends call me ChatGPT
            <div style={{ marginTop: '0.25rem', color: '#ffcccc', fontSize: '0.65rem' }}>@aiub</div>
          </div>
        </div>

        <div style={{marginBottom:'1rem'}}>
          <div className="panel-header">Transmissions from admin</div>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'3rem',color:'var(--green-muted)'}}>
            <div className="spinner" style={{width:'1.5rem',height:'1.5rem',margin:'0 auto 0.5rem'}} />
            <div style={{fontSize:'var(--text-xs)',textTransform:'uppercase',letterSpacing:'0.1em'}}>
              Fetching posts...
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">No transmissions yet</div>
        ) : (
          <div className="post-list">
            {posts.map((post) => {
              const redacted    = !post.is_published;
              const seed        = post.id * 31337;
              const dispTitle   = redacted ? obfuscate(post.title, seed)                      : post.title;
              const dispPreview = redacted ? obfuscate(preview(post.body), seed + 1)          : preview(post.body);
              const dispDate    = redacted ? obfuscate(formatDate(post.created_at), seed + 2) : formatDate(post.created_at);
              return (
                <div
                  key={post.id}
                  className="post-card"
                  onClick={() => onNavigate('post', { slug: post.slug })}
                  style={redacted ? {
                    opacity: 0.72,
                    borderColor: '#3a0000',
                    background: 'rgba(22,0,0,0.5)',
                  } : {}}
                >
                  <div className="post-card-title" style={redacted ? {
                    color: '#cc3333',
                    filter: 'blur(0.3px)',
                    letterSpacing: '0.04em',
                  } : {}}>
                    {dispTitle}
                    {redacted && (
                      <span style={{
                        marginLeft: '0.6rem', fontSize: '0.58rem',
                        background: '#5a0000', color: '#ff4444',
                        padding: '0.1rem 0.35rem', border: '1px solid #990000',
                        letterSpacing: '0.14em', verticalAlign: 'middle',
                      }}>[REDACTED]</span>
                    )}
                  </div>
                  <div className="post-card-meta" style={redacted ? { color: '#662222', filter: 'blur(0.2px)' } : {}}>
                    {dispDate}
                  </div>
                  <div className="post-card-preview" style={redacted ? {
                    color: '#883333',
                    filter: 'blur(0.35px)',
                    letterSpacing: '0.02em',
                  } : {}}>
                    {dispPreview}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{marginTop:'2rem',borderTop:'1px solid var(--border-dim)',paddingTop:'1rem',fontSize:'var(--text-xs)',color:'var(--green-muted)',textTransform:'uppercase',letterSpacing:'0.08em'}}>
          <span>:: Want to talk? </span>
          <button className="link-btn" style={{fontSize:'var(--text-xs)'}} onClick={() => onNavigate('chat')}>
            ENTER CHAT ROOM
          </button>
          <span> :: Contact admin? </span>
          <button className="link-btn" style={{fontSize:'var(--text-xs)'}} onClick={() => onNavigate('login')}>
            LOGIN REQUIRED
          </button>
          {' '}::
        </div>
      </div>
    </div>
  );
}
