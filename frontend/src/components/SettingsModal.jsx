import { useState, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../services/api';

export default function SettingsModal({ onClose, onShowAlert, onConfirmAlert, onLogout, initialTab = 'profile', isInline = false }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Profile state
  const [fullName, setFullName] = useState(localStorage.getItem('crickait_full_name') || '');
  const [displayName, setDisplayName] = useState(localStorage.getItem('crickait_display_name') || '');
  const [email, setEmail] = useState('');
  const [provider, setProvider] = useState('local');
  const [plan, setPlan] = useState('free');
  const [avatar, setAvatar] = useState(localStorage.getItem('crickait_avatar') || null);
  const [bio, setBio] = useState(localStorage.getItem('crickait_bio') || '');
  
  // Profile editing
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [newFullName, setNewFullName] = useState(fullName);
  const [newDisplayName, setNewDisplayName] = useState(displayName);
  const [newAvatar, setNewAvatar] = useState(avatar);
  const [newBio, setNewBio] = useState(bio);
  const fileInputRef = useRef(null);

  // Statistics
  const [sessionsCount, setSessionsCount] = useState(0);
  const predefinedAvatars = Array.from({ length: 9 }, (_, i) => `/avatars/avatar_${i + 1}.png`);

  // Preferences & Personalization
  const [expertise, setExpertise] = useState('Standard');
  const [theme, setTheme] = useState(localStorage.getItem('crickait_theme') || 'dark');
  const [verbosity, setVerbosity] = useState(localStorage.getItem('crickait_verbosity') || '2');
  const [formats, setFormats] = useState({ T20: true, ODI: true, Test: true });
  const [rivalTeams, setRivalTeams] = useState('');
  const [pushNotifications, setPushNotifications] = useState(localStorage.getItem('crickait_push') === 'true');
  const [language, setLanguage] = useState(localStorage.getItem('crickait_lang') || 'English (UK)');

  useEffect(() => {
    fetchProfile();
    loadSessionsCount();
    loadPersonalization();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authenticatedFetch('/auth/me');
      if (res.ok) {
        const data = await res.json();
        setDisplayName(data.display_name || data.username);
        setNewDisplayName(data.display_name || data.username);
        const nameParts = (data.display_name || data.username).split('_');
        const defaultFullName = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
        setFullName(data.full_name || defaultFullName);
        setNewFullName(data.full_name || defaultFullName);
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

  const loadSessionsCount = async () => {
    try {
      const res = await authenticatedFetch('/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessionsCount((data.sessions || []).length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadPersonalization = async () => {
    try {
      const res = await authenticatedFetch('/profile');
      if (res.ok) {
        const profile = await res.json();
        if (profile.expertise_level) setExpertise(profile.expertise_level);
        if (profile.preferred_format) {
          setFormats({
            T20: profile.preferred_format.includes('T20'),
            ODI: profile.preferred_format.includes('ODI'),
            Test: profile.preferred_format.includes('Test')
          });
        }
        if (profile.rival_teams) {
          setRivalTeams(profile.rival_teams.join(', '));
        }
      }
    } catch (e) {
      console.error(e);
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
      localStorage.setItem('crickait_display_name', name);
      localStorage.setItem('crickait_full_name', newFullName);
      if (newAvatar) {
        localStorage.setItem('crickait_avatar', newAvatar);
      } else {
        localStorage.removeItem('crickait_avatar');
      }
      localStorage.setItem('crickait_bio', newBio);
      setDisplayName(name);
      setFullName(newFullName);
      setAvatar(newAvatar);
      setBio(newBio);
      onShowAlert({ title: 'Success', message: 'Profile updated successfully!' });
      window.dispatchEvent(new Event('profile-updated'));
    } catch (e) {
      console.error(e);
      onShowAlert({ title: 'Error', message: 'Failed to update profile.' });
    }
  };

  const applyTheme = (themeValue) => {
    const root = document.documentElement;
    if (themeValue === 'green') {
      root.style.setProperty('--bg-color', '#0a1a12');
      root.style.setProperty('--surface', '#132c1d');
      root.style.setProperty('--surface-light', '#1e422c');
      root.style.setProperty('--accent', '#00d26a');
      root.style.setProperty('--text', '#f1f1f1');
      root.style.setProperty('--text-muted', '#a0aab2');
    } else if (themeValue === 'light') {
      root.style.setProperty('--bg-color', '#f5f7fa');
      root.style.setProperty('--surface', '#ffffff');
      root.style.setProperty('--surface-light', '#eef2f5');
      root.style.setProperty('--text', '#2d3436');
      root.style.setProperty('--text-muted', '#636e72');
      root.style.setProperty('--accent', '#00b894');
    } else {
      // Default Dark
      root.style.setProperty('--bg-color', '#0f1115');
      root.style.setProperty('--surface', '#1a1d24');
      root.style.setProperty('--surface-light', '#252932');
      root.style.setProperty('--text', '#f1f1f1');
      root.style.setProperty('--text-muted', '#a0aab2');
      root.style.setProperty('--accent', '#10a37f');
    }
    localStorage.setItem('crickait_theme', themeValue);
  };

  const savePreferences = async (e) => {
    e.preventDefault();
    const formatsList = Object.keys(formats).filter(k => formats[k]);
    const rivals = rivalTeams ? rivalTeams.split(',').map(s => s.trim()).filter(Boolean) : [];

    localStorage.setItem('crickait_verbosity', verbosity);
    localStorage.setItem('crickait_push', pushNotifications.toString());
    localStorage.setItem('crickait_lang', language);
    applyTheme(theme);

    try {
      const res = await authenticatedFetch('/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertise_level: expertise,
          preferred_format: formatsList,
          rival_teams: rivals
        })
      });

      if (res.ok) {
        onShowAlert({ title: 'Success', message: 'Preferences saved successfully!' });
      } else {
        onShowAlert({ title: 'Error', message: 'Failed to save preferences.' });
      }
    } catch (err) {
      console.error(err);
      onShowAlert({ title: 'Error', message: 'Error saving preferences.' });
    }
  };

  // Chat Data Management Actions
  const handleClearAllChats = async () => {
    onConfirmAlert({
      title: 'Clear Chat History',
      message: 'Delete ALL your chat history? This cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await authenticatedFetch('/sessions/clear-all', { method: 'DELETE' });
          if (res && res.ok) {
            onShowAlert({ title: 'Notification', message: 'Chat history cleared successfully.' });
            window.location.reload();
          } else {
            onShowAlert({ title: 'Notification', message: 'Could not clear sessions. Please try again.' });
          }
        } catch (e) {
          window.location.reload();
        }
      }
    });
  };

  const handleExportChats = () => {
    const messageElements = document.querySelectorAll('.message');
    if (!messageElements.length) {
      onShowAlert({ title: 'Notification', message: 'No chat history to export.' });
      return;
    }
    let text = `CrickAIt Chat Export\n${'='.repeat(40)}\n\n`;
    messageElements.forEach(m => {
      const isUser = m.classList.contains('user');
      const content = m.querySelector('.message-content');
      text += `${isUser ? 'You' : 'CrickAIt'}: ${content ? content.innerText.trim() : ''}\n\n`;
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `crickait-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const handleClearFavoritesProfile = async () => {
    onConfirmAlert({
      title: 'Reset Favorites',
      message: 'Reset your extracted cricket profile favorites?',
      onConfirm: async () => {
        try {
          const res = await authenticatedFetch('/profile/clear', { method: 'DELETE' });
          if (res.ok) {
            onShowAlert({ title: 'Notification', message: 'Profile reset successfully.' });
            onClose();
            window.dispatchEvent(new Event('profile-updated'));
          } else {
            onShowAlert({ title: 'Notification', message: 'Failed to reset profile.' });
          }
        } catch (e) {
          console.error(e);
          onShowAlert({ title: 'Notification', message: 'Error resetting profile.' });
        }
      }
    });
  };

  const handleDeleteAccount = async () => {
    onConfirmAlert({
      title: 'Delete Account',
      message: 'Are you absolutely sure you want to delete your account? This will permanently erase all your chat history and preferences. This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await authenticatedFetch('/auth/delete-account', { method: 'DELETE' });
          if (res.ok) {
            onShowAlert({ title: 'Notification', message: 'Your account has been successfully deleted.' });
            onLogout();
          } else {
            onShowAlert({ title: 'Notification', message: 'Failed to delete account.' });
          }
        } catch (e) {
          console.error(e);
          onShowAlert({ title: 'Notification', message: 'Error deleting account.' });
        }
      }
    });
  };

  const settingsLayout = (
    <div className="w-full max-w-5xl flex flex-col gap-md">
      {/* Top section: Sidebar + Content */}
      <div className="flex flex-col md:flex-row gap-md items-start">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 lg:w-72 flex-shrink-0 bg-surface-container-low border border-stadium-grey rounded-2xl p-sm flex flex-col justify-between glass-panel">
          <div>
            <h1 className="font-headline-md text-headline-md text-xl mb-md px-base mt-2 flex items-center gap-xs text-on-background">
              <span className="material-symbols-outlined text-grass-green">settings</span> Settings
            </h1>
            <nav className="space-y-1">
              <button 
                className={`w-full flex items-center gap-sm px-md py-3 rounded-lg transition-all duration-200 border-l-4 ${activeTab === 'profile' ? 'text-grass-green dark:text-primary font-bold bg-primary-container/10 border-grass-green' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border-transparent'}`}
                type="button"
                onClick={() => setActiveTab('profile')}
              >
                <span className="material-symbols-outlined">person</span>
                <span className="font-body-md text-sm">Profile</span>
              </button>
              <button 
                className={`w-full flex items-center gap-sm px-md py-3 rounded-lg transition-all duration-200 border-l-4 ${activeTab === 'account' ? 'text-grass-green dark:text-primary font-bold bg-primary-container/10 border-grass-green' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border-transparent'}`}
                type="button"
                onClick={() => setActiveTab('account')}
              >
                <span className="material-symbols-outlined">account_circle</span>
                <span className="font-body-md text-sm">Account &amp; Data</span>
              </button>
              <button 
                className={`w-full flex items-center gap-sm px-md py-3 rounded-lg transition-all duration-200 border-l-4 ${activeTab === 'preferences' ? 'text-grass-green dark:text-primary font-bold bg-primary-container/10 border-grass-green' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border-transparent'}`}
                type="button"
                onClick={() => setActiveTab('preferences')}
              >
                <span className="material-symbols-outlined">tune</span>
                <span className="font-body-md text-sm">Preferences</span>
              </button>
              <button 
                className={`w-full flex items-center gap-sm px-md py-3 rounded-lg transition-all duration-200 border-l-4 ${activeTab === 'subscription' ? 'text-grass-green dark:text-primary font-bold bg-primary-container/10 border-grass-green' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border-transparent'}`}
                type="button"
                onClick={() => setActiveTab('subscription')}
              >
                <span className="material-symbols-outlined">workspace_premium</span>
                <span className="font-body-md text-sm">Subscription</span>
              </button>
            </nav>
          </div>

          {/* Premium Prompt inside Sidebar */}
          <div className="mt-md p-md bg-pitch-dark/50 rounded-xl border border-outline-variant/20">
            <div className="flex items-center gap-xs mb-xs">
              <span className="material-symbols-outlined text-trophy-gold" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
              <span className="font-label-caps text-[10px] text-trophy-gold uppercase tracking-wider font-semibold">Premium Edge</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {plan === 'pro' ? 'You have unlocked unlimited AI insights!' : 'You are currently on the free tier. Upgrade to unlock AI-powered match predictions.'}
            </p>
            {plan !== 'pro' && (
              <button 
                onClick={() => setActiveTab('subscription')}
                type="button"
                className="mt-sm w-full py-2 bg-gradient-to-r from-trophy-gold to-yellow-600 text-pitch-dark font-bold text-xs rounded-lg hover:brightness-110 transition-all"
              >
                Upgrade Now
              </button>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex-grow bg-surface-container-low border border-stadium-grey rounded-2xl p-sm md:p-lg glass-panel overflow-y-auto max-h-[80vh] md:max-h-[75vh] w-full">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-lg animate-fade-in">
              <div>
                <div className="flex flex-col md:flex-row items-center gap-lg border-b border-outline-variant/20 pb-lg mb-lg">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full border-4 border-grass-green/30 p-1">
                      <div className="w-full h-full rounded-full bg-cover bg-center overflow-hidden flex items-center justify-center bg-surface-container-high">
                        {newAvatar ? (
                          <img src={newAvatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="text-display-lg text-headline-md font-extrabold text-grass-green">{displayName.substring(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsEditingAvatar(!isEditingAvatar)} 
                      type="button"
                      className="absolute bottom-0 right-0 p-2 bg-grass-green text-pitch-dark rounded-full shadow-lg hover:scale-105 transition-transform"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                  </div>
                  <div className="text-center md:text-left">
                    <h2 className="font-headline-lg text-headline-lg text-2xl font-bold">{fullName || displayName}</h2>
                    {email && <p className="text-text-muted font-body-md text-sm">{email}</p>}
                    <div className="flex gap-xs mt-sm justify-center md:justify-start">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-label-caps uppercase ${
                        plan === 'pro' ? 'bg-trophy-gold/10 text-trophy-gold border border-trophy-gold/30' :
                        plan === 'guest' ? 'bg-surface-container-highest text-on-surface-variant' :
                        'bg-grass-green/10 text-grass-green border border-grass-green/30'
                      }`}>{plan === 'pro' ? 'Pro Member' : plan === 'guest' ? 'Guest' : 'Free Plan'}</span>
                    </div>
                  </div>
                </div>

                {/* Predefined Avatar Selector Drawer */}
                {isEditingAvatar && (
                  <div className="p-md bg-surface-container-highest/20 border border-outline-variant/30 rounded-xl mb-md animate-fade-in">
                    <h4 className="font-label-caps text-xs text-on-surface-variant uppercase mb-sm">Choose an Avatar</h4>
                    <div className="grid grid-cols-5 md:grid-cols-9 gap-sm mb-md">
                      {predefinedAvatars.map((av, idx) => (
                        <img 
                          key={idx} 
                          src={av} 
                          alt={`Avatar ${idx + 1}`} 
                          onClick={() => setNewAvatar(av)}
                          className={`w-10 h-10 rounded-full cursor-pointer border-2 transition-all ${newAvatar === av ? 'border-grass-green scale-105' : 'border-transparent hover:border-outline'}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-sm">
                      <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                      <button 
                        onClick={() => fileInputRef.current.click()}
                        type="button"
                        className="px-sm py-2 bg-surface-variant text-on-surface text-xs font-semibold rounded-lg hover:bg-surface-container-high transition-colors"
                      >
                        Upload custom file
                      </button>
                      <button 
                        onClick={() => { setIsEditingAvatar(false); }} 
                        type="button"
                        className="px-sm py-2 bg-grass-green text-pitch-dark text-xs font-semibold rounded-lg hover:brightness-115 transition-colors ml-auto"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                <form className="space-y-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div className="space-y-xs">
                      <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-1 block">Full Name</label>
                      <input 
                        className="w-full bg-surface-container border border-outline-variant/30 focus:border-grass-green focus:ring-1 focus:ring-grass-green rounded-xl px-md py-3 text-on-surface text-sm placeholder:text-text-muted" 
                        type="text" 
                        value={newFullName} 
                        onChange={(e) => setNewFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-xs">
                      <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-1 block">Display Name</label>
                      <input 
                        className="w-full bg-surface-container border border-outline-variant/30 focus:border-grass-green focus:ring-1 focus:ring-grass-green rounded-xl px-md py-3 text-on-surface text-sm" 
                        type="text" 
                        value={newDisplayName} 
                        onChange={(e) => setNewDisplayName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-xs">
                    <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-1 block">Bio</label>
                    <textarea 
                      className="w-full bg-surface-container border border-outline-variant/30 focus:border-grass-green focus:ring-1 focus:ring-grass-green rounded-xl px-md py-3 text-on-surface text-sm resize-none font-body-md" 
                      rows="3" 
                      value={newBio}
                      onChange={(e) => setNewBio(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end pt-md">
                    <button 
                      className="px-xl py-3 bg-grass-green text-pitch-dark font-bold rounded-xl hover:shadow-[0_0_20px_rgba(16,163,127,0.4)] transition-all active:scale-95 text-sm" 
                      type="button"
                      onClick={saveProfile}
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ACCOUNT & DATA TAB */}
          {activeTab === 'account' && (
            <div className="space-y-lg animate-fade-in">
              <div className="bg-surface-container-low border border-outline-variant/20 p-lg rounded-xl">
                <h3 className="font-headline-md text-lg text-on-background mb-lg">Account &amp; Security</h3>
                <form className="space-y-md">
                  <div className="space-y-xs">
                    <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-1 block">Email Address</label>
                    <div className="relative">
                      <input 
                        className="w-full bg-surface-container border border-outline-variant/30 focus:border-grass-green focus:ring-1 focus:ring-grass-green rounded-xl px-md py-3 text-on-surface text-sm pr-12" 
                        type="email" 
                        value={email} 
                        readOnly 
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-grass-green text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-md border-t border-outline-variant/20">
                    <div className="space-y-xs">
                      <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-1 block">Current Password</label>
                      <input 
                        className="w-full bg-surface-container border border-outline-variant/30 focus:border-grass-green focus:ring-1 focus:ring-grass-green rounded-xl px-md py-3 text-on-surface text-sm" 
                        placeholder="••••••••••••" 
                        type="password" 
                      />
                    </div>
                    <div className="space-y-xs">
                      <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-1 block">New Password</label>
                      <input 
                        className="w-full bg-surface-container border border-outline-variant/30 focus:border-grass-green focus:ring-1 focus:ring-grass-green rounded-xl px-md py-3 text-on-surface text-sm" 
                        placeholder="New Password" 
                        type="password" 
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-sm">
                    <button 
                      onClick={() => onShowAlert({
                        title: 'Change Password',
                        message: 'Password change is not available. Please contact administrator.'
                      })}
                      className="px-md py-2 border border-grass-green text-grass-green hover:bg-grass-green hover:text-pitch-dark transition-all rounded-lg text-xs font-bold"
                      type="button"
                    >
                      Change Password
                    </button>
                  </div>
                </form>
              </div>

              {/* Chat & Data Management section */}
              <div className="bg-surface-container border border-outline-variant/20 p-lg rounded-xl">
                <h3 className="font-headline-md text-lg text-on-background mb-lg">Chat &amp; Personalization History</h3>
                <div className="space-y-md">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-md bg-surface-container-low/50 border border-outline-variant/10 rounded-xl gap-sm">
                    <div>
                      <p className="font-semibold text-sm">Clear Conversation History</p>
                      <p className="text-xs text-text-muted">Delete all your existing chat sessions. This cannot be undone.</p>
                    </div>
                    <button 
                      onClick={handleClearAllChats}
                      type="button"
                      className="px-md py-2 bg-error/10 hover:bg-error/20 text-error border border-error/30 rounded-lg text-xs font-bold shrink-0"
                    >
                      Clear Chats
                    </button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-md bg-surface-container-low/50 border border-outline-variant/10 rounded-xl gap-sm">
                    <div>
                      <p className="font-semibold text-sm">Export Conversations</p>
                      <p className="text-xs text-text-muted">Download all active chat history from this device as a text file.</p>
                    </div>
                    <button 
                      onClick={handleExportChats}
                      type="button"
                      className="px-md py-2 bg-surface-variant hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold shrink-0"
                    >
                      Export Data
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-md bg-surface-container-low/50 border border-outline-variant/10 rounded-xl gap-sm">
                    <div>
                      <p className="font-semibold text-sm">Reset Extracted Favorites Profile</p>
                      <p className="text-xs text-text-muted">Reset the AI-extracted metadata of your favorite teams and cricketers.</p>
                    </div>
                    <button 
                      onClick={handleClearFavoritesProfile}
                      type="button"
                      className="px-md py-2 bg-error/10 hover:bg-error/20 text-error border border-error/30 rounded-lg text-xs font-bold shrink-0"
                    >
                      Reset Favorites
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-surface-container border border-error/20 p-lg rounded-xl bg-error-container/5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm">
                  <div>
                    <p className="font-semibold text-error text-sm">Danger Zone</p>
                    <p className="text-xs text-on-surface-variant">Deleting your account is permanent. All chats, credits, and customizations will be destroyed.</p>
                  </div>
                  <button 
                    onClick={handleDeleteAccount}
                    type="button"
                    className="px-md py-2 border border-error/50 text-error hover:bg-error hover:text-on-error transition-all rounded-lg text-xs font-bold shrink-0"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PREFERENCES & PERSONALIZATION TAB */}
          {activeTab === 'preferences' && (
            <div className="space-y-lg animate-fade-in">
              <div className="bg-surface-container-low border border-outline-variant/20 p-lg rounded-xl">
                <h3 className="font-headline-md text-lg text-on-background mb-lg">App Preferences</h3>
                <div className="space-y-md">
                  {/* Push Notifications Toggle */}
                  <div className="flex items-center justify-between p-md bg-surface-container-low/50 rounded-xl border border-outline-variant/10">
                    <div className="flex items-center gap-md">
                      <div className="p-2 bg-primary-container/10 text-grass-green rounded-lg">
                        <span className="material-symbols-outlined">notifications_active</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Push Notifications</p>
                        <p className="text-xs text-text-muted">Real-time alerts for wickets, milestones, and match results.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setPushNotifications(!pushNotifications)}
                      type="button"
                      className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${pushNotifications ? 'bg-grass-green' : 'bg-outline-variant/50'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${pushNotifications ? 'right-1' : 'left-1'}`}></span>
                    </button>
                  </div>

                  {/* App Theme Select */}
                  <div className="flex items-center justify-between p-md bg-surface-container-low/50 rounded-xl border border-outline-variant/10">
                    <div className="flex items-center gap-md">
                      <div className="p-2 bg-primary-container/10 text-grass-green rounded-lg">
                        <span className="material-symbols-outlined">palette</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Interface Theme</p>
                        <p className="text-xs text-text-muted">Choose your preferred visual presentation style.</p>
                      </div>
                    </div>
                    <select 
                      value={theme}
                      onChange={(e) => { setTheme(e.target.value); applyTheme(e.target.value); }}
                      className="bg-surface-container border border-outline-variant/30 text-on-surface text-xs rounded-lg px-3 py-1.5 focus:ring-grass-green"
                    >
                      <option value="dark">Classic Dark</option>
                      <option value="green">Pitch Green</option>
                      <option value="light">Stadium Light</option>
                    </select>
                  </div>

                  {/* Language select */}
                  <div className="flex items-center justify-between p-md bg-surface-container-low/50 rounded-xl border border-outline-variant/10">
                    <div className="flex items-center gap-md">
                      <div className="p-2 bg-primary-container/10 text-grass-green rounded-lg">
                        <span className="material-symbols-outlined">language</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Language</p>
                        <p className="text-xs text-text-muted">Select your preferred localized interface language.</p>
                      </div>
                    </div>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-surface-container border border-outline-variant/30 text-on-surface text-xs rounded-lg px-3 py-1.5 focus:ring-grass-green"
                    >
                      <option>English (UK)</option>
                      <option>Hindi</option>
                      <option>Australian English</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Cricket Chat Personalization form */}
              <div className="bg-surface-container-low border border-outline-variant/20 p-lg rounded-xl">
                <h3 className="font-headline-md text-lg text-on-background mb-lg flex items-center gap-xs">
                  <span className="material-symbols-outlined text-grass-green">smart_toy</span> AI Chat Personalization
                </h3>
                <form onSubmit={savePreferences} className="space-y-md">
                  
                  {/* Expertise level */}
                  <div className="space-y-xs">
                    <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-1 block">Cricket Expertise</label>
                    <select 
                      value={expertise} 
                      onChange={(e) => setExpertise(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 focus:border-grass-green focus:ring-1 focus:ring-grass-green rounded-xl px-md py-3 text-on-surface text-sm"
                    >
                      <option value="Casual">Casual Fan</option>
                      <option value="Standard">Standard</option>
                      <option value="Expert">Expert Analyst</option>
                      <option value="Tactician">Tactician</option>
                    </select>
                  </div>

                  {/* Response Verbosity level */}
                  <div className="space-y-xs">
                    <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-1 block">Response Verbosity</label>
                    <div className="flex items-center gap-sm p-sm bg-surface-container/50 border border-outline-variant/10 rounded-xl">
                      <span className="text-xs text-text-muted font-semibold">Concise</span>
                      <input 
                        type="range" 
                        min="1" 
                        max="3" 
                        value={verbosity}
                        onChange={(e) => setVerbosity(e.target.value)}
                        className="flex-grow accent-grass-green h-1.5 rounded"
                      />
                      <span className="text-xs text-text-muted font-semibold">Detailed</span>
                    </div>
                  </div>

                  {/* Match Formats checkbox chips */}
                  <div className="space-y-xs">
                    <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-1 block">Preferred Match Formats</label>
                    <div className="flex gap-sm p-sm bg-surface-container/50 border border-outline-variant/10 rounded-xl">
                      {['T20', 'ODI', 'Test'].map(fmt => (
                        <label key={fmt} className="flex items-center gap-xs cursor-pointer select-none text-sm text-on-surface">
                          <input 
                            type="checkbox"
                            checked={formats[fmt]}
                            onChange={(e) => setFormats({ ...formats, [fmt]: e.target.checked })}
                            className="rounded border-outline-variant/50 text-grass-green focus:ring-grass-green bg-surface-container"
                          />
                          <span>{fmt === 'Test' ? 'Test Match' : fmt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Disliked Rival Teams input */}
                  <div className="space-y-xs">
                    <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-1 block">Disliked Rival Teams</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Australia, Mumbai Indians" 
                      value={rivalTeams}
                      onChange={(e) => setRivalTeams(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 focus:border-grass-green focus:ring-1 focus:ring-grass-green rounded-xl px-md py-3 text-on-surface text-sm"
                    />
                  </div>

                  <div className="flex justify-end pt-md border-t border-outline-variant/20">
                    <button 
                      type="submit"
                      className="px-xl py-3 bg-grass-green text-pitch-dark font-bold rounded-xl hover:shadow-[0_0_20px_rgba(16,163,127,0.4)] transition-all active:scale-95 text-sm" 
                    >
                      Save Preferences
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* SUBSCRIPTION TAB */}
          {activeTab === 'subscription' && (
            <div className="space-y-lg animate-fade-in relative">
              {/* Background gold glow effect */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-trophy-gold/10 blur-[80px] rounded-full pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-sm mb-lg">
                  <span className="material-symbols-outlined text-trophy-gold text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  <h3 className="font-headline-md text-xl text-on-background font-bold">Your Account Tier</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
                  {/* Free Plan details */}
                  <div className={`p-lg rounded-2xl border-2 bg-surface-container-lowest/70 flex flex-col justify-between ${plan !== 'pro' ? 'border-outline-variant/50' : 'border-outline-variant/20 opacity-60'}`}>
                    <div>
                      <h4 className="font-headline-md text-lg text-on-background mb-base">CrickAlt Free</h4>
                      <p className="text-text-muted text-xs mb-lg">Standard matches and dashboard insights.</p>
                      <ul className="space-y-sm mb-lg">
                        <li className="flex items-center gap-xs text-xs text-on-surface">
                          <span className="material-symbols-outlined text-grass-green text-sm">check_circle</span>
                          Live Scorecards
                        </li>
                        <li className="flex items-center gap-xs text-xs text-on-surface">
                          <span className="material-symbols-outlined text-grass-green text-sm">check_circle</span>
                          Basic Match Summaries
                        </li>
                        <li className="flex items-center gap-xs text-xs text-on-surface-variant/40">
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          AI Assistant Restricted (5 inquiries/day)
                        </li>
                        <li className="flex items-center gap-xs text-xs text-on-surface-variant/40">
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          Predictive Win Probabilities
                        </li>
                      </ul>
                    </div>
                    <div>
                      {plan !== 'pro' ? (
                        <span className="inline-block w-full text-center py-2 bg-surface-container-highest rounded-xl text-xs font-bold text-on-surface-variant">
                          CURRENT PLAN
                        </span>
                      ) : (
                        <span className="inline-block w-full text-center py-2 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface-variant/30">
                          FREE TIER
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Premium Plan details */}
                  <div className={`p-lg rounded-2xl border-2 bg-gradient-to-br from-stadium-grey to-pitch-dark flex flex-col justify-between ${plan === 'pro' ? 'border-trophy-gold active-glow' : 'border-trophy-gold/30'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-base">
                        <h4 className="font-headline-md text-lg text-trophy-gold font-bold">Premium Edge</h4>
                        <span className="px-2 py-0.5 bg-trophy-gold text-pitch-dark text-[9px] font-extrabold rounded uppercase tracking-wider">
                          Recommended
                        </span>
                      </div>
                      <p className="text-white/70 text-xs mb-lg">For professional analysts and data-driven fans.</p>
                      <ul className="space-y-sm mb-lg">
                        <li className="flex items-center gap-xs text-xs text-on-surface">
                          <span className="material-symbols-outlined text-trophy-gold text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          Unlimited AI Assistant Inquiries
                        </li>
                        <li className="flex items-center gap-xs text-xs text-on-surface">
                          <span className="material-symbols-outlined text-trophy-gold text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          Predictive Win Probability shift calculations
                        </li>
                        <li className="flex items-center gap-xs text-xs text-on-surface">
                          <span className="material-symbols-outlined text-trophy-gold text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          Detailed Match Player Statistics &amp; Matchups
                        </li>
                        <li className="flex items-center gap-xs text-xs text-on-surface">
                          <span className="material-symbols-outlined text-trophy-gold text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          Completely Ad-Free Platform Experience
                        </li>
                      </ul>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-xs mb-md justify-center">
                        <span className="font-stats-num text-2xl text-on-surface font-extrabold">$9.99</span>
                        <span className="text-text-muted text-xs">/month</span>
                      </div>
                      {plan === 'pro' ? (
                        <span className="inline-block w-full text-center py-2.5 bg-gradient-to-r from-trophy-gold to-yellow-600 text-pitch-dark font-bold text-xs rounded-xl">
                          ACTIVE PREMIUM MEMBER
                        </span>
                      ) : (
                        <button 
                          onClick={() => {
                            onShowAlert({
                              title: 'Upgrade Plan',
                              message: 'Upgrade flow is currently locked for this demo session. Please contact support.'
                            });
                          }}
                          type="button"
                          className="w-full py-2.5 bg-gradient-to-r from-trophy-gold to-yellow-600 text-pitch-dark font-bold text-xs rounded-xl hover:brightness-110 transition-all shadow-[0_0_20px_rgba(255,215,0,0.2)]"
                        >
                          Upgrade Plan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Section: Statistics Cards — only real data */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md w-full">
          <div className="glass-panel p-md rounded-xl border-2 border-grass-green flex justify-between items-center bg-surface-container-low shadow-[0_0_15px_rgba(16,163,127,0.15)]">
            <div>
              <span className="text-text-muted text-[10px] font-label-caps uppercase block mb-1">CHAT SESSIONS</span>
              <div className="font-stats-num text-stats-num text-xl text-on-surface">{sessionsCount}</div>
            </div>
            <span className="material-symbols-outlined text-grass-green text-2xl">chat</span>
          </div>
          <div className="glass-panel p-md rounded-xl border-2 border-primary flex justify-between items-center bg-surface-container-low shadow-[0_0_15px_rgba(97,219,180,0.15)]">
            <div>
              <span className="text-text-muted text-[10px] font-label-caps uppercase block mb-1">PLAN</span>
              <div className="font-stats-num text-stats-num text-xl text-on-surface capitalize">{plan}</div>
            </div>
            <span className="material-symbols-outlined text-primary text-2xl">workspace_premium</span>
          </div>
        </div>
      )}
    </div>
  );

  if (isInline) {
    return settingsLayout;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-sm md:p-md bg-pitch-dark/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl flex flex-col gap-md">
        {/* Close Button */}
        <button 
          className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-surface-container-high border border-stadium-grey flex items-center justify-center text-text-muted hover:text-on-background text-2xl transition-colors z-20 font-semibold"
          onClick={onClose}
          type="button"
          aria-label="Close Settings"
        >
          &times;
        </button>
        {settingsLayout}
      </div>
    </div>
  );
}
