import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../services/api';

export default function ProfileModal({ onClose, onLogout }) {
  const [displayName, setDisplayName] = useState(localStorage.getItem('crickait_display_name') || 'Guest User');
  const [email, setEmail] = useState('guest@crickait.com');
  const [provider, setProvider] = useState('local');
  const [plan, setPlan] = useState('free');
  const [isEditing, setIsEditing] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authenticatedFetch('/auth/me');
      if (res.ok) {
        const data = await res.json();
        setDisplayName(data.display_name || data.username);
        setEmail(data.email);
        setPlan(data.plan || 'free');
        setProvider(data.email === 'guest@crickait.com' ? 'local' : (data.email.includes('gmail.com') ? 'Google' : 'local'));
      }
    } catch (e) {
      console.error('Failed to fetch profile info', e);
    }
  };

  const saveDisplayName = async () => {
    const name = newDisplayName.trim();
    if (!name) return;

    try {
      // We perform the simulated PATCH call to backend (will fail/noop but we do it anyway per legacy code)
      await authenticatedFetch('/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name })
      });
    } catch (e) {
      console.error(e);
    }

    localStorage.setItem('crickait_display_name', name);
    setDisplayName(name);
    setIsEditing(false);
    // Dispatch event to update other UI components
    window.dispatchEvent(new Event('profile-updated'));
  };

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-content profile-modal-content">
        <div className="profile-cover-bar">
          <button className="close-modal cover-close-btn" onClick={onClose}>&times;</button>
          <div className="cover-title"><i className="fa-solid fa-circle-user"></i> My Profile</div>
        </div>
        <div className="modal-body">
          <div className="profile-card enhanced-profile">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-large">
                {displayName.substring(0, 2).toUpperCase()}
              </div>
            </div>
            <div className="profile-name-container">
              {isEditing ? (
                <div className="edit-name-form-row" style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="modern-input"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Enter new name"
                  />
                  <button className="btn-confirm btn-sm" onClick={saveDisplayName}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              ) : (
                <>
                  <h2>{displayName}</h2>
                  <button
                    className="edit-name-btn"
                    onClick={() => {
                      setNewDisplayName(displayName);
                      setIsEditing(true);
                    }}
                    title="Edit Name"
                  >
                    <i className="fa-solid fa-pen"></i>
                  </button>
                </>
              )}
            </div>
            <p className="profile-email-text">{email}</p>

            <div className="profile-meta-grid modern-grid">
              <div className="meta-item">
                <i className="fa-solid fa-calendar-days meta-icon"></i>
                <span className="meta-label">Joined</span>
                <span className="meta-value">June 2026</span>
              </div>
              <div className="meta-item">
                <i className="fa-brands fa-google meta-icon"></i>
                <span className="meta-label">Provider</span>
                <span className="meta-value" style={{ textTransform: 'capitalize' }}>{provider}</span>
              </div>
              <div className="meta-item status-item">
                <i className="fa-solid fa-crown meta-icon"></i>
                <span className="meta-label">Status</span>
                <span className="meta-value badge-status" style={{ textTransform: 'capitalize' }}>{plan} User</span>
              </div>
            </div>

            <button className="auth-submit-btn logout-btn" onClick={onLogout}>
              <i className="fa-solid fa-right-from-bracket"></i> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
