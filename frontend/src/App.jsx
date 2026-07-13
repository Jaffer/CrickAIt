import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import AuthOverlay from './components/AuthOverlay';
import AppLayout from './components/AppLayout';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';
import BugReportModal from './components/BugReportModal';
import AdminModal from './components/AdminModal';
import ScorecardOverlay from './components/ScorecardOverlay';
import CustomAlert from './components/CustomAlert';
import ErrorOverlay from './components/ErrorOverlay';
import { getAuthToken, authenticatedFetch } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [userProfile, setUserProfile] = useState({
    displayName: localStorage.getItem('crickait_display_name') || '',
    email: '',
    plan: localStorage.getItem('crickait_plan') || 'free',
    username: localStorage.getItem('crickait_username') || '',
    avatar: localStorage.getItem('crickait_avatar') || null
  });
  const [activeModal, setActiveModal] = useState(null);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [customAlert, setCustomAlert] = useState(null);
  const [errorOverlay, setErrorOverlay] = useState(null);
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    // Apply saved theme
    const savedTheme = localStorage.getItem('crickait_theme') || 'dark';
    const root = document.documentElement;
    if (savedTheme === 'green') {
      root.style.setProperty('--bg-color', '#0a1a12');
      root.style.setProperty('--surface', '#132c1d');
      root.style.setProperty('--surface-light', '#1e422c');
      root.style.setProperty('--accent', '#00d26a');
    } else if (savedTheme === 'light') {
      root.style.setProperty('--bg-color', '#f5f7fa');
      root.style.setProperty('--surface', '#ffffff');
      root.style.setProperty('--surface-light', '#eef2f5');
      root.style.setProperty('--text', '#2d3436');
      root.style.setProperty('--text-muted', '#636e72');
      root.style.setProperty('--accent', '#00b894');
    } else {
      root.style.setProperty('--bg-color', '#0f1115');
      root.style.setProperty('--surface', '#1a1d24');
      root.style.setProperty('--surface-light', '#252932');
      root.style.setProperty('--text', '#f1f1f1');
      root.style.setProperty('--text-muted', '#a0aab2');
      root.style.setProperty('--accent', '#10a37f');
    }

    const handleAuthExpired = () => handleLogout();
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
    const handleProfileUpdate = () => fetchProfile();
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, [isAuthenticated]);

  useEffect(() => {
    const handleCloseAll = (e) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
        setSelectedMatchId(null);
        setCustomAlert(null);
      }
    };
    window.addEventListener('keydown', handleCloseAll);
    return () => window.removeEventListener('keydown', handleCloseAll);
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authenticatedFetch('/auth/me');
      if (res.ok) {
        const data = await res.json();
        const profileData = {
          displayName: data.display_name || data.username,
          email: data.email,
          plan: data.plan || 'free',
          username: data.username,
          avatar: data.avatar || null
        };
        setUserProfile(profileData);
        localStorage.setItem('crickait_plan', data.plan || 'free');
        localStorage.setItem('crickait_display_name', data.display_name || data.username);
        localStorage.setItem('crickait_username', data.username);
        if (data.avatar) {
          localStorage.setItem('crickait_avatar', data.avatar);
        } else {
          localStorage.removeItem('crickait_avatar');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await authenticatedFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('crickait_token');
    localStorage.removeItem('crickait_username');
    localStorage.removeItem('crickait_display_name');
    localStorage.removeItem('crickait_plan');
    localStorage.removeItem('crickait_avatar');
    setIsAuthenticated(false);
    setCurrentSessionId(null);
    setUserProfile({ displayName: '', email: '', plan: 'free', username: '', avatar: null });
  };

  const handleSignupAction = () => {
    handleLogout();
    setAuthMode('signup');
  };

  const showSimpleAlert = ({ title, message }) => {
    setCustomAlert({
      title,
      message,
      isPrompt: false,
      onConfirm: () => setCustomAlert(null)
    });
  };

  const showConfirmAlert = ({ title, message, isPrompt = false, defaultValue = '', onConfirm }) => {
    setCustomAlert({
      title,
      message,
      isPrompt,
      defaultValue,
      onConfirm: (val) => {
        setCustomAlert(null);
        onConfirm(val);
      },
      onCancel: () => setCustomAlert(null)
    });
  };

  const handleSelectPrompt = (promptText) => {
    const inputField = document.getElementById('chat-input');
    if (inputField) {
      inputField.value = promptText;
      const event = new Event('input', { bubbles: true });
      inputField.dispatchEvent(event);
      inputField.focus();
    }
  };

  return (
    <>
      {/* Unauthenticated: show landing page */}
      {!isAuthenticated && (
        <AuthOverlay
          initialMode={authMode}
          onLogin={() => {
            setIsAuthenticated(true);
            setAuthMode('login');
          }}
        />
      )}

      {/* Authenticated: show new navbar layout + chat */}
      {isAuthenticated && (
        <AppLayout
          userProfile={userProfile}
          onLogout={handleLogout}
          showSimpleAlert={showSimpleAlert}
          showConfirmAlert={showConfirmAlert}
          currentSessionId={currentSessionId}
          setCurrentSessionId={setCurrentSessionId}
          setActiveModal={setActiveModal}
          setErrorOverlay={setErrorOverlay}
          setSelectedMatchId={setSelectedMatchId}
        />
      )}

      {/* Global Modals (rendered on top of authenticated layout) */}
      {isAuthenticated && (activeModal === 'profile' || activeModal === 'upgrade' || activeModal === 'personalization' || activeModal === 'settings') && (
        <SettingsModal
          initialTab={
            activeModal === 'profile' ? 'profile' :
            activeModal === 'upgrade' ? 'subscription' :
            activeModal === 'personalization' ? 'preferences' : 'preferences'
          }
          onClose={() => setActiveModal(null)}
          onShowAlert={showSimpleAlert}
          onConfirmAlert={showConfirmAlert}
          onLogout={handleLogout}
        />
      )}

      {isAuthenticated && activeModal === 'help' && (
        <HelpModal
          onClose={() => setActiveModal(null)}
          onSelectPrompt={handleSelectPrompt}
          onOpenBugReport={() => setActiveModal('bug-report')}
        />
      )}

      {isAuthenticated && activeModal === 'bug-report' && (
        <BugReportModal
          onClose={() => setActiveModal(null)}
        />
      )}

      {isAuthenticated && activeModal === 'admin' && (
        <AdminModal
          onClose={() => setActiveModal(null)}
          onShowAlert={showSimpleAlert}
        />
      )}

      {isAuthenticated && selectedMatchId && (
        <ScorecardOverlay
          matchId={selectedMatchId}
          onClose={() => setSelectedMatchId(null)}
        />
      )}

      {customAlert && (
        <CustomAlert
          title={customAlert.title}
          message={customAlert.message}
          isPrompt={customAlert.isPrompt}
          defaultValue={customAlert.defaultValue}
          onConfirm={customAlert.onConfirm}
          onCancel={customAlert.onCancel}
        />
      )}

      {errorOverlay && (
        <ErrorOverlay
          type={errorOverlay}
          onClose={() => setErrorOverlay(null)}
        />
      )}

      <Analytics />
    </>
  );
}

export default App;
