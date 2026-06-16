import { useState, useEffect, useRef } from 'react';
import { authenticatedFetch, getLocalDateString } from '../services/api';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export default function ChatInterface({
  currentSessionId,
  setCurrentSessionId,
  toggleSidebar,
  onShowAlert,
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
        // Get name from Sidebar sessions if possible, or request session name
        const namesRes = await authenticatedFetch('/session-names');
        if (namesRes.ok) {
          const names = await namesRes.json();
          setChatTitle(names[sid] || 'Chat');
        } else {
          setChatTitle('Chat');
        }
      }
    } catch (e) {
      console.error(e);
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
      const res = await authenticatedFetch(`/ask?user_prompt=${encodeURIComponent(textToSend)}&session_id=${sid}&local_date=${localDate}`, {
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
        // Dispatch session changed event to update Sidebar list
        if (isNewSession) {
          window.dispatchEvent(new Event('chat-sessions-changed'));
        }
      }
    } catch (e) {
      console.error(e);
      onShowAlert({
        title: 'Notification',
        message: 'Network connection error. If this is the first action in a while, the backend server might be waking up (Render free tier cold starts can take up to 60 seconds). Please wait a moment and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main-chat">
      <header className="chat-header">
        <button className="icon-btn toggle-sidebar-open" onClick={toggleSidebar}>
          <i className="fa-solid fa-window-restore"></i>
        </button>
        <div className="header-title">{chatTitle}</div>
      </header>

      <div className="chat-container">
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

        <div className="messages-wrapper">
          {messages.map((m, i) => (
            <div key={i} className={`message-wrapper ${m.role === 'user' ? 'user-message' : 'bot-message'}`}>
              <div className={`message ${m.role === 'user' ? 'user' : 'bot'}`}>
                <div className="message-avatar">{m.role === 'user' ? '👤' : '🏏'}</div>
                <div
                  className="message-content"
                  dangerouslySetInnerHTML={{
                    __html: m.role === 'user'
                      ? DOMPurify.sanitize(m.content)
                      : DOMPurify.sanitize(marked.parse(m.content))
                  }}
                />
              </div>
            </div>
          ))}
          {loading && (
            <div className="message-wrapper bot-message">
              <div className="message bot">
                <div className="message-avatar">🏏</div>
                <div className="message-content">
                  <div className="cricket-loader" style={{ display: 'flex', gap: '6px' }}>
                    <div className="cricket-loader-bouncer"><div className="cricket-loader-ball"></div></div>
                    <div className="cricket-loader-bouncer" style={{ animationDelay: '0.15s' }}><div className="cricket-loader-ball"></div></div>
                    <div className="cricket-loader-bouncer" style={{ animationDelay: '0.3s' }}><div className="cricket-loader-ball"></div></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="input-area">
        <div className="input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message CrickAIt..."
            rows="1"
            id="chat-input"
          />
          <button className="send-btn" onClick={() => handleSend()} disabled={!input.trim() || loading}>
            <i className="fa-solid fa-arrow-up"></i>
          </button>
        </div>
      </div>
    </main>
  );
}
