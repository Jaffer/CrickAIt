import { useState } from 'react';

export default function CustomAlert({ title, message, isPrompt, defaultValue = '', onConfirm, onCancel }) {
  const [inputValue, setInputValue] = useState(defaultValue);

  return (
    <div className="modal" style={{ display: 'flex', zIndex: 1100, background: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-content" style={{ maxWidth: '400px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <div className="modal-header" style={{ borderBottom: 'none', padding: '20px 20px 10px 20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-circle-info" style={{ color: 'var(--accent-color)' }}></i>
            <span>{title}</span>
          </h3>
        </div>
        <div className="modal-body" style={{ padding: '10px 20px 20px 20px', fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text)' }}>
          <p style={{ margin: '0 0 10px 0' }}>{message}</p>
          {isPrompt && (
            <input
              type="text"
              className="modern-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{ width: '100%', marginTop: '8px' }}
              autoFocus
            />
          )}
        </div>
        <div className="modal-footer" style={{ padding: '15px 20px 20px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: 'none' }}>
          {onCancel && (
            <button
              className="btn-secondary"
              onClick={onCancel}
              style={{ padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          )}
          <button
            className="auth-submit-btn"
            onClick={() => onConfirm(isPrompt ? inputValue : true)}
            style={{ margin: 0, width: 'auto', padding: '8px 20px', borderRadius: '20px', fontSize: '0.9rem' }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
