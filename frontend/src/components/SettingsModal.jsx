import { authenticatedFetch } from '../services/api';

export default function SettingsModal({ onClose, onShowAlert, onConfirmAlert, onLogout }) {

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
            // Dispatch event to refresh profile
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

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h3><i className="fa-solid fa-gear"></i> Settings</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="settings-section-title">Chat</div>
          <div className="settings-list">
            <div className="settings-item">
              <div className="item-text">
                <h4>Clear All Chat Sessions</h4>
                <p>Delete all your conversation history.</p>
              </div>
              <button className="settings-btn settings-btn-warn" onClick={handleClearAllChats}>
                <i className="fa-solid fa-trash-can"></i> Clear
              </button>
            </div>
            <div className="settings-item">
              <div className="item-text">
                <h4>Export Chat History</h4>
                <p>Download all your chats as a text file.</p>
              </div>
              <button className="settings-btn" onClick={handleExportChats}>
                <i className="fa-solid fa-file-arrow-down"></i> Export
              </button>
            </div>
          </div>

          <div className="settings-section-title">Profile</div>
          <div className="settings-list">
            <div className="settings-item">
              <div className="item-text">
                <h4>Clear Favorites Profile</h4>
                <p>Reset all AI-extracted favorite teams and players.</p>
              </div>
              <button className="settings-btn settings-btn-warn" onClick={handleClearFavoritesProfile}>
                <i className="fa-solid fa-rotate-left"></i> Reset
              </button>
            </div>
            <div className="settings-item">
              <div className="item-text">
                <h4>Change Password</h4>
                <p>Update your account login password.</p>
              </div>
              <button
                className="settings-btn"
                onClick={() => onShowAlert({
                  title: 'Change Password',
                  message: 'Password change is not available. Please contact administrator.'
                })}
              >
                <i className="fa-solid fa-key"></i> Change
              </button>
            </div>
          </div>

          <div className="settings-section-title" style={{ color: '#ff4b4b' }}>Danger Zone</div>
          <div className="settings-list">
            <div className="settings-item">
              <div className="item-text">
                <h4 style={{ color: '#ff4b4b' }}>Delete Account</h4>
                <p>Permanently remove your account, sessions, and all data.</p>
              </div>
              <button className="settings-btn settings-btn-danger" onClick={handleDeleteAccount}>
                <i className="fa-solid fa-skull"></i> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
