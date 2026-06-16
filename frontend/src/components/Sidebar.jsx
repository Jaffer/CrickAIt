import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../services/api';
import LiveMatches from './LiveMatches';
import UserProfilePopover from './UserProfilePopover';

export default function Sidebar({
  isOpen,
  setIsOpen,
  currentSessionId,
  setCurrentSessionId,
  userProfile,
  onLogout,
  onTogglePopover,
  onOpenModal,
  onSelectMatch,
  onConfirmAlert,
  onShowAlert,
  popoverOpen,
  setPopoverOpen
}) {
  const [sessions, setSessions] = useState([]);
  const [activeDropdownSid, setActiveDropdownSid] = useState(null);

  useEffect(() => {
    loadSessions();
    // Refresh sessions when a chat is sent/saved
    window.addEventListener('chat-sessions-changed', loadSessions);
    return () => window.removeEventListener('chat-sessions-changed', loadSessions);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdownSid(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const loadSessions = async () => {
    try {
      const [sessionsRes, namesRes] = await Promise.all([
        authenticatedFetch('/sessions'),
        authenticatedFetch('/session-names')
      ]);
      if (sessionsRes.ok && namesRes.ok) {
        const sessionsData = await sessionsRes.json();
        const namesData = await namesRes.json();

        const s = (sessionsData.sessions || []).map(id => ({
          id,
          name: namesData[id] || `Chat ${id.substring(0, 4)}`
        })).reverse();

        setSessions(s);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenameSession = async (sid, oldName, e) => {
    e.stopPropagation();
    setActiveDropdownSid(null);

    onConfirmAlert({
      title: 'Rename Chat',
      message: 'Enter new name for this chat:',
      isPrompt: true,
      defaultValue: oldName,
      onConfirm: async (newName) => {
        if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
          try {
            const res = await authenticatedFetch(`/rename/${sid}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ new_name: newName.trim() })
            });
            if (res.ok) {
              loadSessions();
              // Update title if it's the current session
              if (currentSessionId === sid) {
                window.dispatchEvent(new CustomEvent('chat-title-changed', { detail: newName.trim() }));
              }
            } else {
              onShowAlert({ title: 'Error', message: 'Failed to rename chat.' });
            }
          } catch (err) {
            console.error(err);
            onShowAlert({ title: 'Error', message: 'Network error renaming chat.' });
          }
        }
      }
    });
  };

  const handleDeleteSession = async (sid, e) => {
    e.stopPropagation();
    setActiveDropdownSid(null);

    onConfirmAlert({
      title: 'Delete Chat',
      message: 'Are you sure you want to delete this chat?',
      onConfirm: async () => {
        try {
          const res = await authenticatedFetch(`/clear/${sid}`, { method: 'DELETE' });
          if (res.ok) {
            if (currentSessionId === sid) {
              setCurrentSessionId(null);
            }
            loadSessions();
          } else {
            onShowAlert({ title: 'Error', message: 'Failed to delete chat.' });
          }
        } catch (err) {
          console.error(err);
          onShowAlert({ title: 'Error', message: 'Network error deleting chat.' });
        }
      }
    });
  };

  return (
    <nav className={`sidebar ${isOpen ? '' : 'closed'}`}>
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={() => setCurrentSessionId(null)}>
          <img src="/favicon.png" alt="logo" className="btn-logo" /> New chat
        </button>
        <div className="sidebar-actions">
          <button className="icon-btn" onClick={() => setIsOpen(false)}>
            <i className="fa-solid fa-window-restore"></i>
          </button>
        </div>
      </div>

      <div className="sidebar-content">
        <div className="chat-list">
          {sessions.map(s => (
            <div
              key={s.id}
              className={`chat-item ${s.id === currentSessionId ? 'active' : ''}`}
              onClick={() => {
                setCurrentSessionId(s.id);
                if (window.innerWidth <= 768) setIsOpen(false);
              }}
            >
              <div className="chat-item-text">🏏 {s.name}</div>
              <div className="chat-item-actions">
                <div className={`dropdown ${activeDropdownSid === s.id ? 'show' : ''}`}>
                  <button
                    className="icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownSid(activeDropdownSid === s.id ? null : s.id);
                    }}
                    title="Options"
                  >
                    <i className="fa-solid fa-ellipsis"></i>
                  </button>
                  {activeDropdownSid === s.id && (
                    <div className="dropdown-content" style={{ display: 'block' }}>
                      <button onClick={(e) => handleRenameSession(s.id, s.name, e)}>
                        <i className="fa-solid fa-pen" style={{ width: '16px' }}></i> Rename
                      </button>
                      <button onClick={(e) => handleDeleteSession(s.id, e)} style={{ color: '#ff4b4b' }}>
                        <i className="fa-regular fa-trash-can" style={{ width: '16px' }}></i> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live Matches Sidebar Section */}
        <LiveMatches onSelectMatch={onSelectMatch} />
      </div>

      <div className="sidebar-footer">
        <div className="user-profile-trigger" onClick={(e) => { e.stopPropagation(); onTogglePopover(); }}>
          <div className="user-avatar">
            {userProfile.displayName ? userProfile.displayName.substring(0, 2).toUpperCase() : '?'}
          </div>
          <div className="user-info-text">
            <div className="user-display-name">{userProfile.displayName || 'Guest User'}</div>
            <div className="user-role" style={{ textTransform: 'capitalize' }}>
              {userProfile.plan || 'Free'} User
            </div>
          </div>
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onTogglePopover(); }}>
            <i className="fa-solid fa-ellipsis-h"></i>
          </button>
        </div>
        <UserProfilePopover
          isOpen={popoverOpen}
          displayName={userProfile.displayName}
          email={userProfile.email}
          plan={userProfile.plan}
          username={userProfile.username}
          onClose={() => setPopoverOpen(false)}
          onOpenModal={onOpenModal}
          onLogout={onLogout}
        />
      </div>
    </nav>
  );
}
