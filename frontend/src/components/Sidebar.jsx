import { useState, useEffect, useRef } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedSessionIds, setPinnedSessionIds] = useState(() => {
    try {
      const saved = localStorage.getItem('crickait_pinned_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const searchInputRef = useRef(null);

  useEffect(() => {
    loadSessions();
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

  const togglePinSession = (sid, e) => {
    if (e) e.stopPropagation();
    setActiveDropdownSid(null);
    setPinnedSessionIds(prev => {
      const next = prev.includes(sid) ? prev.filter(id => id !== sid) : [sid, ...prev];
      try {
        localStorage.setItem('crickait_pinned_sessions', JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
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
            setPinnedSessionIds(prev => {
              const next = prev.filter(id => id !== sid);
              try {
                localStorage.setItem('crickait_pinned_sessions', JSON.stringify(next));
              } catch (err) {
                console.error(err);
              }
              return next;
            });
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

  const userInitials = userProfile?.displayName
    ? userProfile.displayName.substring(0, 2).toUpperCase()
    : (userProfile?.username ? userProfile.username.substring(0, 2).toUpperCase() : '?');

  const query = searchQuery.trim().toLowerCase();
  const filteredSessions = query
    ? sessions.filter(s => s.name.toLowerCase().includes(query))
    : sessions;

  const pinnedSessions = filteredSessions.filter(s => pinnedSessionIds.includes(s.id));
  const recentSessions = filteredSessions.filter(s => !pinnedSessionIds.includes(s.id));

  const renderChatItem = (s, isPinned = false) => {
    const isActive = s.id === currentSessionId;
    return (
      <div
        key={s.id}
        className={`chat-item group relative flex items-center justify-between px-3 py-2 my-0.5 rounded-lg text-sm cursor-pointer transition-all ${
          isActive
            ? 'bg-surface-container-high text-grass-green font-medium border-l-2 border-grass-green'
            : 'text-on-surface hover:bg-surface-container-high/60'
        }`}
        onClick={() => {
          setCurrentSessionId(s.id);
          if (window.innerWidth <= 768) setIsOpen(false);
        }}
        title={s.name}
      >
        <div className="chat-item-text flex items-center gap-2 min-w-0 flex-1 pr-1">
          <span className={`material-symbols-outlined text-[16px] flex-shrink-0 ${
            isPinned ? 'text-trophy-gold' : isActive ? 'text-grass-green' : 'text-on-surface-variant'
          }`}>
            {isPinned ? 'push_pin' : 'chat_bubble_outline'}
          </span>
          <span className="truncate">{s.name}</span>
        </div>

        {/* Hover Actions (Pin + Dropdown Menu) */}
        <div className="chat-item-actions flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className={`p-1 rounded hover:bg-surface-container text-on-surface-variant transition-colors ${
              isPinned ? 'text-trophy-gold hover:text-trophy-gold' : 'hover:text-on-surface'
            }`}
            onClick={(e) => togglePinSession(s.id, e)}
            title={isPinned ? "Unpin chat" : "Pin chat"}
            aria-label={isPinned ? "Unpin chat" : "Pin chat"}
          >
            <span className="material-symbols-outlined text-[14px]">
              {isPinned ? 'keep_off' : 'push_pin'}
            </span>
          </button>

          <div className={`dropdown ${activeDropdownSid === s.id ? 'show' : ''}`}>
            <button
              className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownSid(activeDropdownSid === s.id ? null : s.id);
              }}
              title="More options"
              aria-label="More options"
            >
              <span className="material-symbols-outlined text-[14px]">more_horiz</span>
            </button>
            {activeDropdownSid === s.id && (
              <div className="dropdown-content" style={{ display: 'block' }}>
                <button onClick={(e) => togglePinSession(s.id, e)}>
                  <span className="material-symbols-outlined text-[14px] mr-2 align-middle">
                    {isPinned ? 'keep_off' : 'push_pin'}
                  </span>
                  {isPinned ? 'Unpin chat' : 'Pin to top'}
                </button>
                <button onClick={(e) => handleRenameSession(s.id, s.name, e)}>
                  <span className="material-symbols-outlined text-[14px] mr-2 align-middle">edit</span>
                  Rename
                </button>
                <button onClick={(e) => handleDeleteSession(s.id, e)} style={{ color: '#ff4b4b' }}>
                  <span className="material-symbols-outlined text-[14px] mr-2 align-middle">delete</span>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <nav className={`sidebar ${isOpen ? '' : 'rail-collapsed closed'}`}>
      {!isOpen ? (
        /* ── Collapsed Slim Rail (ChatGPT Style) ── */
        <div className="flex flex-col items-center justify-between h-full py-3 px-1 w-full select-none">
          {/* Top Rail Controls */}
          <div className="flex flex-col items-center gap-2 w-full">
            {/* Logo / Expand Toggle Button */}
            <button
              onClick={() => setIsOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant hover:text-grass-green transition-colors group relative"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <img src="/favicon.png" alt="CrickAIt" className="w-7 h-7 rounded-lg group-hover:scale-105 transition-transform" />
            </button>

            {/* New Chat Icon Button */}
            <button
              onClick={() => {
                setCurrentSessionId(null);
                const input = document.getElementById('chat-input');
                if (input) input.focus();
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-grass-green hover:bg-surface-container-high transition-colors"
              title="New chat"
              aria-label="New chat"
            >
              <span className="material-symbols-outlined text-[20px]">edit_square</span>
            </button>

            {/* Search Chats Icon Button */}
            <button
              onClick={() => {
                setIsOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 200);
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-grass-green hover:bg-surface-container-high transition-colors"
              title="Search chats"
              aria-label="Search chats"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>

            {/* Pinned Chats Icon Button */}
            <button
              onClick={() => setIsOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-trophy-gold hover:bg-surface-container-high transition-colors relative"
              title="Pinned chats"
              aria-label="Pinned chats"
            >
              <span className="material-symbols-outlined text-[20px]">push_pin</span>
              {pinnedSessionIds.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-trophy-gold" />
              )}
            </button>

            {/* Recent Chats Icon Button */}
            <button
              onClick={() => setIsOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-grass-green hover:bg-surface-container-high transition-colors"
              title="Recent chats"
              aria-label="Recent chats"
            >
              <span className="material-symbols-outlined text-[20px]">chat_bubble_outline</span>
            </button>
          </div>

          {/* Bottom Rail: User Avatar */}
          <div className="flex flex-col items-center gap-2 w-full">
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePopover(); }}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-grass-green/20 border border-grass-green/30 text-grass-green text-xs font-bold hover:ring-2 hover:ring-grass-green/50 transition-all overflow-hidden"
              title={userProfile?.displayName || userProfile?.username || 'User Profile'}
            >
              {userProfile?.avatar ? (
                <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ── Full Expanded Sidebar ── */
        <div className="flex flex-col h-full w-full">
          {/* Header Row */}
          <div className="sidebar-header flex items-center justify-between p-3 border-b border-stadium-grey/40">
            <div
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => {
                setCurrentSessionId(null);
                if (window.innerWidth <= 768) setIsOpen(false);
              }}
            >
              <img src="/favicon.png" alt="logo" className="w-6 h-6 rounded-md" />
              <span className="font-extrabold text-sm text-grass-green tracking-tight font-headline-md">CrickAIt</span>
            </div>

            {/* Single Sidebar Collapse Toggle Button */}
            <button
              className="icon-btn p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              onClick={() => setIsOpen(false)}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">dock_to_left</span>
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3 pb-2">
            <button
              className="new-chat-btn w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-outline-variant/30 hover:border-grass-green/50 hover:bg-surface-container-high transition-all text-on-surface text-sm font-semibold group shadow-sm"
              onClick={() => {
                setCurrentSessionId(null);
                setSearchQuery('');
                if (window.innerWidth <= 768) setIsOpen(false);
                const input = document.getElementById('chat-input');
                if (input) input.focus();
              }}
              title="New Chat"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-grass-green group-hover:scale-110 transition-transform">add</span>
                <span>New chat</span>
              </div>
              <span className="text-[10px] text-on-surface-variant/60 font-mono hidden group-hover:inline">Ctrl+K</span>
            </button>
          </div>

          {/* Search Chats Input */}
          <div className="px-3 pb-2">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant absolute left-2.5 pointer-events-none">
                search
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg bg-surface-container-high/40 border border-outline-variant/20 focus:border-grass-green/50 focus:bg-surface-container outline-none text-on-surface placeholder-on-surface-variant/60 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-on-surface-variant hover:text-on-surface text-xs"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Chat List Scroll Area */}
          <div className="sidebar-content flex-1 overflow-y-auto px-2 py-1">
            {/* Pinned Chats Section */}
            {pinnedSessions.length > 0 && (
              <div className="mb-3">
                <div className="section-title text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px] text-trophy-gold">push_pin</span>
                  <span>Pinned</span>
                </div>
                <div className="chat-list">
                  {pinnedSessions.map(s => renderChatItem(s, true))}
                </div>
              </div>
            )}

            {/* Recent Chats Section */}
            <div className="mb-2">
              <div className="section-title text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                <span>Recent Chats</span>
                {recentSessions.length > 0 && (
                  <span className="text-[10px] font-normal text-on-surface-variant/60">
                    {recentSessions.length}
                  </span>
                )}
              </div>

              {filteredSessions.length === 0 ? (
                <div className="py-8 px-3 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-2xl text-on-surface-variant/30">
                    {searchQuery ? 'search_off' : 'chat_bubble_outline'}
                  </span>
                  <p>{searchQuery ? `No chats match "${searchQuery}"` : 'No chat history yet'}</p>
                  {!searchQuery && (
                    <p className="text-[10px] text-on-surface-variant/50">Start chatting to see conversations here</p>
                  )}
                </div>
              ) : (
                <div className="chat-list">
                  {recentSessions.map(s => renderChatItem(s, false))}
                </div>
              )}
            </div>

            {/* Live Matches Widget */}
            <div className="mt-4 pt-2 border-t border-outline-variant/20">
              <LiveMatches onSelectMatch={onSelectMatch} />
            </div>
          </div>

          {/* Footer User Profile Card */}
          <div className="sidebar-footer p-2.5 border-t border-stadium-grey/40">
            <div
              className="user-profile-trigger flex items-center justify-between p-2 rounded-xl hover:bg-surface-container-high cursor-pointer transition-colors"
              onClick={(e) => { e.stopPropagation(); onTogglePopover(); }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="user-avatar w-8 h-8 rounded-full bg-grass-green/20 border border-grass-green/30 flex items-center justify-center text-grass-green text-xs font-bold flex-shrink-0 overflow-hidden">
                  {userProfile?.avatar ? (
                    <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    userInitials
                  )}
                </div>
                <div className="user-info-text min-w-0">
                  <div className="user-display-name text-xs font-bold text-on-surface truncate">
                    {userProfile?.displayName || userProfile?.username || 'User'}
                  </div>
                  <div className="user-role text-[10px] text-on-surface-variant capitalize">
                    {userProfile?.plan || 'Free'} Plan
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">more_horiz</span>
            </div>

            <UserProfilePopover
              isOpen={popoverOpen}
              displayName={userProfile?.displayName}
              email={userProfile?.email}
              plan={userProfile?.plan}
              username={userProfile?.username}
              avatar={userProfile?.avatar}
              onClose={() => setPopoverOpen(false)}
              onOpenModal={onOpenModal}
              onLogout={onLogout}
              onSignup={onSignup}
            />
          </div>
        </div>
      )}
    </nav>
  );
}
