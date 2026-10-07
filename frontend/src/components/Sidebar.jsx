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
  onSignup,
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
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdownSid(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const loadSessions = async () => {
    try {
      const [sessionsRes, namesRes] = await Promise.allSettled([
        authenticatedFetch('/sessions'),
        authenticatedFetch('/session-names')
      ]);

      let sessionIds = [];
      let namesMap = {};

      if (sessionsRes.status === 'fulfilled' && sessionsRes.value.ok) {
        const data = await sessionsRes.value.json();
        sessionIds = data.sessions || [];
      }
      if (namesRes.status === 'fulfilled' && namesRes.value.ok) {
        namesMap = await namesRes.value.json();
      }

      const s = sessionIds.map(id => ({
        id,
        name: namesMap[id] || `Chat ${id.substring(0, 8)}`
      })).reverse();

      setSessions(s);
    } catch (e) {
      console.error('Failed to load chat history:', e);
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
        <button
          className="new-chat-btn"
          onClick={() => {
            setCurrentSessionId(null);
            if (window.innerWidth <= 768) setIsOpen(false);
          }}
          title="Start a new chat"
        >
          <span className="material-symbols-outlined text-[18px] text-grass-green">add</span>
          <span>New chat</span>
        </button>
        <div className="sidebar-actions">
          <button
            className="icon-btn"
            onClick={() => setIsOpen(false)}
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">dock_to_left</span>
          </button>
        </div>
      </div>

      <div className="sidebar-content">
        <div className="section-title flex items-center justify-between">
          <span>Recent Chats</span>
          {sessions.length > 0 && (
            <span className="text-[11px] text-on-surface-variant font-medium">
              {sessions.length}
            </span>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="py-8 px-3 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-on-surface-variant/40">chat_bubble_outline</span>
            <p>No chat history yet</p>
            <p className="text-[10px] text-on-surface-variant/50">Start a new conversation to see it here</p>
          </div>
        ) : (
          <div className="chat-list">
            {sessions.map(s => (
              <div
                key={s.id}
                className={`chat-item ${s.id === currentSessionId ? 'active' : ''}`}
                onClick={() => {
                  setCurrentSessionId(s.id);
                  if (window.innerWidth <= 768) setIsOpen(false);
                }}
                title={s.name}
              >
                <div className="chat-item-text flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-grass-green flex-shrink-0">
                    chat
                  </span>
                  <span className="truncate">{s.name}</span>
                </div>
                <div className="chat-item-actions">
                  <div className={`dropdown ${activeDropdownSid === s.id ? 'show' : ''}`}>
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownSid(activeDropdownSid === s.id ? null : s.id);
                      }}
                      title="Chat options"
                    >
                      <span className="material-symbols-outlined text-[16px]">more_horiz</span>
                    </button>
                    {activeDropdownSid === s.id && (
                      <div className="dropdown-content" style={{ display: 'block' }}>
                        <button onClick={(e) => handleRenameSession(s.id, s.name, e)}>
                          <span className="material-symbols-outlined text-[14px] mr-1.5 align-middle">edit</span>
                          Rename
                        </button>
                        <button onClick={(e) => handleDeleteSession(s.id, e)} style={{ color: '#ff4b4b' }}>
                          <span className="material-symbols-outlined text-[14px] mr-1.5 align-middle">delete</span>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Live Matches Sidebar Section */}
        <LiveMatches onSelectMatch={onSelectMatch} />
      </div>

      <div className="sidebar-footer">
        <div className="user-profile-trigger" onClick={(e) => { e.stopPropagation(); onTogglePopover(); }}>
          <div className="user-avatar">
            {userProfile.avatar ? (
              <img src={userProfile.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              userProfile.displayName ? userProfile.displayName.substring(0, 2).toUpperCase() : '?'
            )}
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
          avatar={userProfile.avatar}
          onClose={() => setPopoverOpen(false)}
          onOpenModal={onOpenModal}
          onLogout={onLogout}
          onSignup={onSignup}
        />
      </div>
    </nav>
  );
}
