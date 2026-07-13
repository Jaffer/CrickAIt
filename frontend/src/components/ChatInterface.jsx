import { useState, useEffect, useRef } from 'react';
import { authenticatedFetch, getLocalDateString } from '../services/api';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export default function ChatInterface({
  currentSessionId,
  setCurrentSessionId,
  toggleSidebar,
  onShowAlert,
  onShowError,
  onLogout
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (currentSessionId) {
      loadHistory(currentSessionId);
    } else {
      setMessages([]);
      setChatTitle('New Chat');
    }
  }, [currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const handleTitleChange = (e) => {
      setChatTitle(e.detail);
    };
    window.addEventListener('chat-title-changed', handleTitleChange);
    return () => window.removeEventListener('chat-title-changed', handleTitleChange);
  }, []);

  const loadHistory = async (sid) => {
    try {
      const res = await authenticatedFetch(`/history/${sid}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        const namesRes = await authenticatedFetch('/session-names');
        if (namesRes.ok) {
          const names = await namesRes.json();
          setChatTitle(names[sid] || 'Chat');
        } else {
          setChatTitle('Chat');
        }
      } else {
        onShowError('server');
      }
    } catch (e) {
      console.error(e);
      onShowError('server');
    }
  };

  const handleSend = async (forcedText = null) => {
    const textToSend = (forcedText || input).trim();
    if (!textToSend) return;
    if (!forcedText) setInput('');

    const isNewSession = !currentSessionId;
    const sid = currentSessionId || crypto.randomUUID();
    if (isNewSession) {
      setCurrentSessionId(sid);
      setChatTitle(textToSend.substring(0, 20) + (textToSend.length > 20 ? '...' : ''));
    }

    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setLoading(true);

    try {
      const localDate = getLocalDateString();
      const userLang = localStorage.getItem('crickait_lang') || 'English (UK)';
      const res = await authenticatedFetch(`/ask?user_prompt=${encodeURIComponent(textToSend)}&session_id=${sid}&local_date=${localDate}&lang=${encodeURIComponent(userLang)}`, {
        method: 'POST'
      });

      if (!res.ok) {
        if (res.status === 401) {
          onLogout();
          return;
        }
        throw new Error('Server error');
      }

      const data = await res.json();

      if (data.route === 'LIMIT_REACHED') {
        const plan = localStorage.getItem('crickait_plan') || 'free';
        if (plan === 'guest') {
          onShowAlert({
            title: 'Limit Reached',
            message: 'Your guest limit of 20 messages is over. Please sign up to continue!'
          });
        } else {
          onShowAlert({
            title: 'Limit Reached',
            message: 'Your daily limit of 100 messages is over. Please upgrade to Pro to continue!'
          });
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        if (isNewSession) {
          window.dispatchEvent(new Event('chat-sessions-changed'));
        }
      }
    } catch (e) {
      console.error(e);
      onShowError('server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleSendMsg = (e) => {
      if (e.detail) {
        handleSend(e.detail);
      }
    };
    window.addEventListener('send-chat-message', handleSendMsg);
    return () => window.removeEventListener('send-chat-message', handleSendMsg);
  }, [handleSend]);

  return (
    <main className="main-chat">
      <header className="chat-header">
        <button className="icon-btn toggle-sidebar-open" onClick={toggleSidebar}>
          <i className="fa-solid fa-window-restore"></i>
        </button>
        <div className="header-title">{chatTitle}</div>
      </header>

      <div className="chat-container">
        {/* Ambient Effects */}
        <div className="floating-cricket-element fc-1">🏏</div>
        <div className="floating-cricket-element fc-2">🥎</div>
        <div className="floating-cricket-element fc-3">🏏</div>
        <div className="floating-cricket-element fc-4">🥎</div>
        <div className="ambient-glow orb-1"></div>
        <div className="ambient-glow orb-2"></div>
        <div className="ambient-glow orb-3"></div>

        {messages.length === 0 && !loading && (
          <div className="welcome-screen">
            <div className="logo-container"><img src="/favicon.png" alt="Logo" /></div>
            <h1>How can I help you with cricket today?</h1>
            <div className="suggestion-cards">
              <div className="card" onClick={() => handleSend('Show me the current IPL points table')}>
                <div className="card-icon"><i className="fa-solid fa-table-list"></i></div>
                <div className="card-text">Show me the current IPL points table</div>
              </div>
              <div className="card" onClick={() => handleSend('What is the latest cricket news?')}>
                <div className="card-icon"><i className="fa-solid fa-newspaper"></i></div>
                <div className="card-text">What is the latest cricket news?</div>
              </div>
              <div className="card" onClick={() => handleSend('Show me live match scores')}>
                <div className="card-icon"><i className="fa-solid fa-satellite-dish"></i></div>
                <div className="card-text">Show me live match scores</div>
              </div>
              <div className="card" onClick={() => handleSend('Give me stats for Virat Kohli')}>
                <div className="card-icon"><i className="fa-solid fa-chart-simple"></i></div>
                <div className="card-text">Give me stats for Virat Kohli</div>
              </div>
            </div>
          </div>
        )}

        <div className="messages-wrapper max-w-4xl mx-auto px-md py-lg flex flex-col gap-md">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col gap-xs max-w-[80%] ${m.role === 'user' ? 'ml-auto items-end' : 'items-start'}`}>
              <div className={`p-sm rounded-xl rounded-tl-none border-l-4 ${m.role === 'user' ? 'bg-pitch-dark text-on-surface border border-outline-variant/30 border-l-0 rounded-tr-none' : 'bg-stadium-grey text-on-surface border-grass-green'}`}>
                <div
                  className="message-content font-body-md"
                  dangerouslySetInnerHTML={{
                    __html: m.role === 'user'
                      ? DOMPurify.sanitize(m.content)
                      : DOMPurify.sanitize(marked.parse(m.content))
                  }}
                />
              </div>
              <span className="text-[10px] font-label-caps text-text-muted px-2">
                {m.role === 'user' ? 'YOU' : 'CRICKALT AI'}
              </span>
            </div>
          ))}
          {loading && (
            <div className="flex flex-col gap-xs max-w-[80%] items-start">
              <div className="p-sm rounded-xl rounded-tl-none border-l-4 bg-stadium-grey text-on-surface border-grass-green">
                <div className="cricket-loader" style={{ display: 'flex', gap: '6px' }}>
                  <div className="cricket-loader-bouncer"><div className="cricket-loader-ball"></div></div>
                  <div className="cricket-loader-bouncer" style={{ animationDelay: '0.15s' }}><div className="cricket-loader-ball"></div></div>
                  <div className="cricket-loader-bouncer" style={{ animationDelay: '0.3s' }}><div className="cricket-loader-ball"></div></div>
                </div>
              </div>
              <span className="text-[10px] font-label-caps text-text-muted px-2">
                CRICKALT AI
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="input-area">
        <form className="flex items-center gap-sm relative w-full" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
          <input 
            className="w-full bg-surface-container border border-outline-variant focus:border-grass-green focus:ring-1 focus:ring-grass-green rounded-full px-md py-sm text-on-surface placeholder:text-on-surface-variant/50 pr-12 text-sm" 
            placeholder="Ask CrickAlt anything..." 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button 
            className="absolute right-2 top-1/2 -translate-y-1/2 p-xs bg-grass-green text-pitch-dark rounded-full hover:scale-105 transition-transform flex items-center justify-center w-8 h-8" 
            type="submit"
            disabled={!input.trim() || loading}
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </form>
      </div>
    </main>
  );
}
