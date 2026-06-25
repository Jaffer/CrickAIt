import { useState, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../services/api';

export default function ProfileModal({ onClose, onLogout }) {
  const [displayName, setDisplayName] = useState(localStorage.getItem('crickait_display_name') || 'Guest User');
  const [email, setEmail] = useState('guest@crickait.com');
  const [provider, setProvider] = useState('local');
  const [plan, setPlan] = useState('free');
  const [avatar, setAvatar] = useState(localStorage.getItem('crickait_avatar') || null);
  const [isEditing, setIsEditing] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newAvatar, setNewAvatar] = useState(null);
  const fileInputRef = useRef(null);

  const predefinedAvatars = Array.from({ length: 9 }, (_, i) => `/avatars/avatar_${i + 1}.png`);

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
        setAvatar(data.avatar || null);
        setNewAvatar(data.avatar || null);
      }
    } catch (e) {
      console.error('Failed to fetch profile info', e);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    const name = newDisplayName.trim();
    if (!name) return;

    try {
      await authenticatedFetch('/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name, avatar: newAvatar })
      });
    } catch (e) {
      console.error(e);
    }

    localStorage.setItem('crickait_display_name', name);
    if (newAvatar) {
      localStorage.setItem('crickait_avatar', newAvatar);
    } else {
      localStorage.removeItem('crickait_avatar');
    }
    setDisplayName(name);
    setAvatar(newAvatar);
    setIsEditing(false);
    window.dispatchEvent(new Event('profile-updated'));
  };

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-content profile-modal-content">
        <div className="profile-cover-bar">
          <button className="close-modal cover-close-btn" onClick={onClose}>&times;</button>
          <div className="cover-title"><i className="fa-solid fa-circle-user"></i> My Profile</div>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '70vh' }}>
          <div className="profile-card enhanced-profile">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-large" style={ (isEditing ? newAvatar : avatar) ? { background: 'none' } : {} }>
                {isEditing ? (
                  newAvatar ? <img src={newAvatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : displayName.substring(0, 2).toUpperCase()
                ) : (
                  avatar ? <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : displayName.substring(0, 2).toUpperCase()
                )}
              </div>
            </div>
            <div className="profile-name-container">
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                  <div className="edit-name-form-row" style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="modern-input"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder="Enter new name"
                    />
                  </div>
                  
                  <div className="avatar-selection-area" style={{ marginTop: '10px', width: '100%' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Choose an Avatar</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 50px)', gap: '12px', justifyContent: 'center', marginBottom: '15px' }}>
                      {predefinedAvatars.map((av, idx) => (
                        <img 
                          key={idx} 
                          src={av} 
                          alt={`Avatar ${idx + 1}`} 
                          onClick={() => setNewAvatar(av)}
                          style={{ 
                            width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer', 
                            border: newAvatar === av ? '3px solid var(--accent-color)' : '2px solid transparent',
                            objectFit: 'cover', transition: 'all 0.2s'
                          }} 
                        />
                      ))}
                    </div>
                    
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      style={{ display: 'none' }} 
                    />
                    <button 
                      className="btn-secondary btn-sm" 
                      onClick={() => fileInputRef.current.click()}
                      style={{ marginBottom: '15px', width: '100%' }}
                    >
                      <i className="fa-solid fa-upload"></i> Upload from Device
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-confirm btn-sm" onClick={saveProfile}>Save Changes</button>
                    <button className="btn-secondary btn-sm" onClick={() => { setIsEditing(false); setNewAvatar(avatar); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h2>{displayName}</h2>
                  <button
                    className="edit-name-btn"
                    onClick={() => {
                      setNewDisplayName(displayName);
                      setNewAvatar(avatar);
                      setIsEditing(true);
                    }}
                    title="Edit Profile"
                  >
                    <i className="fa-solid fa-pen"></i>
                  </button>
                </>
              )}
            </div>
            {!isEditing && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
