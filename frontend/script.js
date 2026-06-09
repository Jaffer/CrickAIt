const API_URL = window.location.origin; // Using relative path since it's served by FastAPI
let currentSessionId = null;

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
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

async function initApp() {
    await loadSessions();
    await loadProfile();
    loadNewsTicker();
    loadLiveMatchesSidebar();
}

async function loadNewsTicker() {
    try {
        const res = await fetch(`${API_URL}/top-news`);
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
    try {
        const res = await fetch(`${API_URL}/live-scores`);
        const data = await res.json();
        const container = document.getElementById('live-matches-container');
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
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim().length > 0) {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    chatInput.addEventListener('keydown', function(e) {
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

}

// UUID generator for new sessions
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
            fetch(`${API_URL}/sessions`),
            fetch(`${API_URL}/session-names`)
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
        if(d.querySelector('.dropdown-content').id !== `dropdown-${sid}`) d.classList.remove('show');
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
            await fetch(`${API_URL}/rename/${sid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_name: newName.trim() })
            });
            loadSessions();
            if (currentSessionId === sid) {
                currentChatTitle.textContent = newName.trim();
            }
        } catch(e) { 
            console.error(e);
            showErrorPage('server');
        }
    }
}

window.deleteSession = async (sid, event) => {
    event.stopPropagation();
    const confirmed = await showCustomModal("Delete Chat", "Are you sure you want to delete this chat?", false);
    if(confirmed) {
        try {
            await fetch(`${API_URL}/clear/${sid}`, { method: 'DELETE' });
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
        const res = await fetch(`${API_URL}/history/${sid}`);
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
        const res = await fetch(`${API_URL}/profile`);
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
        await fetch(`${API_URL}/profile/item?category=${category}&item=${item}`, { method: 'DELETE' });
        loadProfile();
    } catch (e) { console.error(e); }
}

function appendMessage(role, content) {
    const isUser = role === 'user';
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    // Parse markdown for bot messages
    let formattedContent = isUser ? content : marked.parse(content);
    
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
        renamePromise = fetch(`${API_URL}/auto-rename/${currentSessionId}`, {
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
        const res = await fetch(`${API_URL}/ask?user_prompt=${encodeURIComponent(text)}&session_id=${currentSessionId}`, {
            method: 'POST'
        });
        const data = await res.json();
        
        loadingDiv.remove();
        appendMessage('assistant', data.response);
        scrollToBottom();
        
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
    const overlay = document.getElementById('scorecard-overlay');
    overlay.style.display = 'flex';
    document.getElementById('sc-innings-content').innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-secondary);"><div class="cricket-loader" style="justify-content:center; margin-bottom:12px;"><div class="cricket-loader-bouncer"><div class="cricket-loader-ball"></div></div><div class="cricket-loader-bouncer" style="animation-delay:0.15s"><div class="cricket-loader-ball"></div></div><div class="cricket-loader-bouncer" style="animation-delay:0.3s"><div class="cricket-loader-ball"></div></div></div>Loading scorecard...</div>';
    
    await fetchAndRenderScorecard(matchId);
    
    // Auto-refresh scorecard every 30 seconds
    if (scorecardRefreshInterval) clearInterval(scorecardRefreshInterval);
    scorecardRefreshInterval = setInterval(() => fetchAndRenderScorecard(matchId), 30000);
};

async function fetchAndRenderScorecard(matchId) {
    try {
        const res = await fetch(`${API_URL}/scorecard/${matchId}`);
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
            `<button class="sc-innings-tab ${i === 0 ? 'active' : ''}" onclick="switchInning(${i})">${inn.inning || ('Innings ' + (i+1))}</button>`
        ).join('');
        renderInning(scorecard[0]);
    } else {
        document.getElementById('sc-innings-tabs').innerHTML = '';
        document.getElementById('sc-innings-content').innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-secondary);">Scorecard not yet available for this match.</div>';
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
