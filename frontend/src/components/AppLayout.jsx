import { useState, useRef, useEffect, useCallback } from 'react';
import ChatInterface from './ChatInterface';
import NewsTicker from './NewsTicker';
import LiveMatches from './LiveMatches';
import { authenticatedFetch } from '../services/api';

// Helper: fire a chat query using custom event listener in ChatInterface
function sendChatQuery(query) {
  window.dispatchEvent(new CustomEvent('send-chat-message', { detail: query }));
}

// Icon per notification type
const NOTIF_ICONS = {
  info:   { icon: 'info',            color: 'text-sky-400',       bg: 'bg-sky-400/10'   },
  update: { icon: 'new_releases',    color: 'text-grass-green',   bg: 'bg-grass-green/10' },
  alert:  { icon: 'warning',         color: 'text-amber-400',     bg: 'bg-amber-400/10' },
  promo:  { icon: 'workspace_premium', color: 'text-trophy-gold', bg: 'bg-trophy-gold/10' },
};

function timeAgo(isoString) {
  const diff = (Date.now() - new Date(isoString + 'Z').getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AppLayout({
  userProfile,
  onLogout,
  showSimpleAlert,
  showConfirmAlert,
  currentSessionId,
  setCurrentSessionId,
  setActiveModal,
  setErrorOverlay,
  setSelectedMatchId,
}) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen]     = useState(false);
  const [liveScoresOpen, setLiveScoresOpen]           = useState(false);
  const [searchValue, setSearchValue]                 = useState('');
  const [activeNav, setActiveNav]                     = useState('assistant');
  const [notifications, setNotifications]             = useState([]);
  const [unreadCount, setUnreadCount]                 = useState(0);

  const profileDropdownRef = useRef(null);
  const notifDropdownRef   = useRef(null);
  const liveScoresRef      = useRef(null);
  const mobileLiveScoresRef = useRef(null);

  // ── Fetch notifications from backend ──────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await authenticatedFetch('/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount((data.notifications || []).length);
      }
    } catch (_) { /* silent — don't interrupt UX */ }
  }, []);

  // Poll every 60 seconds + on mount
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // ── Mark all visible as read when dropdown opens ──────────────────
  const markAllRead = useCallback(async (notifs) => {
    if (!notifs.length) return;
    const ids = notifs.map((n) => n.id);
    try {
      await authenticatedFetch('/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      setUnreadCount(0);
    } catch (_) { /* silent */ }
  }, []);

  const openNotifDropdown = () => {
    setNotifDropdownOpen(true);
    markAllRead(notifications);
  };

  // ── Close dropdowns on outside click ─────────────────────────────
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target))
        setProfileDropdownOpen(false);
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target))
        setNotifDropdownOpen(false);
      if (liveScoresRef.current && !liveScoresRef.current.contains(e.target))
        setLiveScoresOpen(false);
      if (mobileLiveScoresRef.current && mobileLiveScoresRef.current === e.target)
        setLiveScoresOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    setSearchValue('');
    sendChatQuery(q);
  };

  const userInitials = userProfile.displayName
    ? userProfile.displayName.substring(0, 2).toUpperCase()
    : (userProfile.username ? userProfile.username.substring(0, 2).toUpperCase() : '?');

  const planBadge = userProfile.plan === 'pro'
    ? { label: 'Pro',   color: 'text-trophy-gold border-trophy-gold/30 bg-trophy-gold/10' }
    : userProfile.plan === 'guest'
    ? { label: 'Guest', color: 'text-on-surface-variant border-outline-variant/30 bg-surface-container' }
    : { label: 'Free',  color: 'text-grass-green border-grass-green/30 bg-grass-green/10' };

  return (
    <div
      className="bg-background text-on-background font-body-md flex flex-col"
      style={{ height: '100vh', overflow: 'hidden' }}
    >
      {/* News Ticker */}
      <NewsTicker />

      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-stadium-grey shadow-sm flex-shrink-0">
        <nav className="flex justify-between items-center w-full px-lg py-sm max-w-container-max mx-auto">

          {/* Logo */}
          <div className="flex items-center gap-sm">
            <img alt="CrickAlt Logo" className="w-10 h-10 rounded-lg shadow-lg" src="/favicon.png" />
            <span className="text-headline-md font-headline-md font-extrabold text-grass-green">CrickAlt</span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-md">
            <a
              href="#"
              className={`transition-colors duration-200 font-body-md text-body-md cursor-pointer ${
                activeNav === 'assistant'
                  ? 'text-grass-green font-bold border-b-2 border-grass-green pb-1'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={(e) => {
                e.preventDefault();
                setActiveNav('assistant');
              }}
            >
              AI Assistant
            </a>

            {/* Live Scores Link with dropdown */}
            <div className="relative" ref={liveScoresRef}>
              <a
                href="#"
                className={`transition-colors duration-200 font-body-md text-body-md cursor-pointer flex items-center gap-xs ${
                  liveScoresOpen || activeNav === 'live'
                    ? 'text-grass-green font-bold border-b-2 border-grass-green pb-1'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  setLiveScoresOpen((prev) => !prev);
                  setActiveNav('live');
                }}
              >
                Live Scores <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              </a>
              {liveScoresOpen && (
                <div className="absolute left-0 top-full mt-xs w-80 bg-surface-container border border-outline-variant/30 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[400px] overflow-y-auto p-sm">
                  <LiveMatches onSelectMatch={(matchId) => {
                    setSelectedMatchId(matchId);
                    setLiveScoresOpen(false);
                  }} />
                </div>
              )}
            </div>

            <a
              href="#"
              className={`transition-colors duration-200 font-body-md text-body-md cursor-pointer ${
                activeNav === 'schedule'
                  ? 'text-grass-green font-bold border-b-2 border-grass-green pb-1'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={(e) => {
                e.preventDefault();
                setActiveNav('schedule');
                sendChatQuery('Show me upcoming cricket matches and schedule');
              }}
            >
              Schedule
            </a>

            <a
              href="#"
              className={`transition-colors duration-200 font-body-md text-body-md cursor-pointer ${
                activeNav === 'news'
                  ? 'text-grass-green font-bold border-b-2 border-grass-green pb-1'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={(e) => {
                e.preventDefault();
                setActiveNav('news');
                sendChatQuery('What is the latest cricket news today?');
              }}
            >
              News
            </a>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-sm">

            {/* Search */}
            <form onSubmit={handleSearch} className="relative hidden md:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search matches..."
                className="bg-surface-container border border-outline-variant/30 rounded-full pl-9 pr-4 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-grass-green focus:ring-1 focus:ring-grass-green w-48 transition-all"
              />
            </form>

            {/* Notifications Bell */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                className={`relative material-symbols-outlined transition-colors ${notifDropdownOpen ? 'text-grass-green' : 'text-on-surface-variant hover:text-grass-green'}`}
                onClick={() => notifDropdownOpen ? setNotifDropdownOpen(false) : openNotifDropdown()}
                title="Notifications"
              >
                notifications
                {/* Unread badge */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-[3px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 top-full mt-xs w-80 bg-surface-container border border-outline-variant/30 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-md py-sm border-b border-outline-variant/30 flex items-center justify-between">
                    <span className="text-sm font-bold text-on-surface">Notifications</span>
                    <button
                      className="text-[10px] text-grass-green hover:underline font-label-caps uppercase"
                      onClick={() => fetchNotifications()}
                    >
                      Refresh
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="px-md py-lg flex flex-col items-center justify-center gap-xs text-center">
                      <span className="material-symbols-outlined text-on-surface-variant text-3xl">notifications_off</span>
                      <p className="text-xs text-on-surface-variant">No notifications yet</p>
                    </div>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto divide-y divide-outline-variant/10">
                      {notifications.map((n) => {
                        const style = NOTIF_ICONS[n.type] || NOTIF_ICONS.info;
                        return (
                          <li key={n.id} className="flex items-start gap-sm px-md py-sm hover:bg-surface-container-high transition-colors">
                            <div className={`mt-0.5 w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${style.bg}`}>
                              <span className={`material-symbols-outlined text-[16px] ${style.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                {style.icon}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-on-surface leading-snug">{n.title}</p>
                              <p className="text-[11px] text-on-surface-variant leading-snug mt-0.5">{n.message}</p>
                              <p className="text-[10px] text-on-surface-variant/60 mt-1">{timeAgo(n.created_at)}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              className="material-symbols-outlined text-on-surface-variant hover:text-grass-green transition-colors rounded-full p-1.5"
              onClick={() => setActiveModal('settings')}
              title="Settings"
            >
              settings
            </button>

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                className="flex items-center gap-xs bg-surface-container border border-outline-variant/30 rounded-full px-sm py-1 hover:border-grass-green/50 transition-all"
                onClick={(e) => { e.stopPropagation(); setProfileDropdownOpen((prev) => !prev); }}
              >
                {userProfile.avatar ? (
                  <img src={userProfile.avatar} alt="Avatar" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-grass-green/20 border border-grass-green/30 flex items-center justify-center text-grass-green text-xs font-bold">
                    {userInitials}
                  </div>
                )}
                <span className="hidden md:block text-sm font-medium text-on-surface max-w-[100px] truncate">
                  {userProfile.displayName || userProfile.username || 'User'}
                </span>
                <span className={`hidden md:block text-[10px] font-label-caps px-xs py-base border rounded-full ${planBadge.color}`}>
                  {planBadge.label}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant text-sm">expand_more</span>
              </button>

              {profileDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-xs w-56 bg-surface-container border border-outline-variant/30 rounded-xl shadow-2xl z-50 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-md py-sm border-b border-outline-variant/30">
                    <p className="text-sm font-bold text-on-surface truncate">{userProfile.displayName || userProfile.username}</p>
                    <p className="text-xs text-on-surface-variant truncate">{userProfile.email || ''}</p>
                  </div>

                  <button
                    className="w-full flex items-center gap-sm px-md py-sm text-sm text-on-surface hover:bg-surface-container-high transition-colors"
                    onClick={() => { setActiveModal('profile'); setProfileDropdownOpen(false); }}
                  >
                    <span className="material-symbols-outlined text-[18px]">person</span> Profile
                  </button>
                  <button
                    className="w-full flex items-center gap-sm px-md py-sm text-sm text-on-surface hover:bg-surface-container-high transition-colors"
                    onClick={() => { setActiveModal('settings'); setProfileDropdownOpen(false); }}
                  >
                    <span className="material-symbols-outlined text-[18px]">settings</span> Settings
                  </button>
                  {userProfile.plan !== 'pro' && (
                    <button
                      className="w-full flex items-center gap-sm px-md py-sm text-sm text-trophy-gold hover:bg-trophy-gold/10 transition-colors"
                      onClick={() => { setActiveModal('upgrade'); setProfileDropdownOpen(false); }}
                    >
                      <span className="material-symbols-outlined text-[18px]">workspace_premium</span> Upgrade to Pro
                    </button>
                  )}
                  <div className="border-t border-outline-variant/30">
                    <button
                      className="w-full flex items-center gap-sm px-md py-sm text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      onClick={() => { setProfileDropdownOpen(false); onLogout(); }}
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content — stretches ChatInterface using flex flex-col */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ChatInterface
          currentSessionId={currentSessionId}
          setCurrentSessionId={setCurrentSessionId}
          toggleSidebar={() => {}}
          onShowAlert={showSimpleAlert}
          onShowError={(type) => setErrorOverlay(type)}
          onLogout={onLogout}
        />
      </main>

      {/* Mobile Live Matches Drawer/Overlay */}
      {liveScoresOpen && (
        <div ref={mobileLiveScoresRef} className="md:hidden fixed inset-0 z-50 flex items-center justify-center p-md bg-pitch-dark/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-surface-container border border-outline-variant/30 rounded-2xl shadow-2xl p-md overflow-hidden">
            <div className="flex justify-between items-center mb-sm border-b border-outline-variant/20 pb-xs">
              <span className="font-bold text-sm text-on-surface">🔴 Live Matches</span>
              <button className="text-on-surface-variant hover:text-on-surface text-lg font-bold" onClick={() => setLiveScoresOpen(false)}>&times;</button>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              <LiveMatches onSelectMatch={(matchId) => {
                setSelectedMatchId(matchId);
                setLiveScoresOpen(false);
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-surface-container border-t border-stadium-grey flex justify-around items-center px-xs py-base shadow-lg">
        <div className="flex flex-col items-center justify-center bg-primary-container/20 text-grass-green rounded-xl px-4 py-1 cursor-pointer"
          onClick={() => setActiveNav('assistant')}>
          <span className="material-symbols-outlined">smart_toy</span>
          <span className="font-label-caps text-[10px]">AI Chat</span>
        </div>
        <div className="flex flex-col items-center justify-center text-on-surface-variant cursor-pointer relative"
          onClick={() => setLiveScoresOpen((prev) => !prev)}>
          <span className="material-symbols-outlined">sensors</span>
          <span className="font-label-caps text-[10px]">Live</span>
        </div>
        <div className="flex flex-col items-center justify-center text-on-surface-variant cursor-pointer"
          onClick={() => setActiveModal('settings')}>
          <span className="material-symbols-outlined">settings</span>
          <span className="font-label-caps text-[10px]">Settings</span>
        </div>
        <div className="flex flex-col items-center justify-center text-on-surface-variant cursor-pointer"
          onClick={() => setProfileDropdownOpen(true)}>
          <span className="material-symbols-outlined">person</span>
          <span className="font-label-caps text-[10px]">Profile</span>
        </div>
      </nav>
    </div>
  );
}
