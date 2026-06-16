export default function UserProfilePopover({
  isOpen,
  displayName,
  email,
  plan,
  username,
  onClose,
  onOpenModal,
  onLogout
}) {
  if (!isOpen) return null;

  const isAdmin = username === 'iamthecreator';

  return (
    <div className="user-profile-popover" style={{ display: 'block' }}>
      <div className="popover-header">
        <div className="user-avatar">
          {displayName ? displayName.substring(0, 2).toUpperCase() : '?'}
        </div>
        <div className="popover-user-details">
          <div className="popover-display-name">{displayName || 'User'}</div>
          <div className="popover-email">{email || 'guest@crickait.com'}</div>
        </div>
      </div>
      <div className="popover-divider"></div>
      <button className="popover-item" onClick={() => { onOpenModal('upgrade'); onClose(); }}>
        <i className="fa-solid fa-wand-magic-sparkles"></i> Upgrade plan
      </button>
      <button className="popover-item" onClick={() => { onOpenModal('personalization'); onClose(); }}>
        <i className="fa-solid fa-sliders"></i> Personalization
      </button>
      <button className="popover-item" onClick={() => { onOpenModal('profile'); onClose(); }}>
        <i className="fa-solid fa-circle-user"></i> Profile
      </button>
      {isAdmin && (
        <button className="popover-item" onClick={() => { onOpenModal('admin'); onClose(); }}>
          <i className="fa-solid fa-shield-halved"></i> Admin Dashboard
        </button>
      )}
      <button className="popover-item" onClick={() => { onOpenModal('settings'); onClose(); }}>
        <i className="fa-solid fa-gear"></i> Settings
      </button>
      <div className="popover-divider"></div>
      <button className="popover-item" onClick={() => { onOpenModal('help'); onClose(); }}>
        <i className="fa-solid fa-circle-question"></i> Help
      </button>
      <button className="popover-item logout" onClick={() => { onLogout(); onClose(); }}>
        <i className="fa-solid fa-right-from-bracket"></i> Log out
      </button>
    </div>
  );
}
