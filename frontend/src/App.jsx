import { useState, useEffect } from 'react';
import AuthOverlay from './components/AuthOverlay';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import NewsTicker from './components/NewsTicker';
import UserProfilePopover from './components/UserProfilePopover';
import ProfileModal from './components/ProfileModal';
import UpgradeModal from './components/UpgradeModal';
import PersonalizationModal from './components/PersonalizationModal';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';
import BugReportModal from './components/BugReportModal';
import AdminModal from './components/AdminModal';
import ScorecardOverlay from './components/ScorecardOverlay';
import CustomAlert from './components/CustomAlert';
import { getAuthToken, authenticatedFetch } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [userProfile, setUserProfile] = useState({ displayName: '', email: '', plan: 'free', username: '' });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // null | 'profile' | 'upgrade' | 'personalization' | 'settings' | 'help' | 'bug-report' | 'admin'
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [customAlert, setCustomAlert] = useState(null); // null | { title, message, isPrompt, defaultValue, onConfirm, onCancel }

  useEffect(() => {
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
        setPopoverOpen(false);
      }
    };
    window.addEventListener('keydown', handleCloseAll);
    return () => window.removeEventListener('keydown', handleCloseAll);
  }, []);

  useEffect(() => {
    const handleClick = () => setPopoverOpen(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
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
          username: data.username
        };
        setUserProfile(profileData);
        localStorage.setItem('crickait_plan', data.plan || 'free');
        localStorage.setItem('crickait_display_name', data.display_name || data.username);
        localStorage.setItem('crickait_username', data.username);
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
    setIsAuthenticated(false);
    setCurrentSessionId(null);
    setUserProfile({ displayName: '', email: '', plan: 'free', username: '' });
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
    // Put prompt in textarea and submit
    const inputField = document.getElementById('chat-input');
    if (inputField) {
      inputField.value = promptText;
      // Trigger a react input event change
      const event = new Event('input', { bubbles: true });
      inputField.dispatchEvent(event);
      inputField.focus();
    }
  };

  return (
    <>
      {!isAuthenticated && <AuthOverlay onLogin={() => setIsAuthenticated(true)} />}

      {isAuthenticated && <NewsTicker />}

      <div className="app-container">
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          currentSessionId={currentSessionId}
          setCurrentSessionId={setCurrentSessionId}
          userProfile={userProfile}
          onLogout={handleLogout}
          onTogglePopover={() => setPopoverOpen(prev => !prev)}
          onOpenModal={setActiveModal}
          onSelectMatch={setSelectedMatchId}
          onConfirmAlert={showConfirmAlert}
          onShowAlert={showSimpleAlert}
        />
        <ChatInterface
          currentSessionId={currentSessionId}
          setCurrentSessionId={setCurrentSessionId}
          toggleSidebar={() => setSidebarOpen(prev => !prev)}
          onShowAlert={showSimpleAlert}
          onLogout={handleLogout}
        />
      </div>

      {/* Popovers */}
      <UserProfilePopover
        isOpen={popoverOpen}
        displayName={userProfile.displayName}
        email={userProfile.email}
        plan={userProfile.plan}
        username={userProfile.username}
        onClose={() => setPopoverOpen(false)}
        onOpenModal={setActiveModal}
        onLogout={handleLogout}
      />

      {/* Modals */}
      {activeModal === 'profile' && (
        <ProfileModal
          onClose={() => setActiveModal(null)}
          onLogout={handleLogout}
        />
      )}

      {activeModal === 'upgrade' && (
        <UpgradeModal
          onClose={() => setActiveModal(null)}
          onShowAlert={showSimpleAlert}
        />
      )}

      {activeModal === 'personalization' && (
        <PersonalizationModal
          onClose={() => setActiveModal(null)}
          onShowAlert={showSimpleAlert}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          onClose={() => setActiveModal(null)}
          onShowAlert={showSimpleAlert}
          onConfirmAlert={showConfirmAlert}
          onLogout={handleLogout}
        />
      )}

      {activeModal === 'help' && (
        <HelpModal
          onClose={() => setActiveModal(null)}
          onSelectPrompt={handleSelectPrompt}
          onOpenBugReport={() => setActiveModal('bug-report')}
        />
      )}

      {activeModal === 'bug-report' && (
        <BugReportModal
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'admin' && (
        <AdminModal
          onClose={() => setActiveModal(null)}
          onShowAlert={showSimpleAlert}
        />
      )}

      {selectedMatchId && (
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
    </>
  );
}

export default App;
