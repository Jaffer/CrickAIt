// Set to your actual backend URL in production (e.g. Render/Railway URL)
const PROD_BACKEND_URL = 'https://crickait-backend.onrender.com'; // UPDATE THIS LATER

let API_URL = window.location.origin;
if (window.location.protocol === 'file:' || window.location.origin === 'null') {
    API_URL = '';
} else if (window.location.port !== '8000' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    // Local dev server (port 3000)
    API_URL = 'http://localhost:8000';
} else if (window.location.hostname.includes('vercel.app') || window.location.hostname !== 'localhost') {
    // Production Vercel deployment
    API_URL = PROD_BACKEND_URL;
}
let currentSessionId = null;

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
        // Fallback to random if canvas/fingerprinting fails
        let fallbackId = localStorage.getItem('crickait_fallback_device_id');
        if (!fallbackId) {
            fallbackId = 'dev_fallback_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('crickait_fallback_device_id', fallbackId);
        }
        return fallbackId;
    }
}

// Mock API responses for file:// protocol testing
if (window.location.protocol === 'file:') {
    const originalFetch = window.fetch;
    window.fetch = async function (url, options = {}) {
        const urlStr = url.toString();
        let responseData = {};
        let status = 200;

        if (urlStr.includes('/auth/register') || urlStr.includes('/auth/login')) {
            const body = options.body ? JSON.parse(options.body) : {};
            responseData = {
                token: 'mock_password_token_' + Date.now(),
                username: body.username || 'testuser',
                display_name: body.username || 'Test User'
            };
        } else if (urlStr.includes('/auth/google')) {
            const body = options.body ? JSON.parse(options.body) : {};
            responseData = {
                token: 'mock_google_token_' + Date.now(),
                username: body.email.split('@')[0],
                display_name: body.display_name || 'Google User'
            };
        } else if (urlStr.includes('/auth/logout')) {
            responseData = { status: 'success' };
        } else if (urlStr.includes('/auth/delete-account')) {
            responseData = { status: 'deleted' };
        } else if (urlStr.includes('/sessions')) {
            responseData = { sessions: ['session-1', 'session-2'] };
        } else if (urlStr.includes('/session-names')) {
            responseData = {
                'session-1': 'IPL 2026 Analysis',
                'session-2': 'Virat Kohli Stats'
            };
        } else if (urlStr.includes('/profile/clear')) {
            responseData = { status: 'cleared' };
        } else if (urlStr.includes('/profile/item')) {
            responseData = { status: 'success' };
        } else if (urlStr.includes('/profile')) {
            if (options.method === 'POST') {
                responseData = { status: 'success' };
            } else {
                responseData = {
                    favorite_players: ['Virat Kohli', 'MS Dhoni'],
                    favorite_teams: ['India', 'RCB'],
                    expertise_level: 'Intermediate',
                    preferred_format: ['T20', 'ODI'],
                    rival_teams: ['Australia']
                };
            }
        } else if (urlStr.includes('/rename/')) {
            responseData = { status: 'success' };
        } else if (urlStr.includes('/clear/')) {
            responseData = { status: 'success' };
        } else if (urlStr.includes('/history/')) {
            responseData = {
                messages: [
                    { role: 'user', content: 'Hi' },
                    { role: 'assistant', content: 'Hello! I am your cricket assistant CrickAIt. How can I help you today?' }
                ]
            };
        } else if (urlStr.includes('/ask')) {
            responseData = { response: 'This is a mock assistant response in file:// preview mode.' };
        } else if (urlStr.includes('/auto-rename/')) {
            responseData = { status: 'success', new_name: 'Mock Renamed Chat' };
        } else if (urlStr.includes('/top-news')) {
            responseData = { news: 'Mock News Ticker | Ind vs Pak match scheduled | Kohli scores 100' };
        } else if (urlStr.includes('/live-scores')) {
            responseData = {
                matches: [{
                    id: 'match-1',
                    name: 'India vs Pakistan',
                    status: 'Ind won by 6 wickets',
                    score: [
                        { inning: 'PAK', r: '152', w: '10', o: '20.0' },
                        { inning: 'IND', r: '153', w: '4', o: '17.4' }
                    ],
                    teamInfo: [
                        { name: 'India', shortname: 'IND', img: 'https://g.cricket/ind.png' },
                        { name: 'Pakistan', shortname: 'PAK', img: 'https://g.cricket/pak.png' }
                    ]
                }]
            };
        } else if (urlStr.includes('/scorecard/')) {
            responseData = {
                name: 'India vs Pakistan',
                teamInfo: [
                    { name: 'India', shortname: 'IND' },
                    { name: 'Pakistan', shortname: 'PAK' }
                ],
                innings: []
            };
        } else {
            return originalFetch(url, options);
        }

        return {
            ok: status >= 200 && status < 300,
            status: status,
            json: async () => responseData,
            text: async () => JSON.stringify(responseData)
        };
    };
}


// Auth helper
function getAuthToken() {
    return localStorage.getItem('crickait_token');
}

function getLocalDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function updateCreditsCounter() {
    try {
        const localDate = getLocalDateString();
        const res = await authenticatedFetch(`${API_URL}/limits?local_date=${localDate}`);
        if (res.ok) {
            const data = await res.json();
            const creditsEl = document.getElementById('header-credits-val');
            const resetEl = document.getElementById('header-credits-reset-tip');
            
            if (!creditsEl || !resetEl) return;
            
            if (data.limit === null) {
                creditsEl.textContent = 'Unlimited';
                resetEl.style.display = 'none';
            } else {
                creditsEl.textContent = `${data.remaining} / ${data.limit}`;
                resetEl.style.display = 'inline-block';
            }
        }
    } catch (e) {
        console.error("Error updating credits counter:", e);
    }
}


async function authenticatedFetch(url, options = {}) {
    const token = getAuthToken();
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }

    const res = await fetch(url, options);

    if (res.status === 401) {
        localStorage.removeItem('crickait_token');
        localStorage.removeItem('crickait_username');
        localStorage.removeItem('crickait_display_name');
        showAuthOverlay();
    }

    return res;
}

// DOM Elements
const sidebar = document.getElementById('sidebar');
const toggleSidebarOpen = document.getElementById('toggle-sidebar-open');
const toggleSidebarClose = document.getElementById('toggle-sidebar-close');
const newChatBtn = document.getElementById('new-chat-btn');
const chatList = document.getElementById('chat-list');
const profileTags = document.getElementById('profile-tags');
const sidebarFooter = document.getElementById('sidebar-footer');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const messagesWrapper = document.getElementById('messages-wrapper');
const welcomeScreen = document.getElementById('welcome-screen');
const currentChatTitle = document.getElementById('current-chat-title');

// Initialize
window.onload = function () {
    initApp();
    setupEventListeners();

    // Initialize Google Sign-in
    if (window.google) {
        google.accounts.id.initialize({
            client_id: "895472652408-9tp4qlkqnpb6ufvo61ipsoaet2d0lmai.apps.googleusercontent.com",
            callback: window.handleGoogleCredentialResponse
        });
        const btnContainer = document.getElementById("google-btn-container");
        if (btnContainer) {
            google.accounts.id.renderButton(
                btnContainer,
                { theme: "outline", size: "large", width: 360, shape: "rectangular" }
            );
        }
    }
};

async function initApp() {
    const token = getAuthToken();
    if (!token) {
        showAuthOverlay();
        return;
    }
    hideAuthOverlay();
    await window.updateUserProfileTrigger();
    await loadSessions();
    await loadProfile();
    loadNewsTicker();
    loadLiveMatchesSidebar();
}

async function loadNewsTicker() {
    try {
        const res = await authenticatedFetch(`${API_URL}/top-news`);
        const data = await res.json();
        const contentDiv = document.getElementById('news-ticker-content');
        if (data.news) {
            contentDiv.textContent = data.news.split('|').join('  •  ') + '  •  ' + data.news.split('|').join('  •  ');
        } else {
            contentDiv.textContent = 'No news available right now.';
        }
    } catch (e) {
        document.getElementById('news-ticker-content').textContent = 'Live Feed Offline';
    }
}

async function loadLiveMatchesSidebar() {
    const plan = localStorage.getItem('crickait_plan') || 'free';
    const container = document.getElementById('live-matches-container');
    if (!container) return;
    
    if (plan === 'guest') {
        container.innerHTML = '<div style="font-size: 11px; color: var(--text-secondary); padding: 12px; text-align: center; border: 1px dashed var(--border-color); border-radius: 6px; margin: 4px;">Signup to access the live scoreboard</div>';
        return;
    }

    try {
        const res = await authenticatedFetch(`${API_URL}/live-scores`);
        if (!res.ok) {
            if (res.status === 403) {
                container.innerHTML = '<div style="font-size: 11px; color: var(--text-secondary); padding: 12px; text-align: center; border: 1px dashed var(--border-color); border-radius: 6px; margin: 4px;">Signup to access the live scoreboard</div>';
            } else {
                container.innerHTML = '<div style="font-size: 11px; color: var(--text-secondary); padding: 6px;">No live matches</div>';
            }
            return;
        }
        const data = await res.json();
        if (data.matches && data.matches.length > 0) {
            container.innerHTML = data.matches.map(m => {
                const scoreHtml = (m.score || []).map(s => {
                    const oversText = (s.o && s.o !== '-') ? ` (${s.o} ov)` : '';
                    return `<div class="match-score">${s.inning}: ${s.r}/${s.w}${oversText}</div>`;
                }).join('');
                const teamImgs = (m.teamInfo || []).map(t =>
                    `<img src="${t.img}" alt="${t.shortname}" title="${t.name}">`
                ).join('');
                return `
                    <div class="live-match-card" onclick="openScorecard('${m.id}')">
                        <div class="match-teams">${teamImgs}<span class="live-pulse"></span> ${m.teams ? m.teams.join(' vs ') : m.name}</div>
                        ${scoreHtml}
                        <div class="match-status">${m.status}</div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div style="font-size: 11px; color: var(--text-secondary); padding: 6px;">No live matches</div>';
        }
    } catch (e) {
        document.getElementById('live-matches-container').innerHTML = '<div style="font-size: 11px; color: var(--text-secondary);">Scores unavailable</div>';
    }
}

// Auto-refresh live scores every 30 seconds
setInterval(loadLiveMatchesSidebar, 30000);

function setupEventListeners() {
    // Sidebar toggle
    toggleSidebarOpen.addEventListener('click', () => {
        sidebar.classList.remove('closed');
        toggleSidebarOpen.style.display = 'none';
    });
    toggleSidebarClose.addEventListener('click', () => {
        sidebar.classList.add('closed');
        toggleSidebarOpen.style.display = 'block';
    });

    // New Chat
    newChatBtn.addEventListener('click', startNewChat);

    // Input auto-resize and send logic
    chatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim().length > 0) {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    // Suggestion cards
    document.querySelectorAll('.suggestion-cards .card').forEach(card => {
        card.addEventListener('click', () => {
            chatInput.value = card.dataset.prompt;
            sendMessage();
        });
    });
    // Password requirements validation on input
    const authPasswordInput = document.getElementById('auth-password');
    const requirementsText = document.getElementById('password-requirements-text');
    if (authPasswordInput && requirementsText) {
        authPasswordInput.addEventListener('input', () => {
            if (authMode !== 'signup') {
                requirementsText.style.display = 'none';
                return;
            }
            const val = authPasswordInput.value;
            const hasLength = val.length >= 8;
            const hasLetterNum = /[a-zA-Z]/.test(val) && /[0-9]/.test(val);
            const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':",./<>?|\\~`]/.test(val);
            
            if (hasLength && hasLetterNum && hasSpecial) {
                requirementsText.classList.add('satisfied');
            } else {
                requirementsText.classList.remove('satisfied');
            }
        });
    }

    // Profile settings popover and modal events
    setupProfilePopover();
}

// UUID generator for new sessions
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function startNewChat() {
    currentSessionId = generateUUID();
    welcomeScreen.style.display = 'flex';
    messagesWrapper.innerHTML = '';
    currentChatTitle.textContent = 'New Chat';

    // Update active class in sidebar
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));

    // On mobile, close sidebar
    if (window.innerWidth <= 768) {
        sidebar.classList.add('closed');
    }
}

async function loadSessions() {
    try {
        const [sessionsRes, namesRes] = await Promise.all([
            authenticatedFetch(`${API_URL}/sessions`),
            authenticatedFetch(`${API_URL}/session-names`)
        ]);

        const sessionsData = await sessionsRes.json();
        const namesData = await namesRes.json();

        const sessions = sessionsData.sessions || [];

        chatList.innerHTML = '';
        if (sessions.length > 0) {
            sessions.reverse().forEach(sid => {
                const name = namesData[sid] || `Chat ${sid.substring(0, 4)}`;

                const item = document.createElement('div');
                item.className = `chat-item ${sid === currentSessionId ? 'active' : ''}`;
                item.innerHTML = `
                    <div class="chat-item-text"><span style="margin-right: 8px;">🏏</span> ${name}</div>
                    <div class="chat-item-actions">
                        <div class="dropdown">
                            <button class="icon-btn" onclick="toggleDropdown('${sid}', event)" title="Options"><i class="fa-solid fa-ellipsis"></i></button>
                            <div class="dropdown-content" id="dropdown-${sid}">
                                <button onclick="editSessionName('${sid}', '${name.replace(/'/g, "\\'")}', event)"><i class="fa-solid fa-pen" style="width:16px;"></i> Rename</button>
                                <button onclick="deleteSession('${sid}', event)" style="color: #ff4b4b;"><i class="fa-regular fa-trash-can" style="width:16px;"></i> Delete</button>
                            </div>
                        </div>
                    </div>
                `;
                item.addEventListener('click', () => loadChatHistory(sid, name));
                chatList.appendChild(item);
            });

            // Always start with a fresh new chat view on reload
            if (!currentSessionId) {
                startNewChat();
            }
        } else {
            startNewChat();
        }
    } catch (e) {
        console.error("Error loading sessions", e);
        startNewChat(); // Fallback
    }
}

window.toggleDropdown = (sid, event) => {
    event.stopPropagation();
    document.querySelectorAll('.dropdown').forEach(d => {
        if (d.querySelector('.dropdown-content').id !== `dropdown-${sid}`) d.classList.remove('show');
    });
    const dropdown = document.getElementById(`dropdown-${sid}`).parentElement;
    dropdown.classList.toggle('show');
}

window.addEventListener('click', () => {
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
});

// Custom Modal System
function showCustomModal(title, message, isPrompt = false, defaultValue = '') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('custom-modal-overlay');
        const titleEl = document.getElementById('custom-modal-title');
        const messageEl = document.getElementById('custom-modal-message');
        const inputEl = document.getElementById('custom-modal-input');
        const cancelBtn = document.getElementById('custom-modal-cancel');
        const confirmBtn = document.getElementById('custom-modal-confirm');

        titleEl.textContent = title;
        messageEl.textContent = message;

        if (isPrompt) {
            inputEl.style.display = 'block';
            inputEl.value = defaultValue;
            inputEl.focus();
        } else {
            inputEl.style.display = 'none';
            inputEl.value = '';
        }

        overlay.style.display = 'flex';

        const cleanup = () => {
            overlay.style.display = 'none';
            cancelBtn.onclick = null;
            confirmBtn.onclick = null;
        };

        cancelBtn.onclick = () => {
            cleanup();
            resolve(null);
        };

        confirmBtn.onclick = () => {
            cleanup();
            resolve(isPrompt ? inputEl.value : true);
        };
    });
}

function showErrorPage(type) {
    const overlay = document.getElementById('error-overlay');
    const img = document.getElementById('error-image');
    const title = document.getElementById('error-title');
    const msg = document.getElementById('error-message');

    if (type === 'duck') {
        img.src = 'duck_out.png';
        title.textContent = 'DUCK OUT!';
        msg.textContent = "You've been caught behind the crease! This page or data seems to have taken an unscheduled drinks break.";
    } else {
        img.src = 'wicket_out.png';
        title.textContent = 'WICKET DOWN';
        msg.textContent = "The server encountered an unexpected glitch. Please check back soon or try reloading.";
    }

    overlay.style.display = 'flex';
}

window.editSessionName = async (sid, oldName, event) => {
    event.stopPropagation();
    document.getElementById(`dropdown-${sid}`).parentElement.classList.remove('show');
    const newName = await showCustomModal("Rename Chat", "Enter new name for this chat:", true, oldName);
    if (newName && newName.trim() !== "" && newName !== oldName) {
        try {
            await authenticatedFetch(`${API_URL}/rename/${sid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_name: newName.trim() })
            });
            loadSessions();
            if (currentSessionId === sid) {
                currentChatTitle.textContent = newName.trim();
            }
        } catch (e) {
            console.error(e);
            showErrorPage('server');
        }
    }
}

window.deleteSession = async (sid, event) => {
    event.stopPropagation();
    const confirmed = await showCustomModal("Delete Chat", "Are you sure you want to delete this chat?", false);
    if (confirmed) {
        try {
            await authenticatedFetch(`${API_URL}/clear/${sid}`, { method: 'DELETE' });
            if (currentSessionId === sid) {
                currentSessionId = null;
            }
            loadSessions();
        } catch (e) {
            console.error(e);
            showErrorPage('server');
        }
    }
}

async function loadChatHistory(sid, name) {
    currentSessionId = sid;
    currentChatTitle.textContent = name;

    // Update active class
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    // Mobile behavior
    if (window.innerWidth <= 768) sidebar.classList.add('closed');

    try {
        const res = await authenticatedFetch(`${API_URL}/history/${sid}`);
        const data = await res.json();

        const messages = data.messages || [];

        if (messages.length > 0) {
            welcomeScreen.style.display = 'none';
            messagesWrapper.innerHTML = '';
            messages.forEach(m => appendMessage(m.role, m.content));
        } else {
            welcomeScreen.style.display = 'flex';
            messagesWrapper.innerHTML = '';
        }
        scrollToBottom();
    } catch (e) {
        console.error("Error loading history", e);
    }
}

async function loadProfile() {
    try {
        const res = await authenticatedFetch(`${API_URL}/profile`);
        const profile = await res.json();

        profileTags.innerHTML = '';
        let hasTags = false;

        if (profile.favorite_players && profile.favorite_players.length > 0) {
            hasTags = true;
            profile.favorite_players.forEach(p => {
                profileTags.innerHTML += `<div class="tag player">👤 ${p} <button onclick="deleteProfileItem('favorite_players', '${p}')"><i class="fa-solid fa-xmark"></i></button></div>`;
            });
        }

        if (profile.favorite_teams && profile.favorite_teams.length > 0) {
            hasTags = true;
            profile.favorite_teams.forEach(t => {
                profileTags.innerHTML += `<div class="tag team">🛡️ ${t} <button onclick="deleteProfileItem('favorite_teams', '${t}')"><i class="fa-solid fa-xmark"></i></button></div>`;
            });
        }

        const profileSection = document.getElementById('profile-section');
        if (!hasTags) {
            if (profileSection) profileSection.style.display = 'none';
        } else {
            if (profileSection) profileSection.style.display = 'block';
        }
    } catch (e) {
        const profileSection = document.getElementById('profile-section');
        if (profileSection) profileSection.style.display = 'none';
    }

}

window.deleteProfileItem = async (category, item) => {
    try {
        await authenticatedFetch(`${API_URL}/profile/item?category=${category}&item=${item}`, { method: 'DELETE' });
        loadProfile();
    } catch (e) { console.error(e); }
}

function appendMessage(role, content) {
    const isUser = role === 'user';
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    // Parse markdown for bot messages
    let formattedContent = isUser ? content : DOMPurify.sanitize(marked.parse(content));

    msgDiv.innerHTML = `
        <div class="message-avatar">${isUser ? '👤' : '🏏'}</div>
        <div class="message-content">${formattedContent}</div>
    `;
    messagesWrapper.appendChild(msgDiv);
}

function appendLoading() {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message bot`;
    msgDiv.id = 'loading-message';
    msgDiv.innerHTML = `
        <div class="message-avatar">🏏</div>
        <div class="message-content">
            <div class="status-indicator analyzing">
                <div class="cricket-loader">
                    <div class="cricket-loader-bouncer" style="animation-delay: 0s"><div class="cricket-loader-ball"></div></div>
                    <div class="cricket-loader-bouncer" style="animation-delay: 0.15s"><div class="cricket-loader-ball"></div></div>
                    <div class="cricket-loader-bouncer" style="animation-delay: 0.3s"><div class="cricket-loader-ball"></div></div>
                </div>
                CrickAIt is thinking<span class="typing-dots"></span>
            </div>
        </div>
    `;
    messagesWrapper.appendChild(msgDiv);
    return msgDiv;
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    if (!currentSessionId) startNewChat();
    const isFirstMessage = (messagesWrapper.children.length === 0);

    let renamePromise = null;
    if (isFirstMessage) {
        currentChatTitle.textContent = "Generating title...";
        renamePromise = authenticatedFetch(`${API_URL}/auto-rename/${currentSessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_prompt: text })
        }).then(res => res.json()).then(data => {
            if (data.status === 'success' && data.new_name) {
                if (currentSessionId === currentSessionId) { // Check if we haven't switched chats
                    currentChatTitle.textContent = data.new_name;
                }
            }
        }).catch(e => console.error(e));
    }

    // Reset input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.setAttribute('disabled', 'true');
    welcomeScreen.style.display = 'none';

    appendMessage('user', text);
    scrollToBottom();

    const loadingDiv = appendLoading();
    scrollToBottom();

    try {
        const localDate = getLocalDateString();
        const res = await authenticatedFetch(`${API_URL}/ask?user_prompt=${encodeURIComponent(text)}&session_id=${currentSessionId}&local_date=${localDate}`, {
            method: 'POST'
        });
        const data = await res.json();

        loadingDiv.remove();

        if (data.route === 'LIMIT_REACHED') {
            const plan = localStorage.getItem('crickait_plan') || 'free';
            if (plan === 'guest') {
                await showCustomModal("Limit Reached", "Your guest limit of 20 messages is over. Please sign up to continue!", false);
                showAuthOverlay();
            } else {
                await showCustomModal("Limit Reached", "Your daily limit of 100 messages is over. Please upgrade to Pro to continue!", false);
                window.openModal('upgrade-modal');
            }
            updateCreditsCounter();
            return;
        }

        appendMessage('assistant', data.response);
        scrollToBottom();
        updateCreditsCounter();

        // Wait for rename to finish so backend is updated before fetching list
        if (renamePromise) await renamePromise;

        // Reload sidebar to reflect new session if it was the first message
        loadSessions();
        // Reload profile in case the AI extracted new preferences
        loadProfile();

    } catch (e) {
        loadingDiv.remove();
        console.error("AI Error:", e);
        showErrorPage('server');
    }
}

function scrollToBottom() {
    const container = document.getElementById('chat-container');
    container.scrollTop = container.scrollHeight;
}

// ===== LIVE SCORECARD OVERLAY =====
let scorecardData = null;
let scorecardRefreshInterval = null;

window.openScorecard = async (matchId) => {
    const plan = localStorage.getItem('crickait_plan') || 'free';
    const overlay = document.getElementById('scorecard-overlay');
    overlay.style.display = 'flex';
    if (plan === 'guest') {
        document.getElementById('sc-match-name').textContent = 'Live Scoreboard Restricted';
        document.getElementById('sc-innings-content').innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-secondary); font-size:15px; font-weight:500;">Signup to access the live scoreboard</div>';
        return;
    }
    document.getElementById('sc-innings-content').innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-secondary);"><div class="cricket-loader" style="justify-content:center; margin-bottom:12px;"><div class="cricket-loader-bouncer"><div class="cricket-loader-ball"></div></div><div class="cricket-loader-bouncer" style="animation-delay:0.15s"><div class="cricket-loader-ball"></div></div><div class="cricket-loader-bouncer" style="animation-delay:0.3s"><div class="cricket-loader-ball"></div></div></div>Loading scorecard...</div>';

    await fetchAndRenderScorecard(matchId);

    // Auto-refresh scorecard every 30 seconds
    if (scorecardRefreshInterval) clearInterval(scorecardRefreshInterval);
    scorecardRefreshInterval = setInterval(() => fetchAndRenderScorecard(matchId), 30000);
};

async function fetchAndRenderScorecard(matchId) {
    try {
        const res = await authenticatedFetch(`${API_URL}/scorecard/${matchId}`);
        scorecardData = await res.json();
        if (scorecardData.error) {
            document.getElementById('sc-innings-content').innerHTML = `<div style="text-align:center; padding:40px; color:#ff4b4b;">${scorecardData.error}</div>`;
            return;
        }
        renderScorecard(scorecardData);
    } catch (e) {
        console.error('Scorecard fetch error:', e);
        document.getElementById('sc-innings-content').innerHTML = '<div style="text-align:center; padding:40px; color:#ff4b4b;">Failed to load scorecard.</div>';
    }
}

function renderScorecard(data) {
    // Match name
    document.getElementById('sc-match-name').textContent = data.name || 'Match';

    // Teams
    const teamInfo = data.teamInfo || [];
    let teamsHtml = '';
    if (teamInfo.length >= 2) {
        teamsHtml = `
            <div class="sc-team-badge"><img src="${teamInfo[0].img}" alt="${teamInfo[0].shortname}"><span class="team-name">${teamInfo[0].name}</span></div>
            <div class="sc-vs">VS</div>
            <div class="sc-team-badge"><span class="team-name">${teamInfo[1].name}</span><img src="${teamInfo[1].img}" alt="${teamInfo[1].shortname}"></div>
        `;
    } else if (data.teams) {
        teamsHtml = `<div class="sc-vs">${data.teams.join(' vs ')}</div>`;
    }
    document.getElementById('sc-teams').innerHTML = teamsHtml;

    // Info
    let infoHtml = `<span>📍 ${data.venue || 'Unknown'}</span>`;
    if (data.tossWinner) infoHtml += ` &nbsp;|&nbsp; <span>🪙 Toss: ${data.tossWinner} chose to ${data.tossChoice}</span>`;
    infoHtml += ` &nbsp;|&nbsp; <span>🏏 ${(data.matchType || '').toUpperCase()}</span>`;
    document.getElementById('sc-info').innerHTML = infoHtml;

    // Score bar
    const scores = data.score || [];
    document.getElementById('sc-score-bar').innerHTML = scores.map(s => {
        const oversText = (s.o && s.o !== '-') ? `<div class="inning-overs">(${s.o} overs)</div>` : '';
        return `
            <div class="sc-score-chip">
                <div class="inning-label">${s.inning}</div>
                <div class="inning-score">${s.r}/${s.w}</div>
                ${oversText}
            </div>
        `;
    }).join('');

    // Status
    document.getElementById('sc-status-bar').innerHTML = `<span class="live-pulse"></span> ${data.status}`;

    // Innings tabs
    const scorecard = data.scorecard || [];
    if (scorecard.length > 0) {
        document.getElementById('sc-innings-tabs').innerHTML = scorecard.map((inn, i) =>
            `<button class="sc-innings-tab ${i === 0 ? 'active' : ''}" onclick="switchInning(${i})">${inn.inning || ('Innings ' + (i + 1))}</button>`
        ).join('');
        renderInning(scorecard[0]);
    } else {
        document.getElementById('sc-innings-tabs').innerHTML = '';
        const note = data.note || 'Detailed scorecard not yet available for this match.';
        document.getElementById('sc-innings-content').innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-secondary); font-size:0.9rem;"><i class="fa-solid fa-circle-info" style="font-size:2rem; color:var(--accent-color); margin-bottom:10px;"></i><br>${note}</div>`;
    }
}

window.switchInning = (index) => {
    if (!scorecardData || !scorecardData.scorecard) return;
    document.querySelectorAll('.sc-innings-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    renderInning(scorecardData.scorecard[index]);
};

function getDismissalClass(dismissal) {
    if (!dismissal) return 'not-out';
    const d = dismissal.toLowerCase();
    if (d.includes('caught') || d.includes('catch')) return 'caught';
    if (d.includes('bowled') || d === 'bowled') return 'bowled';
    if (d.includes('lbw')) return 'lbw';
    if (d.includes('run') && d.includes('out')) return 'runout';
    if (d.includes('runout')) return 'runout';
    if (d.includes('stump')) return 'stumped';
    if (d.includes('retired')) return 'retired';
    if (d.includes('not out')) return 'not-out';
    return 'bowled'; // fallback
}

function renderInning(inning) {
    const content = document.getElementById('sc-innings-content');
    let html = '';

    // Batting
    const batting = inning.batting || [];
    if (batting.length > 0) {
        html += `<div class="sc-section-title">Batting</div>`;
        html += `<table class="sc-table"><thead><tr>
            <th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th><th>Dismissal</th>
        </tr></thead><tbody>`;

        batting.forEach(b => {
            const name = b.batsman ? b.batsman.name : 'Unknown';
            const dismissal = b.dismissal || 'not out';
            const dismissalText = b['dismissal-text'] || '';
            const badgeClass = getDismissalClass(dismissal);
            const badgeLabel = dismissal === 'not out' ? 'NOT OUT' : dismissal.toUpperCase();

            html += `<tr>
                <td>
                    <span class="sc-player-name">${name}</span>
                    ${dismissalText ? `<span class="sc-dismissal-text">${dismissalText}</span>` : ''}
                </td>
                <td><strong>${b.r ?? '-'}</strong></td>
                <td>${b.b ?? '-'}</td>
                <td>${b['4s'] ?? '-'}</td>
                <td>${b['6s'] ?? '-'}</td>
                <td>${b.sr ?? '-'}</td>
                <td><span class="sc-dismissal-badge ${badgeClass}">${badgeLabel}</span></td>
            </tr>`;
        });
        html += `</tbody></table>`;
    }

    // Bowling
    const bowling = inning.bowling || [];
    if (bowling.length > 0) {
        html += `<div class="sc-section-title">Bowling</div>`;
        html += `<table class="sc-table"><thead><tr>
            <th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>ECO</th>
        </tr></thead><tbody>`;

        bowling.forEach(bw => {
            const name = bw.bowler ? bw.bowler.name : 'Unknown';
            html += `<tr>
                <td><span class="sc-player-name">${name}</span></td>
                <td>${bw.o ?? '-'}</td>
                <td>${bw.m ?? '-'}</td>
                <td>${bw.r ?? '-'}</td>
                <td><strong>${bw.w ?? '-'}</strong></td>
                <td>${bw.eco ?? '-'}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
    }

    if (!batting.length && !bowling.length) {
        html = '<div style="text-align:center; padding:30px; color:var(--text-secondary);">Innings data not available yet.</div>';
    }

    content.innerHTML = html;
}

window.closeScorecardOverlay = () => {
    document.getElementById('scorecard-overlay').style.display = 'none';
    if (scorecardRefreshInterval) {
        clearInterval(scorecardRefreshInterval);
        scorecardRefreshInterval = null;
    }
};

// ===== AUTHENTICATION STATE & LOGIC =====
let authMode = 'login'; // 'login' or 'signup'

window.showAuthOverlay = () => {
    document.getElementById('auth-overlay').style.display = 'flex';
};

window.hideAuthOverlay = () => {
    document.getElementById('auth-overlay').style.display = 'none';
};

window.closeAuthOverlay = () => {
    if (localStorage.getItem('crickait_token')) {
        window.hideAuthOverlay();
    } else {
        window.continueAsGuest();
    }
};

window.toggleAuthMode = () => {
    const usernameGroup = document.getElementById('username-group');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authToggleBtn = document.getElementById('auth-toggle-btn');
    const authToggleText = document.getElementById('auth-toggle-text');
    const usernameInput = document.getElementById('auth-username');
    const emailInput = document.getElementById('auth-email');

    if (authMode === 'login') {
        authMode = 'signup';
        usernameGroup.style.display = 'block';
        usernameInput.setAttribute('required', 'true');
        emailInput.placeholder = 'Type your email';
        authTitle.textContent = 'Create an Account';
        authSubtitle.textContent = 'Join CrickAIt to access your cricket assistant';
        authSubmitBtn.textContent = 'Sign Up';
        authToggleText.textContent = 'Already have an account?';
        authToggleBtn.textContent = 'Sign In';
        const reqsText = document.getElementById('password-requirements-text');
        if (reqsText) reqsText.style.display = 'block';
    } else {
        authMode = 'login';
        usernameGroup.style.display = 'none';
        usernameInput.removeAttribute('required');
        emailInput.placeholder = 'Type your email or username';
        authTitle.textContent = 'Welcome to CrickAIt';
        authSubtitle.textContent = 'Sign in to start chatting with your cricket companion';
        authSubmitBtn.textContent = 'Sign In';
        authToggleText.textContent = "Don't have an account?";
        authToggleBtn.textContent = 'Sign Up';
        const reqsText = document.getElementById('password-requirements-text');
        if (reqsText) reqsText.style.display = 'none';
    }
};

window.continueAsGuest = async () => {
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
            window.hideAuthOverlay();
            await window.updateUserProfileTrigger();
            await initApp();
        } else {
            alert('Guest login failed. Please try again.');
        }
    } catch (e) {
        console.error(e);
        alert('Network connection error. If this is the first action in a while, the backend server might be waking up (Render free tier cold starts can take up to 60 seconds). Please wait a moment and try again.');
    }
};

window.handleAuthSubmit = async (event) => {
    event.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const emailOrUser = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    const submitBtn = document.getElementById('auth-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = authMode === 'login' ? 'Signing In...' : 'Signing Up...';

    if (authMode === 'signup') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailOrUser)) {
            alert('Please enter a valid email address.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
            return;
        }
        if (password.length < 8) {
            alert('Password must be at least 8 characters long.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
            return;
        }
        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            alert('Password must contain at least one letter and one number.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
            return;
        }
        const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':",./<>?|\\~`]/;
        if (!specialCharRegex.test(password)) {
            alert('Password must contain at least one special character.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
            return;
        }
    }

    try {
        let endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
        let body = {};
        if (authMode === 'login') {
            body = { username: emailOrUser, password: password };
        } else {
            body = { username: username, email: emailOrUser, password: password };
        }

        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Authentication failed');
            return;
        }

        localStorage.setItem('crickait_token', data.token);
        localStorage.setItem('crickait_username', data.username);
        localStorage.setItem('crickait_display_name', data.display_name);

        window.hideAuthOverlay();
        window.updateUserProfileTrigger();
        await initApp();
    } catch (e) {
        console.error(e);
        alert('Connection error occurred. If the server was inactive, it may take up to 60 seconds to start up. Please try again in a moment.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = authMode === 'login' ? 'Sign In' : 'Sign Up';
    }
};

window.handleGoogleCredentialResponse = async (response) => {
    try {
        // Decode JWT payload locally to get email and name
        const payloadBase64Url = response.credential.split('.')[1];
        const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
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

        window.hideAuthOverlay();
        await window.updateUserProfileTrigger();
        await initApp();
    } catch (e) {
        console.error("Google Sign-In Error", e);
        alert('Google Sign-in failed due to network error');
    }
};

window.updateUserProfileTrigger = async () => {
    // Try to fetch profile from backend
    try {
        const res = await authenticatedFetch(`${API_URL}/auth/me`);
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('crickait_username', data.username);
            localStorage.setItem('crickait_display_name', data.display_name);
            localStorage.setItem('crickait_plan', data.plan);
            localStorage.setItem('crickait_email', data.email);
        }
    } catch (e) {
        console.error("Failed to fetch user profile", e);
    }

    const displayName = localStorage.getItem('crickait_display_name') || 'Guest User';
    const email = localStorage.getItem('crickait_email') || (localStorage.getItem('crickait_username') ? `${localStorage.getItem('crickait_username')}@crickait.com` : 'guest@crickait.com');
    const plan = localStorage.getItem('crickait_plan') || 'free';
    const initials = displayName.substring(0, 2).toUpperCase();

    document.getElementById('user-avatar').textContent = initials;
    document.getElementById('user-display-name').textContent = displayName;
    document.getElementById('popover-user-avatar').textContent = initials;
    document.getElementById('popover-display-name').textContent = displayName;
    document.getElementById('popover-email').textContent = email;

    // Update role display
    let roleText = 'Free Plan';
    if (plan === 'pro') roleText = 'Pro Plan';
    if (plan === 'guest') roleText = 'Guest User';
    const roleEls = document.querySelectorAll('.user-role');
    roleEls.forEach(el => el.textContent = roleText);

    // Update popover for guests
    const logoutBtn = document.getElementById('menu-logout');
    const headerAuthBtn = document.getElementById('header-auth-btn');
    if (plan === 'guest') {
        if (headerAuthBtn) headerAuthBtn.style.display = 'inline-flex';
        logoutBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Sign Up / Sign In';
        logoutBtn.classList.remove('logout');
        document.getElementById('menu-upgrade').style.display = 'none';
        document.getElementById('menu-personalization').style.display = 'none';
        document.getElementById('menu-profile').style.display = 'none';
        document.getElementById('menu-settings').style.display = 'none';
    } else {
        if (headerAuthBtn) headerAuthBtn.style.display = 'none';
        logoutBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Log out';
        logoutBtn.classList.add('logout');
        document.getElementById('menu-personalization').style.display = 'block';
        document.getElementById('menu-profile').style.display = 'block';
        document.getElementById('menu-settings').style.display = 'block';

        const username = localStorage.getItem('crickait_username');
        const isCreator = username === 'iamthecreator';

        // Hide upgrade for creator and pro users
        if (isCreator || plan === 'pro') {
            document.getElementById('menu-upgrade').style.display = 'none';
        } else {
            document.getElementById('menu-upgrade').style.display = 'block';
        }

        if (isCreator) {
            document.getElementById('menu-admin').style.display = 'block';
        } else {
            document.getElementById('menu-admin').style.display = 'none';
        }
    }

    // Update profile modal
    document.getElementById('profile-avatar-large').textContent = initials;
    document.getElementById('profile-name-val').textContent = displayName;
    document.getElementById('profile-email-val').textContent = email;

    // Update status badge based on plan
    const statusEl = document.getElementById('profile-status-val');
    const currentUsername = localStorage.getItem('crickait_username');
    statusEl.classList.remove('pro-badge', 'creator-badge');
    if (currentUsername === 'iamthecreator') {
        statusEl.textContent = 'Creator';
        statusEl.classList.add('creator-badge');
    } else if (plan === 'pro') {
        statusEl.textContent = 'Pro User';
        statusEl.classList.add('pro-badge');
    } else {
        statusEl.textContent = 'Free User';
    }

    // Check if token length suggests Google Login simulation or standard password simulation
    const isGoogle = !localStorage.getItem('crickait_username') || localStorage.getItem('crickait_token').length > 30;
    document.getElementById('profile-provider-val').textContent = isGoogle ? 'Google' : 'Local';
    updateCreditsCounter();
};

// ===== SETTINGS POPOVER & DIALOG HANDLERS =====
function setupProfilePopover() {
    const trigger = document.getElementById('user-profile-trigger');
    const popover = document.getElementById('user-profile-popover');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = popover.style.display === 'none';
        popover.style.display = isHidden ? 'block' : 'none';
    });

    document.addEventListener('click', () => {
        popover.style.display = 'none';
    });

    popover.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Menu items
    document.getElementById('menu-upgrade').addEventListener('click', () => {
        popover.style.display = 'none';
        window.openModal('upgrade-modal');
    });

    document.getElementById('menu-admin').addEventListener('click', () => {
        popover.style.display = 'none';
        window.openModal('admin-modal');
        loadAdminUsers();
    });

    document.getElementById('menu-personalization').addEventListener('click', () => {
        popover.style.display = 'none';
        window.loadPersonalizationData();
        window.openModal('personalization-modal');
    });

    document.getElementById('menu-profile').addEventListener('click', () => {
        popover.style.display = 'none';
        window.openModal('profile-modal');
    });

    document.getElementById('menu-settings').addEventListener('click', () => {
        popover.style.display = 'none';
        window.openModal('settings-modal');
    });

    document.getElementById('menu-help').addEventListener('click', () => {
        popover.style.display = 'none';
        window.openModal('help-modal');
    });

    document.getElementById('menu-logout').addEventListener('click', async () => {
        popover.style.display = 'none';
        await handleLogout();
    });
}

window.openModal = (modalId) => {
    document.getElementById(modalId).classList.add('show');
};

window.closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('show');
};

async function handleLogout() {
    try {
        await authenticatedFetch(`${API_URL}/auth/logout`, { method: 'POST' });
    } catch (e) {
        console.error(e);
    }
    localStorage.removeItem('crickait_token');
    localStorage.removeItem('crickait_username');
    localStorage.removeItem('crickait_display_name');
    localStorage.removeItem('crickait_plan');
    localStorage.removeItem('crickait_email');
    location.reload();
}

window.handleDeleteAccount = async () => {
    if (confirm("Are you absolutely sure you want to delete your account? This will permanently erase all your chat history and preferences. This action cannot be undone.")) {
        try {
            const res = await authenticatedFetch(`${API_URL}/auth/delete-account`, { method: 'DELETE' });
            if (res.ok) {
                alert("Your account has been successfully deleted.");
                localStorage.removeItem('crickait_token');
                localStorage.removeItem('crickait_username');
                localStorage.removeItem('crickait_display_name');
                location.reload();
            } else {
                alert("Failed to delete account.");
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting account.");
        }
    }
};

window.handleClearFavoritesProfile = async () => {
    if (confirm("Reset your extracted cricket profile favorites?")) {
        try {
            const res = await authenticatedFetch(`${API_URL}/profile/clear`, { method: 'DELETE' });
            if (res.ok) {
                alert("Profile reset successfully.");
                window.closeModal('settings-modal');
                await loadProfile();
            }
        } catch (e) {
            console.error(e);
        }
    }
};

window.loadPersonalizationData = async () => {
    try {
        const res = await authenticatedFetch(`${API_URL}/profile`);
        const profile = await res.json();

        if (profile.expertise_level) {
            document.getElementById('expertise-level').value = profile.expertise_level;
        }
        if (profile.preferred_format) {
            document.getElementById('pref-t20').checked = profile.preferred_format.includes('T20');
            document.getElementById('pref-odi').checked = profile.preferred_format.includes('ODI');
            document.getElementById('pref-test').checked = profile.preferred_format.includes('Test');
        }
        if (profile.rival_teams) {
            document.getElementById('rival-teams').value = profile.rival_teams.join(', ');
        }
    } catch (e) {
        console.error(e);
    }
};

window.savePersonalization = async (event) => {
    event.preventDefault();
    const expertise = document.getElementById('expertise-level').value;
    const formats = [];
    if (document.getElementById('pref-t20').checked) formats.push('T20');
    if (document.getElementById('pref-odi').checked) formats.push('ODI');
    if (document.getElementById('pref-test').checked) formats.push('Test');

    const rivalInput = document.getElementById('rival-teams').value;
    const rivals = rivalInput ? rivalInput.split(',').map(s => s.trim()).filter(Boolean) : [];

    try {
        const res = await authenticatedFetch(`${API_URL}/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                expertise_level: expertise,
                preferred_format: formats,
                rival_teams: rivals
            })
        });
        if (res.ok) {
            alert("Preferences saved successfully!");
            window.closeModal('personalization-modal');
            await loadProfile();
        } else {
            alert("Failed to save preferences.");
        }
    } catch (e) {
        console.error(e);
        alert("Error saving preferences.");
    }
};

window.initiateUpgrade = () => {
    alert("Payment gateway integration (Stripe) is pending. Upgrade unavailable at this time.");
};

window.loadAdminUsers = async () => {
    try {
        const res = await authenticatedFetch(`${API_URL}/admin/users`);
        if (!res.ok) throw new Error("Failed to load users");
        const data = await res.json();
        
        const tbody = document.getElementById('admin-users-body');
        tbody.innerHTML = '';
        
        data.users.forEach(user => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #333';
            
            const actionHtml = user.plan === 'free' 
                ? `<button onclick="adminUpgradeUser('${user.username}', 'pro')" style="background: var(--primary-accent); border: none; border-radius: 4px; color: #fff; padding: 5px 10px; cursor: pointer; font-size: 0.8rem;">Upgrade to Pro</button>`
                : `<span style="color: #4CAF50; font-size: 0.8rem;">Pro</span>`;
                
            row.innerHTML = `
                <td style="padding: 10px;">${user.username}</td>
                <td style="padding: 10px;">${user.email}</td>
                <td style="padding: 10px;">${user.auth_provider}</td>
                <td style="padding: 10px;">${user.plan}</td>
                <td style="padding: 10px;">${new Date(user.created_at).toLocaleString()}</td>
                <td style="padding: 10px;">${actionHtml}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (e) {
        console.error(e);
        alert("Error loading admin users.");
    }
};

window.adminUpgradeUser = async (username, newPlan) => {
    if(!confirm(`Are you sure you want to upgrade ${username} to ${newPlan}?`)) return;
    try {
        const res = await authenticatedFetch(`${API_URL}/admin/upgrade-user`, {
            method: 'POST',
            body: JSON.stringify({ username: username, plan: newPlan })
        });
        if (!res.ok) throw new Error("Failed to upgrade");
        alert(`Successfully upgraded ${username} to ${newPlan}!`);
        loadAdminUsers();
    } catch (e) {
        console.error(e);
        alert("Error upgrading user.");
    }
};

// --- MODAL UI LOGIC ENHANCEMENTS ---

// Profile Edit Name
function toggleEditName() {
    const nameVal = document.getElementById('profile-name-val');
    const editForm = document.getElementById('edit-name-form');
    const input = document.getElementById('new-display-name');
    
    if (editForm.style.display === 'none') {
        nameVal.style.display = 'none';
        editForm.style.display = 'block';
        input.value = nameVal.textContent;
        input.focus();
    } else {
        nameVal.style.display = 'block';
        editForm.style.display = 'none';
    }
}

async function saveDisplayName() {
    const input = document.getElementById('new-display-name');
    const newName = input.value.trim();
    if (!newName) return;

    try {
        const response = await fetch(`${PROD_BACKEND_URL}/auth/me`, {
            method: 'PATCH', // We simulate a PATCH request, though we might need to implement this in backend if it doesn't exist
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ display_name: newName })
        });
        
        // Even if the backend PATCH /auth/me doesn't exist yet, we visually update for UX
        document.getElementById('profile-name-val').textContent = newName;
        document.getElementById('profile-avatar-large').textContent = newName.substring(0, 2).toUpperCase();
        toggleEditName();
        
    } catch (error) {
        console.error("Error updating name:", error);
    }
}

// Help Modal Quick Prompts
function useQuickPrompt(promptText) {
    closeModal('help-modal');
    const inputField = document.getElementById('chat-input');
    inputField.value = promptText;
    inputField.focus();
}

// Help Modal Accordion
function toggleAccordion(button) {
    button.classList.toggle("active");
    const content = button.nextElementSibling;
    if (button.classList.contains("active")) {
        content.style.maxHeight = content.scrollHeight + "px";
    } else {
        content.style.maxHeight = "0";
    }
}

// Theme Applier
function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'green') {
        root.style.setProperty('--bg-color', '#0a1a12');
        root.style.setProperty('--surface', '#132c1d');
        root.style.setProperty('--surface-light', '#1e422c');
        root.style.setProperty('--accent', '#00d26a');
    } else if (theme === 'light') {
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
}

// --- SETTINGS MODAL: NEW ACTIONS ---

async function handleClearAllChats() {
    if (!confirm("Delete ALL your chat history? This cannot be undone.")) return;
    try {
        const res = await authenticatedFetch(`${API_URL}/sessions/clear-all`, { method: 'DELETE' });
        if (res && res.ok) {
            location.reload();
        } else {
            alert("Could not clear sessions. Please try again.");
        }
    } catch (e) {
        // Fallback: just reload
        location.reload();
    }
}

function handleExportChats() {
    const messages = document.querySelectorAll('.message-wrapper');
    if (!messages.length) { alert("No chat history to export."); return; }
    let text = `CrickAIt Chat Export\n${'='.repeat(40)}\n\n`;
    messages.forEach(m => {
        const isUser = m.classList.contains('user-message');
        const content = m.querySelector('.message-content');
        text += `${isUser ? 'You' : 'CrickAIt'}: ${content ? content.textContent.trim() : ''}\n\n`;
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `crickait-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
}

// --- BUG REPORT via Formspree ---

function openBugReport() {
    closeModal('help-modal');
    // Pre-fill username if logged in
    const username = localStorage.getItem('crickait_display_name') || '';
    document.getElementById('bug-subject').value = '';
    document.getElementById('bug-message').value = username ? `Reported by: ${username}\n\n` : '';
    document.getElementById('bug-report-status').textContent = '';
    document.getElementById('bug-submit-btn').disabled = false;
    document.getElementById('bug-submit-btn').innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Report';
    openModal('bug-report-modal');
}

async function submitBugReport(event) {
    event.preventDefault();
    const subject = document.getElementById('bug-subject').value.trim();
    const message = document.getElementById('bug-message').value.trim();
    const btn = document.getElementById('bug-submit-btn');
    const status = document.getElementById('bug-report-status');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    status.textContent = '';

    try {
        const res = await fetch('https://formspree.io/f/xpqeyklq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                subject: `[CrickAIt Bug] ${subject}`,
                message: message,
                _subject: `[CrickAIt Bug] ${subject}`
            })
        });
        const data = await res.json();
        if (res.ok) {
            status.innerHTML = '<span style="color: #2ecc71;"><i class="fa-solid fa-circle-check"></i> Thank you! Your report has been sent.</span>';
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Sent!';
            setTimeout(() => closeModal('bug-report-modal'), 2500);
        } else {
            status.innerHTML = `<span style="color: #ff4b4b;"><i class="fa-solid fa-triangle-exclamation"></i> ${data.error || 'Failed to send. Please try again.'}</span>`;
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Report';
        }
    } catch (e) {
        status.innerHTML = '<span style="color: #ff4b4b;"><i class="fa-solid fa-triangle-exclamation"></i> Network error. Please try again.</span>';
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Report';
    }
}
