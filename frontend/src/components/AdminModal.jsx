import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../services/api';

export default function AdminModal({ onClose, onShowAlert }) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyName, setNotifyName] = useState('');
  const [notifySubject, setNotifySubject] = useState('');
  const [notifyStatus, setNotifyStatus] = useState({ type: '', text: '' });
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [broadcastStatus, setBroadcastStatus] = useState({ type: '', text: '' });
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await authenticatedFetch('/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        onShowAlert({ title: 'Error', message: 'Failed to load users. Admin access required.' });
        onClose();
      }
    } catch (e) {
      console.error(e);
      onShowAlert({ title: 'Error', message: 'Error loading admin users.' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUpgradeUser = async (targetUsername, newPlan) => {
    try {
      const res = await authenticatedFetch('/admin/upgrade-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername, plan: newPlan })
      });
      if (res.ok) {
        onShowAlert({ title: 'Success', message: `User ${targetUsername} successfully upgraded to ${newPlan}.` });
        fetchUsers();
      } else {
        onShowAlert({ title: 'Error', message: 'Failed to upgrade user.' });
      }
    } catch (e) {
      console.error(e);
      onShowAlert({ title: 'Error', message: 'Error upgrading user.' });
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setIsSendingNotification(true);
    setNotifyStatus({ type: '', text: '' });

    try {
      if (window.emailjs) {
        await window.emailjs.send("service_dvblxgd", "template_nxwe5ta", {
          to_email: notifyEmail.trim(),
          to_name: notifyName.trim() || 'User',
          bug_subject: notifySubject.trim()
        });

        setNotifyStatus({ type: 'success', text: 'Bug resolution email sent successfully!' });
        setNotifyEmail('');
        setNotifyName('');
        setNotifySubject('');
      } else {
        setNotifyStatus({ type: 'error', text: 'EmailJS is not loaded.' });
      }
    } catch (err) {
      console.error("EmailJS send failed:", err);
      setNotifyStatus({ type: 'error', text: 'Failed to send email. Check configuration.' });
    } finally {
      setIsSendingNotification(false);
      setTimeout(() => setNotifyStatus({ type: '', text: '' }), 5000);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setIsSendingBroadcast(true);
    setBroadcastStatus({ type: '', text: '' });

    try {
      const res = await authenticatedFetch('/admin/notify/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          type: broadcastType,
          expires_days: 7 // default TTL
        })
      });

      if (res.ok) {
        setBroadcastStatus({ type: 'success', text: 'Broadcast notification sent to all users!' });
        setBroadcastTitle('');
        setBroadcastMessage('');
        setBroadcastType('info');
      } else {
        const errData = await res.json();
        setBroadcastStatus({ type: 'error', text: errData.detail || 'Failed to send broadcast.' });
      }
    } catch (err) {
      console.error("Broadcast send failed:", err);
      setBroadcastStatus({ type: 'error', text: 'Network error sending broadcast.' });
    } finally {
      setIsSendingBroadcast(false);
      setTimeout(() => setBroadcastStatus({ type: '', text: '' }), 5000);
    }
  };

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
        <div className="modal-header">
          <h3>Admin Dashboard</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="admin-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <button
              className={`settings-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
              style={{ background: activeTab === 'users' ? 'var(--accent)' : 'transparent', color: '#fff' }}
            >
              <i className="fa-solid fa-users"></i> Manage Users
            </button>
            <button
              className={`settings-btn ${activeTab === 'notify' ? 'active' : ''}`}
              onClick={() => setActiveTab('notify')}
              style={{ background: activeTab === 'notify' ? 'var(--accent)' : 'transparent', color: '#fff' }}
            >
              <i className="fa-solid fa-envelope-circle-check"></i> Send Bug Fixed Email
            </button>
            <button
              className={`settings-btn ${activeTab === 'broadcast' ? 'active' : ''}`}
              onClick={() => setActiveTab('broadcast')}
              style={{ background: activeTab === 'broadcast' ? 'var(--accent)' : 'transparent', color: '#fff' }}
            >
              <i className="fa-solid fa-bullhorn"></i> Send Announcement
            </button>
          </div>

          {activeTab === 'users' && (
            <div className="admin-tab-content">
              {loadingUsers ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading user list...</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#E0E0E0', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #333', background: '#1A1A1A' }}>
                        <th style={{ padding: '10px' }}>Username</th>
                        <th style={{ padding: '10px' }}>Email</th>
                        <th style={{ padding: '10px' }}>Provider</th>
                        <th style={{ padding: '10px' }}>Plan</th>
                        <th style={{ padding: '10px' }}>Created At</th>
                        <th style={{ padding: '10px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                          <td style={{ padding: '10px' }}>{user.username}</td>
                          <td style={{ padding: '10px' }}>{user.email}</td>
                          <td style={{ padding: '10px', textTransform: 'capitalize' }}>{user.auth_provider}</td>
                          <td style={{ padding: '10px', textTransform: 'capitalize' }}>{user.plan}</td>
                          <td style={{ padding: '10px' }}>{new Date(user.created_at).toLocaleString()}</td>
                          <td style={{ padding: '10px' }}>
                            {user.plan === 'free' ? (
                              <button
                                onClick={() => handleUpgradeUser(user.username, 'pro')}
                                style={{ background: 'var(--accent)', border: 'none', borderRadius: '4px', color: '#fff', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem' }}
                              >
                                Upgrade to Pro
                              </button>
                            ) : (
                              <span style={{ color: '#4CAF50', fontSize: '0.8rem', fontWeight: 600 }}>Pro</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notify' && (
            <div className="admin-tab-content" style={{ maxWidth: '500px' }}>
              <form onSubmit={handleSendNotification}>
                <div className="input-group">
                  <label htmlFor="notify-email">User Email</label>
                  <input
                    type="email"
                    id="notify-email"
                    className="modern-input"
                    placeholder="user@example.com"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group" style={{ marginTop: '12px' }}>
                  <label htmlFor="notify-name">User Name (Optional)</label>
                  <input
                    type="text"
                    id="notify-name"
                    className="modern-input"
                    placeholder="e.g. John"
                    value={notifyName}
                    onChange={(e) => setNotifyName(e.target.value)}
                  />
                </div>
                <div className="input-group" style={{ marginTop: '12px' }}>
                  <label htmlFor="notify-subject">Bug Subject / Description</label>
                  <input
                    type="text"
                    id="notify-subject"
                    className="modern-input"
                    placeholder="e.g. Scorecard not loading"
                    value={notifySubject}
                    onChange={(e) => setNotifySubject(e.target.value)}
                    required
                  />
                </div>

                {notifyStatus.text && (
                  <div style={{ marginTop: '10px', fontSize: '0.88rem', minHeight: '20px' }}>
                    {notifyStatus.type === 'success' ? (
                      <span style={{ color: '#2ecc71' }}><i className="fa-solid fa-circle-check"></i> {notifyStatus.text}</span>
                    ) : (
                      <span style={{ color: '#ff4b4b' }}><i className="fa-solid fa-triangle-exclamation"></i> {notifyStatus.text}</span>
                    )}
                  </div>
                )}

                <button type="submit" className="auth-submit-btn" style={{ marginTop: '14px' }} disabled={isSendingNotification}>
                  {isSendingNotification ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Sending...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i> Send Fixed Notification
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'broadcast' && (
            <div className="admin-tab-content" style={{ maxWidth: '500px' }}>
              <form onSubmit={handleSendBroadcast}>
                <div className="input-group">
                  <label htmlFor="broadcast-title">Announcement Title</label>
                  <input
                    type="text"
                    id="broadcast-title"
                    className="modern-input"
                    placeholder="e.g. 🏏 Live Win Probability is Live!"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group" style={{ marginTop: '12px' }}>
                  <label htmlFor="broadcast-message">Announcement Message</label>
                  <textarea
                    id="broadcast-message"
                    className="modern-input"
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    placeholder="e.g. Check out the latest win probability projections..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group" style={{ marginTop: '12px' }}>
                  <label htmlFor="broadcast-type">Announcement Type</label>
                  <select
                    id="broadcast-type"
                    className="modern-input"
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value)}
                  >
                    <option value="info">General Info</option>
                    <option value="update">New Feature / Update</option>
                    <option value="alert">System Alert</option>
                    <option value="promo">Promotion</option>
                  </select>
                </div>

                {broadcastStatus.text && (
                  <div style={{ marginTop: '10px', fontSize: '0.88rem', minHeight: '20px' }}>
                    {broadcastStatus.type === 'success' ? (
                      <span style={{ color: '#2ecc71' }}><i className="fa-solid fa-circle-check"></i> {broadcastStatus.text}</span>
                    ) : (
                      <span style={{ color: '#ff4b4b' }}><i className="fa-solid fa-triangle-exclamation"></i> {broadcastStatus.text}</span>
                    )}
                  </div>
                )}

                <button type="submit" className="auth-submit-btn" style={{ marginTop: '14px' }} disabled={isSendingBroadcast}>
                  {isSendingBroadcast ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Sending Announcement...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-bullhorn"></i> Send Message to All Users
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
