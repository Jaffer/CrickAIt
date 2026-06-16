import { useState } from 'react';

export default function HelpModal({ onClose, onSelectPrompt, onOpenBugReport }) {
  const [openFAQIndex, setOpenFAQIndex] = useState(null);

  const toggleFAQ = (idx) => {
    setOpenFAQIndex(openFAQIndex === idx ? null : idx);
  };

  const faqs = [
    {
      q: 'What is CrickAIt?',
      a: 'CrickAIt is your AI-powered companion for cricket scores, news, trivia, and statistics. It automatically tracks your favorite teams/players based on your conversations.'
    },
    {
      q: 'How do I add favorite teams/players?',
      a: 'Simply chat with the assistant! E.g. say "I support India" or "I love Virat Kohli", and it will silently save them to your Global Profile.'
    },
    {
      q: 'How does Pro Plan work?',
      a: 'Pro Plan unlocks our 70B expert LLM engine, giving you highly detailed tactics, stats tables, and matches predictions.'
    }
  ];

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-content help-modal-content">
        <div className="modal-header">
          <h3><i className="fa-solid fa-circle-question"></i> Help & Resources</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="quick-prompts-section">
            <h4>Try These Prompts</h4>
            <div className="chips-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              {[
                { label: 'Live Scores', prompt: 'What are the live cricket scores right now?' },
                { label: 'Latest News', prompt: 'Tell me the latest cricket news.' },
                { label: 'LBW Rule', prompt: 'Explain the LBW rule in simple terms.' },
                { label: 'Virat Stats', prompt: 'Show me Virat Kohli career stats.' }
              ].map(item => (
                <div
                  key={item.label}
                  className="prompt-chip"
                  onClick={() => {
                    onSelectPrompt(item.prompt);
                    onClose();
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="faq-accordion" style={{ marginTop: '20px' }}>
            <h4>Frequently Asked Questions</h4>
            {faqs.map((faq, idx) => (
              <div key={idx} className="accordion-item" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginTop: '8px' }}>
                <button
                  className={`accordion-header ${openFAQIndex === idx ? 'active' : ''}`}
                  onClick={() => toggleFAQ(idx)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', background: 'none', border: 'none', color: 'var(--text)', textAlign: 'left', padding: '8px 0', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  {faq.q}
                  <i className={`fa-solid ${openFAQIndex === idx ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                </button>
                <div
                  className="accordion-content"
                  style={{
                    maxHeight: openFAQIndex === idx ? '100px' : '0px',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                    lineHeight: 1.4
                  }}
                >
                  <p style={{ margin: '4px 0' }}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="help-footer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div className="shortcuts-box" style={{ background: 'var(--surface-light)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}><i className="fa-regular fa-keyboard"></i> Shortcuts</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', lineHeight: 1.8 }}>
                <li><kbd style={{ background: 'var(--border-color)', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>Enter</kbd> Send msg</li>
                <li><kbd style={{ background: 'var(--border-color)', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>Shift</kbd>+<kbd style={{ background: 'var(--border-color)', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>Enter</kbd> New line</li>
                <li><kbd style={{ background: 'var(--border-color)', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>Esc</kbd> Close popups</li>
              </ul>
            </div>
            <div className="bug-box" style={{ background: 'var(--surface-light)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem' }}><i className="fa-solid fa-bug"></i> Found a bug?</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Help us improve CrickAIt.</p>
              <button className="btn-secondary btn-sm" onClick={onOpenBugReport} style={{ marginTop: '8px', cursor: 'pointer' }}>
                <i className="fa-solid fa-envelope"></i> Report Bug
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
