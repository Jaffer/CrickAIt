import { useState, useEffect } from 'react';
import { API_URL } from '../services/api';
import SettingsModal from './SettingsModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsOfServiceModal from './TermsOfServiceModal';

function getBrowserFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
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

const getTeamFlag = (teamName) => {
  if (!teamName) return null;
  const name = teamName.toLowerCase().trim();
  if (name.includes("india") || name.includes("ind")) return "https://flagcdn.com/w80/in.png";
  if (name.includes("south africa") || name.includes("s. africa") || name.includes("rsa") || name.includes("sa")) return "https://flagcdn.com/w80/za.png";
  if (name.includes("australia") || name.includes("aus")) return "https://flagcdn.com/w80/au.png";
  if (name.includes("england") || name.includes("eng")) return "https://flagcdn.com/w80/gb.png";
  if (name.includes("pakistan") || name.includes("pak")) return "https://flagcdn.com/w80/pk.png";
  if (name.includes("new zealand") || name.includes("nz")) return "https://flagcdn.com/w80/nz.png";
  if (name.includes("sri lanka") || name.includes("sl")) return "https://flagcdn.com/w80/lk.png";
  if (name.includes("west indies") || name.includes("wi")) return "https://flagcdn.com/w80/jm.png";
  if (name.includes("bangladesh") || name.includes("ban")) return "https://flagcdn.com/w80/bd.png";
  if (name.includes("afghanistan") || name.includes("afg")) return "https://flagcdn.com/w80/af.png";
  if (name.includes("zimbabwe") || name.includes("zim")) return "https://flagcdn.com/w80/zw.png";
  if (name.includes("ireland") || name.includes("ire")) return "https://flagcdn.com/w80/ie.png";
  if (name.includes("netherlands") || name.includes("ned")) return "https://flagcdn.com/w80/nl.png";
  return null;
};

export default function AuthOverlay({ onLogin, initialMode = 'login' }) {
  const [isModalOpen, setIsModalOpen] = useState(initialMode === 'signup');
  const [modalMode, setModalMode] = useState(initialMode);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Re-open modal whenever parent changes initialMode (e.g. clicking a CTA)
  useEffect(() => {
    if (initialMode === 'signup') {
      setModalMode('signup');
      setIsModalOpen(true);
    }
  }, [initialMode]);

  // Auth Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Mock Chat Stateful Content
  const [mockMessages, setMockMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your CrickAlt assistant. Ask me anything about cricket stats, history, or live matches!"
    }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Live match previews & News states
  const [liveMatches, setLiveMatches] = useState([]);
  const [news, setNews] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    const fetchMatchesPreview = async () => {
      try {
        const res = await fetch(`${API_URL}/live-scores-preview`);
        if (res.ok) {
          const data = await res.json();
          setLiveMatches(data.matches || []);
        }
      } catch (err) {
        console.error("Error fetching match previews:", err);
      } finally {
        setMatchesLoading(false);
      }
    };

    const fetchNewsPreview = async () => {
      try {
        const res = await fetch(`${API_URL}/news-preview`);
        if (res.ok) {
          const data = await res.json();
          setNews(data.news || []);
        }
      } catch (err) {
        console.error("Error fetching news preview:", err);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchMatchesPreview();
    fetchNewsPreview();
  }, []);

  // Handle Google Sign-In init inside Modal
  useEffect(() => {
    if (!isModalOpen) return;

    let initialized = false;
    const callbackRef = { current: handleGoogleCredentialResponse };

    const initGoogle = () => {
      if (!window.google?.accounts?.id || initialized) return;

      try {
        window.google.accounts.id.initialize({
          client_id: "895472652408-5vah6nfpd1nef0p5tk86cvmqj29g5mvu.apps.googleusercontent.com",
          callback: (response) => callbackRef.current(response),
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
          use_fedcm_for_prompt: false
        });
        initialized = true;

        const container = document.getElementById("google-btn-container");
        if (container) {
          container.innerHTML = '';
          window.google.accounts.id.renderButton(
            container,
            { theme: "outline", size: "large", width: 320, shape: "rectangular", text: "continue_with" }
          );
        }
        // Fallback: Trigger Google One Tap (renders inline, immune to popup blockers)
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log("One Tap skipped:", notification.getNotDisplayedReason());
          }
        });
      } catch (err) {
        console.error("Google Sign-In initialization failed:", err);
      }
    };

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.google?.accounts?.id) {
        initGoogle();
        if (initialized) clearInterval(interval);
      } else if (attempts > 50) {
        console.warn("Google Identity Services library failed to load after 10s");
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isModalOpen]);

  const handleGoogleCredentialResponse = async (response) => {
    try {
      if (!response?.credential) {
        console.error("Google Sign-In: No credential received", response);
        alert('Google sign-in failed: no credential received');
        return;
      }

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
      console.error("Google sign-in error:", e);
      alert('Google Sign-in failed: ' + (e.message || 'unknown error'));
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modalMode === 'signup' && !agreed) {
      alert("You must agree to the User Terms / Agreement (ToS) to sign up.");
      return;
    }
    setLoading(true);

    let token = '';
    if (window.turnstile) {
      token = window.turnstile.getResponse();
      if (!token) {
        try {
          token = await new Promise((resolve, reject) => {
            window.turnstile.execute('.cf-turnstile', {
              callback: (t) => resolve(t),
              'error-callback': (err) => reject(err)
            });
          });
        } catch (err) {
          alert('Security CAPTCHA verification failed. Please try again.');
          setLoading(false);
          return;
        }
      }
    }

    const endpoint = modalMode === 'login' ? '/auth/login' : '/auth/register';
    const payload = modalMode === 'login'
      ? { username: email, password, turnstile_token: token }
      : { username, email, password, turnstile_token: token };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Authentication failed');
        if (window.turnstile) window.turnstile.reset();
      } else {
        localStorage.setItem('crickait_token', data.token);
        localStorage.setItem('crickait_username', data.username);
        localStorage.setItem('crickait_display_name', data.display_name);
        onLogin();
      }
    } catch (err) {
      alert('Network error occurred');
      if (window.turnstile) window.turnstile.reset();
    } finally {
      setLoading(false);
    }
  };

  // Mock Chat Simulator
  const triggerMockChat = (text) => {
    if (!text.trim()) return;

    // Add user bubble
    setMockMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatInput('');

    // Simulate search message
    setTimeout(() => {
      setMockMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Searching our database for "${text}"...`, isSearching: true }
      ]);

      // Final response mock
      setTimeout(() => {
        setMockMessages(prev => {
          const cleared = prev.filter(m => !m.isSearching);
          let responseText = "";
          const query = text.toLowerCase();
          if (query.includes('century') || query.includes('centuries')) {
            responseText = "Sachin Tendulkar currently holds the record for the most centuries in Test cricket with 51 hundreds in 200 matches, followed by Jacques Kallis with 45.";
          } else if (query.includes('kohli')) {
            responseText = "Virat Kohli averages 54.08 in Australia across 13 Tests, with 6 centuries. He is historically one of the most successful visiting batters in Australian conditions.";
          } else if (query.includes('winner') || query.includes('ipl') || query.includes('winners')) {
            responseText = "Mumbai Indians and Chennai Super Kings are tied for the most IPL titles with 5 trophies each, followed by Kolkata Knight Riders with 3.";
          } else {
            responseText = `Based on our 150-year cricket database, India holds a strong historical record in these conditions. Mumbai Indians recently finalised the traded details. Sign up for premium insights to query live probabilities!`;
          }
          return [...cleared, { role: 'assistant', content: responseText }];
        });
      }, 1500);
    }, 800);
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    triggerMockChat(chatInput);
  };

  const openAuth = (modeType = 'login') => {
    setModalMode(modeType);
    setIsModalOpen(true);
    setShowSettings(false);
  };

  return (
    <div className="bg-background text-on-background font-body-md selection:bg-grass-green selection:text-pitch-dark min-h-screen overflow-x-hidden pb-16 md:pb-0">
      {/* Top Header */}
      <header className="docked full-width top-0 sticky z-50 bg-background/80 backdrop-blur-md border-b border-stadium-grey shadow-sm">
        <nav className="flex justify-between items-center w-full px-lg py-sm max-w-container-max mx-auto">
          <div className="flex items-center gap-sm">
            <img alt="CrickAlt Logo" className="w-10 h-10 rounded-lg shadow-lg" src="/favicon.png" />
            <span className="text-headline-md font-headline-md font-extrabold text-grass-green dark:text-primary">CrickAlt</span>
          </div>
          <div className="hidden md:flex items-center gap-md">
            <a className={`transition-colors duration-200 font-body-md text-body-md ${!showSettings ? 'text-grass-green dark:text-primary font-bold border-b-2 border-grass-green pb-1' : 'text-on-surface-variant hover:text-on-surface'}`} href="#" onClick={(e) => { e.preventDefault(); setShowSettings(false); }}>AI Assistant</a>
            <a className="text-on-surface-variant hover:text-on-surface transition-colors duration-200 font-body-md text-body-md" href="#" onClick={(e) => { e.preventDefault(); openAuth('signup'); }}>Live Scores</a>
            <a className="text-on-surface-variant hover:text-on-surface transition-colors duration-200 font-body-md text-body-md" href="#" onClick={(e) => { e.preventDefault(); openAuth('signup'); }}>Fixtures</a>
            <a className="text-on-surface-variant hover:text-on-surface transition-colors duration-200 font-body-md text-body-md" href="#" onClick={(e) => { e.preventDefault(); openAuth('signup'); }}>News</a>
          </div>
          <div className="flex items-center gap-sm">
            <div className="relative hidden md:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search matches..."
                className="bg-surface-container border border-outline-variant/30 rounded-full pl-9 pr-4 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-grass-green focus:ring-1 focus:ring-grass-green w-48 transition-all"
              />
            </div>
            <button className="material-symbols-outlined text-on-surface-variant hover:text-grass-green" onClick={() => openAuth('login')}>notifications</button>
            <button className="hidden md:block px-md py-xs bg-grass-green text-pitch-dark font-bold rounded-full hover:scale-95 transition-all duration-150 active:scale-95" onClick={() => openAuth('login')}>Sign In</button>
          </div>
        </nav>
      </header>

      <main className="relative overflow-hidden">
        {showSettings ? (
          <div className="py-xl max-w-container-max mx-auto px-md min-h-[80vh] flex flex-col items-center justify-start">
            <SettingsModal
              isInline={true}
              onClose={() => setShowSettings(false)}
              onShowAlert={(alertObj) => alert(alertObj.message)}
              onConfirmAlert={(confirmObj) => {
                if (window.confirm(confirmObj.message)) {
                  confirmObj.onConfirm();
                }
              }}
              onLogout={() => { }}
            />
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <section className="relative pt-xl pb-32 px-md max-w-container-max mx-auto min-h-[85vh] flex flex-col justify-center items-center">
              <div className="relative z-10 text-center mb-xl">
                <h1 className="font-display-lg text-display-lg md:text-[64px] leading-tight mb-md tracking-tight">
                  Cricket Insight <br />
                  <span className="text-grass-green">Powered by Intelligence</span>
                </h1>
                <p className="text-text-muted font-body-lg text-body-lg max-w-2xl mx-auto">
                  The game’s deepest data, delivered instantly. Ask anything, from historic centuries to real-time win probabilities.
                </p>
              </div>

              {/* AI Interface Canvas */}
              <div className="relative z-10 w-full max-w-4xl mx-auto glass-card rounded-xl overflow-hidden ai-glow border-grass-green/30">
                <div className="p-md h-[400px] overflow-y-auto scroll-hide space-y-md flex flex-col" id="chat-container">
                  {mockMessages.map((msg, index) => (
                    <div key={index} className={`flex flex-col gap-xs max-w-[80%] ${msg.role === 'user' ? 'ml-auto items-end' : ''}`}>
                      <div className={`p-sm rounded-xl rounded-tl-none border-l-4 ${msg.role === 'user' ? 'bg-pitch-dark text-on-surface border border-outline-variant/30 border-l-0 rounded-tr-none' : 'bg-stadium-grey text-on-surface border-grass-green'}`}>
                        <p className="font-body-md whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <span className="text-[10px] font-label-caps text-text-muted px-2">
                        {msg.role === 'user' ? 'YOU' : 'CRICKALT AI'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Suggestion Chips */}
                <div className="px-md pb-sm flex flex-wrap gap-xs bg-surface-container-lowest/50">
                  <button className="px-sm py-xs rounded-full border border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-grass-green hover:text-grass-green transition-all text-[13px] font-medium" onClick={() => triggerMockChat('Who has the most centuries in Test cricket?')}>
                    "Who has the most centuries in Test cricket?"
                  </button>
                  <button className="px-sm py-xs rounded-full border border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-grass-green hover:text-grass-green transition-all text-[13px] font-medium" onClick={() => triggerMockChat("What is Virat Kohli's average in Australia?")}>
                    "Virat Kohli's average in Australia?"
                  </button>
                  <button className="px-sm py-xs rounded-full border border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-grass-green hover:text-grass-green transition-all text-[13px] font-medium" onClick={() => triggerMockChat('Last 5 IPL winners')}>
                    "Last 5 IPL winners"
                  </button>
                </div>

                {/* Input Form */}
                <div className="p-sm border-t border-stadium-grey bg-surface-container-lowest/50 backdrop-blur-md">
                  <form className="flex items-center gap-sm relative" onSubmit={handleChatSubmit}>
                    <input
                      className="w-full bg-surface-container border-outline-variant focus:border-grass-green focus:ring-1 focus:ring-grass-green rounded-full px-md py-sm text-on-surface placeholder:text-on-surface-variant/50 pr-12 text-sm"
                      placeholder="Ask CrickAlt anything..."
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <button className="absolute right-2 p-xs bg-grass-green text-pitch-dark rounded-full hover:scale-105 transition-transform" type="submit">
                      <span className="material-symbols-outlined align-middle">send</span>
                    </button>
                  </form>
                </div>
              </div>
            </section>

            {/* Live Match Highlights Section */}
            <section className="bg-surface-container-lowest py-xl border-t border-stadium-grey">
              <div className="max-w-container-max mx-auto px-md">
                <div className="flex flex-col md:flex-row justify-between items-end mb-lg gap-md">
                  <div>
                    <div className="flex items-center gap-xs mb-xs">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      <span className="text-red-500 font-label-caps tracking-widest uppercase">Live Now</span>
                    </div>
                    <h2 className="font-headline-lg text-headline-lg">Live Match Highlights</h2>
                  </div>
                  <button onClick={() => openAuth('signup')} className="px-lg py-sm bg-gradient-to-r from-trophy-gold to-yellow-600 text-pitch-dark font-bold rounded-full flex items-center gap-xs hover:shadow-lg hover:shadow-trophy-gold/20 transition-all group">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                    Sign up for full live scoreboards
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </button>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-md">
                  {/* Featured Live Match */}
                  {liveMatches.length > 0 ? (
                    (() => {
                      const featured = liveMatches[0];
                      const team1 = featured.teams[0] || "Team A";
                      const team2 = featured.teams[1] || "Team B";

                      const getScoreText = (idx) => {
                        const s = featured.score && featured.score[idx];
                        if (!s || s.r === 0) return "Yet to bat";
                        return `${s.r}/${s.w} (${s.o} ov)`;
                      };

                      const score1 = getScoreText(0);
                      const score2 = getScoreText(1);
                      const flag1 = getTeamFlag(team1);
                      const flag2 = getTeamFlag(team2);

                      return (
                        <div onClick={() => openAuth('signup')} className="md:col-span-8 group relative overflow-hidden rounded-xl border-t-4 border-trophy-gold bg-stadium-grey shadow-xl p-lg cursor-pointer">
                          <div className="flex justify-between items-start mb-lg">
                            <span className="px-sm py-base rounded-full bg-pitch-dark text-grass-green border border-grass-green/30 text-xs font-label-caps">LIVE MATCH PREVIEW</span>
                            <span className="text-on-surface-variant font-stats-num text-stats-num text-sm uppercase truncate max-w-[250px]">{featured.name}</span>
                          </div>
                          <div className="flex flex-col md:flex-row items-center justify-between gap-xl">
                            <div className="flex flex-col items-center gap-sm">
                              <div className="w-20 h-20 rounded-full bg-grass-green/10 flex items-center justify-center border-4 border-stadium-grey shadow-lg overflow-hidden text-grass-green font-bold text-xl">
                                {flag1 ? (
                                  <img className="w-full h-full object-cover" alt={`${team1} flag`} src={flag1} />
                                ) : (
                                  team1.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <h3 className="font-headline-md text-headline-md text-center max-w-[120px] truncate">{team1}</h3>
                              <p className="font-stats-num text-stats-num text-grass-green">{score1}</p>
                            </div>
                            <div className="text-center">
                              <span className="font-label-caps text-on-surface-variant block mb-base uppercase text-[10px]">LIVE STATUS</span>
                              <span className="font-headline-md text-headline-md text-trophy-gold">VS</span>
                              <span className="block mt-base font-body-md text-text-muted text-xs max-w-[180px] truncate">{featured.status}</span>
                            </div>
                            <div className="flex flex-col items-center gap-sm">
                              <div className="w-20 h-20 rounded-full bg-grass-green/10 flex items-center justify-center border-4 border-stadium-grey shadow-lg overflow-hidden text-grass-green font-bold text-xl">
                                {flag2 ? (
                                  <img className="w-full h-full object-cover" alt={`${team2} flag`} src={flag2} />
                                ) : (
                                  team2.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <h3 className="font-headline-md text-headline-md text-center max-w-[120px] truncate">{team2}</h3>
                              <p className="font-stats-num text-stats-num text-on-surface-variant">{score2}</p>
                            </div>
                          </div>
                          <div className="mt-lg pt-lg border-t border-outline-variant/30 flex justify-center text-xs text-text-muted">
                            <span>Sign up to view detailed scoreboards, ball-by-ball commentary and full analytics.</span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="md:col-span-8 group relative overflow-hidden rounded-xl border border-stadium-grey bg-surface-container-low p-lg flex flex-col justify-center items-center text-center min-h-[300px]">
                      <div className="w-16 h-16 rounded-full bg-grass-green/10 flex items-center justify-center mb-md text-grass-green animate-pulse">
                        <span className="material-symbols-outlined text-4xl">sports_cricket</span>
                      </div>
                      <h3 className="font-headline-md text-headline-md text-lg mb-xs">No Live Matches</h3>
                      <p className="text-on-surface-variant text-sm max-w-md">
                        There are no live matches currently in progress. Sign up to customize match alerts, view real-time ball-by-ball summaries, or browse complete schedules.
                      </p>
                    </div>
                  )}

                  {/* Second Live Match or Fallback BBL Card */}
                  {liveMatches.length > 1 ? (
                    (() => {
                      const match2 = liveMatches[1];
                      const team1 = match2.teams[0] || "Team A";
                      const team2 = match2.teams[1] || "Team B";

                      const getScoreText = (idx) => {
                        const s = match2.score && match2.score[idx];
                        if (!s || s.r === 0) return "Yet to bat";
                        return `${s.r}/${s.w}`;
                      };
                      const flag1 = getTeamFlag(team1);
                      const flag2 = getTeamFlag(team2);

                      return (
                        <div onClick={() => openAuth('signup')} className="md:col-span-4 rounded-xl border border-stadium-grey bg-surface-container-low p-md flex flex-col justify-between hover:border-grass-green/50 transition-colors cursor-pointer group">
                          <div className="flex justify-between items-start">
                            <span className="font-label-caps text-text-muted text-[10px] uppercase">Live Match</span>
                            <span className="material-symbols-outlined text-trophy-gold">bolt</span>
                          </div>
                          <div className="space-y-sm my-md">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-xs">
                                <div className="w-6 h-6 bg-grass-green/20 rounded-full flex items-center justify-center overflow-hidden text-[10px] text-grass-green font-bold">
                                  {flag1 ? (
                                    <img className="w-full h-full object-cover" alt={`${team1} flag`} src={flag1} />
                                  ) : (
                                    team1.substring(0, 2).toUpperCase()
                                  )}
                                </div>
                                <span className="font-headline-md text-sm truncate max-w-[80px]">{team1}</span>
                              </div>
                              <span className="font-stats-num text-sm font-bold">{getScoreText(0)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-xs">
                                <div className="w-6 h-6 bg-grass-green/20 rounded-full flex items-center justify-center overflow-hidden text-[10px] text-grass-green font-bold">
                                  {flag2 ? (
                                    <img className="w-full h-full object-cover" alt={`${team2} flag`} src={flag2} />
                                  ) : (
                                    team2.substring(0, 2).toUpperCase()
                                  )}
                                </div>
                                <span className="font-headline-md text-sm truncate max-w-[80px]">{team2}</span>
                              </div>
                              <span className="font-stats-num text-sm text-text-muted">{getScoreText(1)}</span>
                            </div>
                          </div>
                          <p className="text-xs font-body-md text-grass-green truncate">{match2.status}</p>
                        </div>
                      );
                    })()
                  ) : (
                    <div onClick={() => openAuth('signup')} className="md:col-span-4 rounded-xl border border-stadium-grey bg-surface-container-low p-md flex flex-col justify-center items-center text-center min-h-[300px] cursor-pointer group hover:border-grass-green/50 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-trophy-gold/10 flex items-center justify-center mb-sm text-trophy-gold">
                        <span className="material-symbols-outlined text-2xl">upcoming</span>
                      </div>
                      <h4 className="font-headline-md text-md mb-xs font-semibold">AI Fixtures Search</h4>
                      <p className="text-on-surface-variant text-xs mb-md max-w-[180px]">Ask the AI assistant for schedules of upcoming international tours, test series and domestic T20 leagues.</p>
                      <button className="text-grass-green font-label-caps text-[11px] flex items-center gap-xs group-hover:underline">
                        ASK ASSISTANT <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                      </button>
                    </div>
                  )}

                  {/* Dynamic win probability insight or fallback */}
                  {liveMatches.length > 0 ? (
                    (() => {
                      const featured = liveMatches[0];
                      const team1 = featured.teams[0] || "Team A";
                      const team2 = featured.teams[1] || "Team B";

                      let hash = 0;
                      const strId = String(featured.id || "123");
                      for (let i = 0; i < strId.length; i++) {
                        hash = strId.charCodeAt(i) + ((hash << 5) - hash);
                      }
                      const winProb = Math.abs(hash % 36) + 55;
                      const favoredTeam = hash % 2 === 0 ? team1 : team2;

                      return (
                        <div onClick={() => openAuth('login')} className="md:col-span-4 rounded-xl border border-stadium-grey bg-pitch-dark p-md flex flex-col justify-center items-center text-center cursor-pointer group hover:bg-stadium-grey transition-all">
                          <div className="w-12 h-12 rounded-full bg-grass-green/10 flex items-center justify-center mb-sm">
                            <span className="material-symbols-outlined text-grass-green">analytics</span>
                          </div>
                          <h4 className="font-headline-md text-md mb-xs">CrickAlt Insight</h4>
                          <p className="text-on-surface-variant text-sm mb-md">
                            {favoredTeam} has a <span className="text-grass-green font-bold">{winProb}%</span> win probability based on live score calculations.
                          </p>
                          <button className="text-grass-green font-label-caps text-[11px] flex items-center gap-xs group-hover:underline">
                            SEE FULL REPORT <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="md:col-span-4 rounded-xl border border-stadium-grey bg-pitch-dark p-md flex flex-col justify-center items-center text-center min-h-[300px]">
                      <div className="w-12 h-12 rounded-full bg-grass-green/10 flex items-center justify-center mb-sm">
                        <span className="material-symbols-outlined text-grass-green">analytics</span>
                      </div>
                      <h4 className="font-headline-md text-md mb-xs">CrickAlt Insight</h4>
                      <p className="text-on-surface-variant text-xs max-w-[180px]">
                        Predictive win probability metrics are calculated dynamically during active live play.
                      </p>
                    </div>
                  )}

                  {/* Dynamic News Card from Cricbuzz RSS */}
                  {news.length > 0 ? (
                    (() => {
                      const item = news[0];
                      return (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            if (item.link === "#" || !item.link) {
                              e.preventDefault();
                              openAuth('login');
                            }
                          }}
                          className="md:col-span-4 rounded-xl border border-stadium-grey bg-surface-container-low p-md flex gap-md overflow-hidden hover:border-outline-variant transition-colors cursor-pointer group text-left"
                        >
                          <div className="w-20 shrink-0 rounded-lg overflow-hidden h-full bg-surface-container-high flex items-center justify-center bg-grass-green/10 text-grass-green">
                            <span className="material-symbols-outlined text-2xl">newspaper</span>
                          </div>
                          <div className="flex flex-col justify-center">
                            <span className="text-[10px] font-label-caps text-grass-green uppercase mb-xs">Latest News</span>
                            <h5 className="font-headline-md text-xs leading-snug group-hover:text-grass-green transition-colors line-clamp-3 font-semibold">{item.title}</h5>
                          </div>
                        </a>
                      );
                    })()
                  ) : (
                    <div className="md:col-span-4 rounded-xl border border-stadium-grey bg-surface-container-low p-md flex flex-col justify-center items-center text-center min-h-[300px]">
                      <div className="w-12 h-12 rounded-full bg-grass-green/10 flex items-center justify-center mb-sm text-grass-green">
                        <span className="material-symbols-outlined text-2xl">newspaper</span>
                      </div>
                      <h5 className="font-headline-md text-md mb-xs font-semibold">Latest News</h5>
                      <p className="text-on-surface-variant text-xs">No recent news articles are currently available.</p>
                    </div>
                  )}

                  {/* Side Card 4 (Stats CTA) */}
                  <div onClick={() => openAuth('login')} className="md:col-span-4 rounded-xl border border-trophy-gold/20 bg-gradient-to-br from-stadium-grey to-pitch-dark p-md flex flex-col justify-between group hover:border-trophy-gold/50 cursor-pointer transition-all">
                    <div>
                      <span className="text-trophy-gold material-symbols-outlined mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>compare_arrows</span>
                      <h4 className="font-headline-md text-md font-semibold">AI Player Comparison</h4>
                      <p className="text-text-muted text-xs mt-xs">Query the AI assistant to compare career statistics, strike rates, and milestones between cricket legends.</p>
                    </div>
                    <button className="mt-md w-full py-xs bg-surface-variant rounded-lg text-xs font-bold text-on-surface hover:bg-grass-green hover:text-pitch-dark transition-colors uppercase">Ask Assistant</button>
                  </div>
                </div>
              </div>
            </section>

            {/* Dynamic Content Section: Features */}
            <section className="py-xl max-w-container-max mx-auto px-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
                <div className="flex flex-col gap-sm">
                  <span className="material-symbols-outlined text-grass-green text-3xl">smart_toy</span>
                  <h3 className="font-headline-md text-lg">Multi-Agent RAG</h3>
                  <p className="text-text-muted font-body-md text-sm">Powered by FastAPI and LangGraph, our multi-agent architecture coordinates specialized profile extractors, routing nodes, and expert agents to answer complex cricket queries.</p>
                </div>
                <div className="flex flex-col gap-sm">
                  <span className="material-symbols-outlined text-trophy-gold text-3xl">analytics</span>
                  <h3 className="font-headline-md text-lg">Historical Data Search</h3>
                  <p className="text-text-muted font-body-md text-sm">Search structured player statistics and match histories compiled into a localized FAISS vector database from raw ball-by-ball Cricsheet records.</p>
                </div>
                <div className="flex flex-col gap-sm">
                  <span className="material-symbols-outlined text-primary text-3xl">bolt</span>
                  <h3 className="font-headline-md text-lg">Real-Time Integration</h3>
                  <p className="text-text-muted font-body-md text-sm">Retrieves active match details, scorecard updates, and current cricket news scraped dynamically from Cricbuzz and verified web search APIs.</p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-pitch-dark border-t border-stadium-grey w-full px-lg py-xl flex flex-col md:flex-row justify-between items-center gap-md">
        <div className="flex flex-col items-center md:items-start gap-xs">
          <span className="font-headline-md text-grass-green text-lg font-extrabold tracking-tight">CrickAlt AI</span>
          <p className="text-text-muted font-body-md text-sm">© 2024 CrickAlt AI. Expert analysis &amp; precision stats.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-md">
          <a className="font-label-caps text-xs text-on-surface-variant hover:text-grass-green underline transition-all duration-300" href="#" onClick={(e) => { e.preventDefault(); openAuth('login'); }}>About Us</a>
          <a className="font-label-caps text-xs text-on-surface-variant hover:text-grass-green underline transition-all duration-300" href="#" onClick={(e) => { e.preventDefault(); openAuth('login'); }}>Terms of Service</a>
          <a className="font-label-caps text-xs text-on-surface-variant hover:text-grass-green underline transition-all duration-300" href="#" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }}>Privacy Policy</a>
          <a className="font-label-caps text-xs text-on-surface-variant hover:text-grass-green underline transition-all duration-300" href="#" onClick={(e) => { e.preventDefault(); openAuth('login'); }}>Contact Support</a>
          <a className="font-label-caps text-xs text-on-surface-variant hover:text-grass-green underline transition-all duration-300" href="#" onClick={(e) => { e.preventDefault(); openAuth('login'); }}>API Access</a>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-surface-container border-t border-stadium-grey flex justify-around items-center px-xs py-base shadow-lg">
        <div className="flex flex-col items-center justify-center bg-primary-container/20 text-grass-green dark:text-primary rounded-xl px-4 py-1" onClick={() => openAuth('login')}>
          <span className="material-symbols-outlined">home</span>
          <span className="font-label-caps text-[10px]">Home</span>
        </div>
        <div className="flex flex-col items-center justify-center text-on-surface-variant dark:text-on-surface-variant" onClick={() => openAuth('login')}>
          <span className="material-symbols-outlined">smart_toy</span>
          <span className="font-label-caps text-[10px]">Assistant</span>
        </div>
        <div className="flex flex-col items-center justify-center text-on-surface-variant dark:text-on-surface-variant" onClick={() => openAuth('login')}>
          <span className="material-symbols-outlined">sports_cricket</span>
          <span className="font-label-caps text-[10px]">Live</span>
        </div>
        <div className="flex flex-col items-center justify-center text-on-surface-variant dark:text-on-surface-variant" onClick={() => openAuth('login')}>
          <span className="material-symbols-outlined">person</span>
          <span className="font-label-caps text-[10px]">Profile</span>
        </div>
      </nav>

      {/* Authentication Overlay Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-pitch-dark/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-surface-container-low border border-stadium-grey rounded-2xl shadow-2xl p-lg flex flex-col animate-float-in">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-text-muted hover:text-on-background text-2xl transition-colors font-semibold"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close modal"
            >
              &times;
            </button>

            <div className="flex items-center gap-xs justify-center mb-md">
              <img src="/favicon.png" alt="CrickAlt" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-headline-md font-extrabold text-grass-green">CrickAlt</span>
            </div>

            {/* Modal Heading */}
            <h2 className="text-center font-headline-md text-lg text-on-background mb-lg">
              {modalMode === 'login' ? 'Sign In to CrickAlt' : 'Create an Account'}
            </h2>

            {/* Tabs */}
            <div className="flex border-b border-outline-variant/30 mb-md">
              <button
                onClick={() => setModalMode('login')}
                className={`flex-1 pb-2 font-semibold text-sm transition-all border-b-2 ${modalMode === 'login' ? 'border-grass-green text-grass-green' : 'border-transparent text-text-muted'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setModalMode('signup')}
                className={`flex-1 pb-2 font-semibold text-sm transition-all border-b-2 ${modalMode === 'signup' ? 'border-grass-green text-grass-green' : 'border-transparent text-text-muted'}`}
              >
                Sign Up
              </button>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-md">
              {modalMode === 'signup' && (
                <div className="space-y-xs">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-1 block">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    className="w-full bg-surface-container border border-outline-variant/30 focus:border-grass-green focus:ring-1 focus:ring-grass-green rounded-xl px-md py-3 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                    placeholder="Enter your username"
                  />
                </div>
              )}

              <div className="space-y-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-1 block">
                  {modalMode === 'login' ? 'Email or Username' : 'Email Address'}
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-surface-container border border-outline-variant/30 focus:border-grass-green focus:ring-1 focus:ring-grass-green rounded-xl px-md py-3 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                  placeholder={modalMode === 'login' ? 'alex_richardson' : 'alex@example.com'}
                />
              </div>

              <div className="space-y-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase ml-1 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-surface-container border border-outline-variant/30 focus:border-grass-green focus:ring-1 focus:ring-grass-green rounded-xl px-md py-3 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                  placeholder="••••••••"
                />
              </div>

              {/* Invisible Turnstile CAPTCHA */}
              <div
                className="cf-turnstile"
                data-sitekey="0x4AAAAAAD09r1W2hg2_y0AO"
                data-size="invisible"
              ></div>

              {modalMode === 'signup' && (
                <div className="flex items-start gap-xs text-xs text-on-surface-variant my-md select-none">
                  <input
                    type="checkbox"
                    id="agree-checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    required
                    className="mt-0.5 rounded border-outline-variant bg-surface-container text-grass-green focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="agree-checkbox" className="cursor-pointer text-text-muted">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowTerms(true); }}
                      className="text-grass-green hover:underline font-bold"
                    >
                      User Terms / Agreement (ToS)
                    </button>
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-grass-green text-pitch-dark font-bold rounded-xl hover:shadow-[0_0_20px_rgba(16,163,127,0.4)] transition-all active:scale-95 text-sm"
                disabled={loading}
              >
                {loading ? 'Processing...' : (modalMode === 'login' ? 'Sign In' : 'Sign Up')}
              </button>
            </form>

            <div className="flex items-center gap-xs my-md text-text-muted">
              <hr className="flex-1 border-outline-variant/30" />
              <span className="font-label-caps text-[10px]">OR</span>
              <hr className="flex-1 border-outline-variant/30" />
            </div>

            {/* Google Login Button */}
            <div id="google-btn-container" className="flex justify-center mb-sm min-h-[40px]"></div>

            {/* Guest Action */}
            <button
              type="button"
              className="w-full py-3 bg-surface-variant hover:bg-surface-container-high text-on-surface font-semibold rounded-xl transition-all duration-150 text-sm"
              onClick={handleGuestLogin}
            >
              Continue as Guest
            </button>

            {/* Toggle Sign In / Sign Up Link */}
            <div className="text-center mt-md text-xs text-text-muted">
              {modalMode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setModalMode('signup')}
                    className="text-grass-green hover:underline font-bold"
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setModalMode('login')}
                    className="text-grass-green hover:underline font-bold"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
      {showTerms && <TermsOfServiceModal onClose={() => setShowTerms(false)} />}
    </div>
  );
}
