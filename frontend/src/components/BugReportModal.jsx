import { useState } from 'react';

export default function BugReportModal({ onClose }) {
  const initialEmail = localStorage.getItem('crickait_email') || '';
  const initialUsername = localStorage.getItem('crickait_display_name') || '';

  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState(initialUsername ? `Reported by: ${initialUsername}\n\n` : '');
  const [status, setStatus] = useState({ type: '', text: '' });
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setStatus({ type: '', text: '' });

    try {
      // 1. Submit to Formspree
      const res = await fetch('https://formspree.io/f/xpqeyklq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          subject: `[CrickAIt Bug] ${subject.trim()}`,
          message: message.trim(),
          _subject: `[CrickAIt Bug] ${subject.trim()}`
        })
      });

      if (res.ok) {
        // 2. Trigger auto-reply via EmailJS
        const username = localStorage.getItem('crickait_display_name') || 'User';
        try {
          // emailjs is loaded globally in index.html
          if (window.emailjs) {
            await window.emailjs.send("service_dvblxgd", "template_mbat837", {
              to_email: email.trim(),
              to_name: username,
              bug_subject: subject.trim()
            });
            console.log("EmailJS auto-reply sent successfully.");
          }
        } catch (emailErr) {
          console.error("EmailJS auto-reply failed:", emailErr);
        }

        setStatus({ type: 'success', text: 'Thank you! Your report has been sent.' });
        setTimeout(onClose, 2500);
      } else {
        const data = await res.json();
        setStatus({ type: 'error', text: data.error || 'Failed to send. Please try again.' });
        setIsSending(false);
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Network error. Please try again.' });
      setIsSending(false);
    }
  };

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3><i className="fa-solid fa-bug"></i> Report a Bug</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="bug-email">Your Email</label>
              <input
                type="email"
                id="bug-email"
                className="modern-input"
                placeholder="e.g. you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group" style={{ marginTop: '14px' }}>
              <label htmlFor="bug-subject">Subject</label>
              <input
                type="text"
                id="bug-subject"
                className="modern-input"
                placeholder="e.g. Scorecard not loading"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="input-group" style={{ marginTop: '14px' }}>
              <label htmlFor="bug-message">Describe the issue</label>
              <textarea
                id="bug-message"
                className="modern-input"
                rows="5"
                placeholder="What happened? What did you expect to happen?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                style={{ resize: 'vertical', minHeight: '100px' }}
              ></textarea>
            </div>

            {status.text && (
              <div style={{ marginTop: '10px', fontSize: '0.88rem', minHeight: '20px' }}>
                {status.type === 'success' ? (
                  <span style={{ color: '#2ecc71' }}><i className="fa-solid fa-circle-check"></i> {status.text}</span>
                ) : (
                  <span style={{ color: '#ff4b4b' }}><i className="fa-solid fa-triangle-exclamation"></i> {status.text}</span>
                )}
              </div>
            )}

            <button type="submit" className="auth-submit-btn" style={{ marginTop: '14px' }} disabled={isSending}>
              {isSending ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Sending...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i> Send Report
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
