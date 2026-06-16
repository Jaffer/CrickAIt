import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../services/api';

export default function PersonalizationModal({ onClose, onShowAlert }) {
  const [expertise, setExpertise] = useState('Standard');
  const [theme, setTheme] = useState(localStorage.getItem('crickait_theme') || 'dark');
  const [verbosity, setVerbosity] = useState(localStorage.getItem('crickait_verbosity') || '2');
  const [formats, setFormats] = useState({ T20: true, ODI: true, Test: true });
  const [rivalTeams, setRivalTeams] = useState('');

  useEffect(() => {
    loadPersonalization();
    applyTheme(theme);
  }, []);

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
      root.style.setProperty('--accent', '#00d26a');
    }
    localStorage.setItem('crickait_theme', themeValue);
  };

  const handleThemeChange = (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formatsList = Object.keys(formats).filter(k => formats[k]);
    const rivals = rivalTeams ? rivalTeams.split(',').map(s => s.trim()).filter(Boolean) : [];

    localStorage.setItem('crickait_verbosity', verbosity);

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
        onShowAlert({
          title: 'Notification',
          message: 'Preferences saved successfully!'
        });
        onClose();
      } else {
        onShowAlert({
          title: 'Notification',
          message: 'Failed to save preferences.'
        });
      }
    } catch (err) {
      console.error(err);
      onShowAlert({
        title: 'Notification',
        message: 'Error saving preferences.'
      });
    }
  };

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3><i className="fa-solid fa-sliders"></i> Personalization</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="expertise-level"><i className="fa-solid fa-brain"></i> Cricket Expertise</label>
              <select
                id="expertise-level"
                className="modern-select"
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
              >
                <option value="Casual">Casual Fan</option>
                <option value="Standard">Standard</option>
                <option value="Expert">Expert Analyst</option>
                <option value="Tactician">Tactician</option>
              </select>
            </div>

            <div className="input-group">
              <label><i className="fa-solid fa-palette"></i> App Theme</label>
              <select
                className="modern-select"
                value={theme}
                onChange={handleThemeChange}
              >
                <option value="dark">Classic Dark</option>
                <option value="green">Pitch Green</option>
                <option value="light">Stadium Light</option>
              </select>
            </div>

            <div className="input-group">
              <label><i className="fa-solid fa-text-height"></i> Response Verbosity</label>
              <div className="slider-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="slider-label">Concise</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  className="modern-slider"
                  value={verbosity}
                  onChange={(e) => setVerbosity(e.target.value)}
                />
                <span className="slider-label">Detailed</span>
              </div>
            </div>

            <div className="input-group">
              <label><i className="fa-solid fa-trophy"></i> Preferred Formats</label>
              <div className="modern-checkbox-group" style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                {['T20', 'ODI', 'Test'].map(fmt => (
                  <label key={fmt} className="format-chip" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formats[fmt]}
                      onChange={(e) => setFormats({ ...formats, [fmt]: e.target.checked })}
                    />
                    <span>{fmt === 'Test' ? 'Test Match' : fmt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="rival-teams"><i className="fa-solid fa-hand-middle-finger"></i> Disliked Rival Teams</label>
              <input
                type="text"
                id="rival-teams"
                className="modern-input"
                placeholder="e.g. Australia, Mumbai Indians"
                value={rivalTeams}
                onChange={(e) => setRivalTeams(e.target.value)}
              />
            </div>
            <button type="submit" className="auth-submit-btn">
              <i className="fa-solid fa-floppy-disk"></i> Save Preferences
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
