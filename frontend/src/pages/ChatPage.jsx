/**
 * src/pages/ChatPage.jsx
 *
 * Anonymous public chat room.
 *  - No login needed
 *  - Resets every 1 hour (countdown shown)
 *  - Spam detection gives immediate feedback
 *  - Auto-scrolls to bottom
 *  - Shows own messages in different color
 *  - Polls every 5 seconds for new messages
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

const POLL_INTERVAL = 5000;

function formatTime(ts) {
  return new Date(ts).toISOString().slice(11, 19);
}

function countdown(nextReset) {
  if (!nextReset) return '--:--';
  const diff = Math.max(0, new Date(nextReset).getTime() - Date.now());
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ChatPage() {
  const [messages, setMessages]     = useState([]);
  const [nextReset, setNextReset]   = useState(null);
  const [myHandle, setMyHandle]     = useState('');
  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [spamWarn, setSpamWarn]     = useState('');
  const [error, setError]           = useState('');
  const [timer, setTimer]           = useState('--:--');
  const [loading, setLoading]       = useState(true);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const pollRef     = useRef(null);

  // ── Fetch chat state ──────────────────────────────────────────────
  const fetchChat = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { ok, data } = await api.get('/chat');
    if (!silent) setLoading(false);
    if (!ok) return;

    const newMsgs = data.data.messages ?? [];

    setMessages((prev) => {
      // If reset happened (count went down or empty), replace entirely
      if (data.data.wasJustReset || newMsgs.length < prev.length) {
        return newMsgs;
      }
      // Only append new ones
      const existIds = new Set(prev.map((m) => m.id));
      const added    = newMsgs.filter((m) => !existIds.has(m.id));
      return added.length ? [...prev, ...added] : prev;
    });

    setNextReset(data.data.nextResetAt);
  }, []);

  // ── Fetch own handle ──────────────────────────────────────────────
  useEffect(() => {
    api.get('/chat/me').then(({ ok, data }) => {
      if (ok) {
        setMyHandle(data.data.handle);
      }
    });
    fetchChat();

    // Poll for new messages
    pollRef.current = setInterval(() => fetchChat(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchChat]);

  // ── Countdown timer ───────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTimer(countdown(nextReset)), 1000);
    return () => clearInterval(id);
  }, [nextReset]);

  // ── Auto-scroll ───────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────
  async function handleSend(e) {
    e?.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setSpamWarn('');
    setError('');
    setSending(true);

    const { ok, data, status } = await api.post('/chat', { content });
    setSending(false);

    if (ok) {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === data.data.message.id);
        return exists ? prev : [...prev, data.data.message];
      });
      setNextReset(data.data.nextResetAt);
      setInput('');
      inputRef.current?.focus();
    } else if (status === 429) {
      setSpamWarn(data.message);
    } else {
      setError(data.message ?? 'Send failed.');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const charCount = input.length;
  const isOverLimit = charCount > 2000;

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-title">// ANON CHAT ROOM // NO LOGS AFTER RESET //</div>
        <div style={{display:'flex',gap:'1rem',alignItems:'center',flexWrap:'wrap'}}>
          {myHandle && <span className="chat-handle">YOU: {myHandle}</span>}
          <span className="chat-timer">RESET IN: {timer}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        <div className="chat-sys">
          ANONYMOUS CHAT — MESSAGES ARE DELETED EVERY HOUR — NO LOGS KEPT
        </div>

        {loading ? (
          <div className="chat-empty">
            <div className="spinner" style={{width:'1.5rem',height:'1.5rem'}} />
            <span>Connecting...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <span>No messages yet.</span>
            <span style={{fontSize:'var(--text-xs)'}}>Be the first to transmit.</span>
          </div>
        ) : (
          messages.map((msg) => {
            // Prefer user_handle (logged-in username) over anon_handle
            const displayHandle = msg.user_handle ?? msg.anon_handle;
            const isAdmin = msg.user_role === 'admin';
            const isOwn   = displayHandle === myHandle;
            return (
              <div key={msg.id} className={`chat-msg ${isOwn ? 'own' : ''}`}
                style={isAdmin ? {
                  borderLeft: '3px solid #cc0000',
                  paddingLeft: '0.6rem',
                  background: 'rgba(80,0,0,0.18)',
                } : {}}
              >
                <div className="chat-msg-meta">
                  <span className="chat-msg-handle" style={isAdmin ? {
                    color: '#ff2222',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textShadow: '0 0 8px rgba(255,0,0,0.5)',
                  } : {}}>
                    {isAdmin && <span style={{ marginRight: '0.3rem' }}>⬛</span>}
                    {displayHandle}
                    {isAdmin && <span style={{ marginLeft: '0.3rem', fontSize: '0.65em', opacity: 0.8 }}>[ADMIN]</span>}
                  </span>
                  <span className="chat-msg-time">{formatTime(msg.created_at)}</span>
                </div>
                <div className="chat-msg-content">{msg.content}</div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        {spamWarn && <div className="chat-spam-warn">{spamWarn}</div>}
        {error    && <div className="chat-spam-warn" style={{color:'var(--amber)'}}>{error}</div>}

        <form className="chat-input-row" onSubmit={handleSend}>
          <textarea
            ref={inputRef}
            className={`chat-input ${isOverLimit ? 'is-error' : ''}`}
            placeholder={myHandle ? `${myHandle} // type here...` : 'type your message...'}
            value={input}
            onChange={(e) => { setInput(e.target.value); setSpamWarn(''); }}
            onKeyDown={handleKeyDown}
            maxLength={2100}
            rows={1}
            disabled={sending}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={sending || !input.trim() || isOverLimit}
          >
            {sending ? <span className="spinner" style={{width:'0.8em',height:'0.8em'}} /> : 'SEND'}
          </button>
        </form>
        <div className="chat-counter" style={{color: isOverLimit ? 'var(--red)' : undefined}}>
          {charCount}/2000 :: ENTER to send · SHIFT+ENTER new line
        </div>
      </div>
    </div>
  );
}
