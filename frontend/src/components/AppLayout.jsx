import { useState, useRef, useEffect } from 'react';
import ChatInterface from './ChatInterface';
import NewsTicker from './NewsTicker';

// Helper: fire a chat query by injecting into the chat input
function sendChatQuery(query) {
  const input = document.getElementById('chat-input');
  if (!input) return;
  // Set value via React's native input setter so state updates
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  nativeInputValueSetter.call(input, query);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  // Small delay so React registers the state, then submit
  setTimeout(() => {
    const sendBtn = document.querySelector('.send-btn');
    if (sendBtn) sendBtn.click();
  }, 50);
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
}) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [activeNav, setActiveNav] = useState('assistant');

  const profileDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleNavClick = (e, nav, query) => {
    e.preventDefault();
    setActiveNav(nav);
    sendChatQuery(query);
  };

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
    ? { label: 'Pro', color: 'text-trophy-gold border-trophy-gold/30 bg-trophy-gold/10' }
    : userProfile.plan === 'guest'
    ? { label: 'Guest', color: 'text-on-surface-variant border-outline-variant/30 bg-surface-container' }
    : { label: 'Free', color: 'text-grass-green border-grass-green/30 bg-grass-green/10' };

  const navLinks = [
    { id: 'assistant', label: 'AI Assistant', query: null },
    { id: 'live',      label: 'Live Scores',  query: 'Show me all live cricket match scores right now' },
    { id: 'fixtures',  label: 'Fixtures',     query: 'Show me upcoming cricket fixtures and schedules' },
    { id: 'news',      label: 'News',         query: 'What is the latest cricket news today?' },
  ];

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
            {navLinks.map(({ id, label, query }) => (
              <a
                key={id}
                href="#"
                className={`transition-colors duration-200 font-body-md text-body-md cursor-pointer ${
                  activeNav === id
                    ? 'text-grass-green font-bold border-b-2 border-grass-green pb-1'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveNav(id);
                  if (query) sendChatQuery(query);
                }}
              >
                {label}
              </a>
            ))}
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

            {/* Notifications */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                className={`material-symbols-outlined transition-colors ${notifDropdownOpen ? 'text-grass-green' : 'text-on-surface-variant hover:text-grass-green'}`}
                onClick={() => setNotifDropdownOpen((prev) => !prev)}
                title="Notifications"
              >
                notifications
              </button>
              {notifDropdownOpen && (
                <div className="absolute right-0 top-full mt-xs w-72 bg-surface-container border border-outline-variant/30 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-md py-sm border-b border-outline-variant/30 flex items-center justify-between">
                    <span className="text-sm font-bold text-on-surface">Notifications</span>
                    <span className="text-[10px] text-on-surface-variant font-label-caps uppercase">0 new</span>
                  </div>
                  <div className="px-md py-lg flex flex-col items-center justify-center gap-xs text-center">
                    <span className="material-symbols-outlined text-on-surface-variant text-3xl">notifications_off</span>
                    <p className="text-xs text-on-surface-variant">No notifications yet</p>
                  </div>
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
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileDropdownOpen((prev) => !prev);
                }}
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

              {/* Dropdown Menu */}
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
                    <span className="material-symbols-outlined text-[18px]">person</span>
                    Profile
                  </button>

                  <button
                    className="w-full flex items-center gap-sm px-md py-sm text-sm text-on-surface hover:bg-surface-container-high transition-colors"
                    onClick={() => { setActiveModal('settings'); setProfileDropdownOpen(false); }}
                  >
                    <span className="material-symbols-outlined text-[18px]">settings</span>
                    Settings
                  </button>

                  {userProfile.plan !== 'pro' && (
                    <button
                      className="w-full flex items-center gap-sm px-md py-sm text-sm text-trophy-gold hover:bg-trophy-gold/10 transition-colors"
                      onClick={() => { setActiveModal('upgrade'); setProfileDropdownOpen(false); }}
                    >
                      <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                      Upgrade to Pro
                    </button>
                  )}

                  <div className="border-t border-outline-variant/30">
                    <button
                      className="w-full flex items-center gap-sm px-md py-sm text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      onClick={() => { setProfileDropdownOpen(false); onLogout(); }}
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <ChatInterface
          currentSessionId={currentSessionId}
          setCurrentSessionId={setCurrentSessionId}
          toggleSidebar={() => {}}
          onShowAlert={showSimpleAlert}
          onShowError={(type) => setErrorOverlay(type)}
          onLogout={onLogout}
        />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-surface-container border-t border-stadium-grey flex justify-around items-center px-xs py-base shadow-lg">
        <div
          className="flex flex-col items-center justify-center bg-primary-container/20 text-grass-green rounded-xl px-4 py-1 cursor-pointer"
          onClick={() => { setActiveNav('assistant'); }}
        >
          <span className="material-symbols-outlined">smart_toy</span>
          <span className="font-label-caps text-[10px]">AI Chat</span>
        </div>
        <div
          className="flex flex-col items-center justify-center text-on-surface-variant cursor-pointer"
          onClick={() => { setActiveNav('live'); sendChatQuery('Show me all live cricket match scores right now'); }}
        >
          <span className="material-symbols-outlined">sensors</span>
          <span className="font-label-caps text-[10px]">Live</span>
        </div>
        <div
          className="flex flex-col items-center justify-center text-on-surface-variant cursor-pointer"
          onClick={() => setActiveModal('settings')}
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="font-label-caps text-[10px]">Settings</span>
        </div>
        <div
          className="flex flex-col items-center justify-center text-on-surface-variant cursor-pointer"
          onClick={() => setProfileDropdownOpen(true)}
        >
          <span className="material-symbols-outlined">person</span>
          <span className="font-label-caps text-[10px]">Profile</span>
        </div>
      </nav>
    </div>
  );
}
