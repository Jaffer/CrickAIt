import { useState, useEffect } from 'react';
import { authenticatedFetch, API_URL } from '../services/api';

function getBrowserFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125,1,62,20);
    ctx.fillStyle = "#069";
    ctx.fillText("CrickAIt Fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("CrickAIt Fingerprint", 4, 17);
    const canvasData = canvas.toDataURL();
    
    let hash = 0;
    const inputs = [
      canvasData,
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset()
    ].join('###');
    
    for (let i = 0; i < inputs.length; i++) {
      const char = inputs.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'dev_' + Math.abs(hash).toString(16);
  } catch (e) {
    let fallbackId = localStorage.getItem('crickait_fallback_device_id');
    if (!fallbackId) {
      fallbackId = 'dev_fallback_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('crickait_fallback_device_id', fallbackId);
    }
    return fallbackId;
  }
}

export default function AuthOverlay({ onLogin, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: "895472652408-9tp4qlkqnpb6ufvo61ipsoaet2d0lmai.apps.googleusercontent.com",
          callback: handleGoogleCredentialResponse,
          itp_support: true,
          use_fedcm_for_prompt: true
        });
        const container = document.getElementById("google-btn-container");
        if (container) {
          window.google.accounts.id.renderButton(
            container,
            { theme: "outline", size: "large", width: 360, shape: "rectangular", text: "continue_with" }
          );
          window.google.accounts.id.prompt();
        }
      }
    };

    initGoogle();

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.google) {
        initGoogle();
        clearInterval(interval);
      } else if (attempts > 30) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleClose = async () => {
    const token = localStorage.getItem('crickait_token');
    if (token) {
      onLogin();
      return;
    }

    try {
      const deviceId = getBrowserFingerprint();
      const res = await fetch(`${API_URL}/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('crickait_token', data.token);
        localStorage.setItem('crickait_username', data.username);
        localStorage.setItem('crickait_display_name', data.display_name);
        localStorage.setItem('crickait_plan', 'guest');
        onLogin();
      } else {
        alert('Guest login failed. Please try again.');
      }
    } catch (e) {
      console.error(e);
      alert('Guest login failed due to network error.');
    }
  };

  const handleGoogleCredentialResponse = async (response) => {
    try {
      const payloadBase64Url = response.credential.split('.')[1];
      let payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
      while (payloadBase64.length % 4) {
          payloadBase64 += '=';
      }
      const payloadJson = decodeURIComponent(atob(payloadBase64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(payloadJson);

      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: payload.email,
            display_name: payload.name || payload.email.split('@')[0]
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Google sign-in failed');
        return;
      }
      localStorage.setItem('crickait_token', data.token);
      localStorage.setItem('crickait_username', data.username);
      localStorage.setItem('crickait_display_name', data.display_name);
      onLogin();
    } catch (e) {
      console.error(e);
      alert('Google Sign-in failed due to network error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
    const payload = mode === 'login' 
        ? { username: email, password } 
        : { username, email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Authentication failed');
      } else {
        localStorage.setItem('crickait_token', data.token);
        localStorage.setItem('crickait_username', data.username);
        localStorage.setItem('crickait_display_name', data.display_name);
        onLogin();
      }
    } catch (err) {
      alert('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" style={{display: 'flex'}}>
      <div className="auth-card">
        <button className="close-auth" onClick={handleClose} aria-label="Close Auth Overlay">&times;</button>
        <div className="auth-logo"><img src="/favicon.png" alt="CrickAIt Logo" /></div>
        <h2>Welcome to CrickAIt</h2>
        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="input-group">
              <label>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
          )}
          <div className="input-group">
            <label>{mode === 'login' ? 'Email / Username' : 'Email'}</label>
            <input type="text" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>
        <div className="auth-divider"><span>OR</span></div>
        <div id="google-btn-container" style={{display: 'flex', justifyContent: 'center', marginBottom: '20px'}}></div>
        <div className="auth-toggle">
          <span>{mode === 'login' ? "Don't have an account?" : "Already have an account?"}</span>
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
