// ─── ANGELO — script.js ──────────────────────────────────────────────────────
// Powered by Puter.js (free, no API key needed)

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are ANGELO, an AI chatbot made by the students of Class X 2026 batch of Assembly of Angels Secondary School, as a showcase project for PEP 2026.

When asked to introduce yourself, say exactly:
"I'm ANGELO. I was made by the students of Class X 2026 batch of Assembly of Angels Secondary School as a showcase for PEP 2026. How can I help you today?"

Your areas of expertise:
1. ICSE Class 10 Java Programming: Write complete, correct, well-commented Java programs following the ICSE Class 10 syllabus. Topics include: patterns, series, arrays, strings, class and objects, inheritance, interfaces, constructors, method overloading, recursion. Always wrap Java code in proper markdown code fences with the java language tag.
2. General Knowledge & Trivia: World GK, current events, history, geography, science, sports.
3. Common Sense & Reasoning: Logical puzzles and everyday questions.
4. Computer Science: Explain CS topics clearly for school students.
5. Internet Search: Answer questions about current events using your knowledge.

Format all code using markdown code fences with the correct language tag (e.g. \`\`\`java, \`\`\`python, \`\`\`html).
Be friendly, encouraging, and student-focused.`;

// ─── DOM ──────────────────────────────────────────────────────────────────────
const chatContainer   = document.getElementById('chatContainer');
const messageInput    = document.getElementById('messageInput');
const sendBtn         = document.getElementById('sendBtn');
const welcomeMessage  = document.getElementById('welcomeMessage');
const clearBtn        = document.getElementById('clearBtn');
const chatList        = document.getElementById('chatList');
const newChatBtn      = document.getElementById('newChatBtn');
const sidebarToggle   = document.getElementById('sidebarToggle');
const sidebarOpenBtn  = document.getElementById('sidebarOpenBtn');
const sidebar         = document.getElementById('sidebar');
const headerTitle     = document.getElementById('headerTitle');
const analyticsBtn    = document.getElementById('analyticsBtn');
const analyticsOverlay= document.getElementById('analyticsOverlay');
const analyticsBody   = document.getElementById('analyticsBody');
const closeAnalyticsBtn = document.getElementById('closeAnalyticsBtn');
const themeToggleBtn  = document.getElementById('themeToggleBtn');
const scrollBottomBtn = document.getElementById('scrollBottomBtn');

// ─── State ────────────────────────────────────────────────────────────────────
let sessions = [];          // [{id, title, messages:[{role,content}], createdAt}]
let activeSessionId = null;
let isGenerating = false;
let analytics = { totalMessages: 0, totalChats: 0, keywords: {}, dailyActivity: {} };

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const SESSIONS_KEY   = 'angelo_sessions';
const ACTIVE_KEY     = 'angelo_active';
const ANALYTICS_KEY  = 'angelo_analytics';

// ─── Marked config ───────────────────────────────────────────────────────────
marked.setOptions({ breaks: true, gfm: true });

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
    loadAnalytics();
    loadSessions();

    // Event listeners
    sendBtn.addEventListener('click', handleSend);
    messageInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 160) + 'px';
    });

    newChatBtn.addEventListener('click', createNewSession);
    clearBtn.addEventListener('click', clearCurrentChat);

    // Sidebar toggle
    sidebarToggle.addEventListener('click', () => sidebar.classList.add('collapsed'));
    sidebarOpenBtn.addEventListener('click', () => sidebar.classList.remove('collapsed'));

    // Analytics
    analyticsBtn.addEventListener('click', () => {
        renderAnalytics();
        analyticsOverlay.classList.add('active');
    });
    closeAnalyticsBtn.addEventListener('click', () => analyticsOverlay.classList.remove('active'));
    analyticsOverlay.addEventListener('click', e => { if (e.target === analyticsOverlay) analyticsOverlay.classList.remove('active'); });

    // Auto-collapse sidebar on mobile
    if (window.innerWidth <= 640) {
        sidebar.classList.add('collapsed');
    }

    // Theme toggle
    const savedTheme = localStorage.getItem('angelo_theme') || 'dark';
    if (savedTheme === 'light') applyTheme('light');
    themeToggleBtn.addEventListener('click', () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        applyTheme(isLight ? 'dark' : 'light');
    });

    // Scroll-to-bottom button logic
    chatContainer.addEventListener('scroll', () => {
        const distFromBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;
        if (distFromBottom > 150) {
            scrollBottomBtn.classList.add('visible');
        } else {
            scrollBottomBtn.classList.remove('visible');
        }
    });
    scrollBottomBtn.addEventListener('click', () => scrollToBottom());
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
function loadSessions() {
    try {
        sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY)) || [];
        activeSessionId = localStorage.getItem(ACTIVE_KEY);
    } catch { sessions = []; }

    if (sessions.length === 0) {
        createNewSession();
    } else {
        const found = sessions.find(s => s.id === activeSessionId);
        if (!found) activeSessionId = sessions[sessions.length - 1].id;
        renderSidebar();
        renderActiveSession();
    }
}

function saveSessions() {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    localStorage.setItem(ACTIVE_KEY, activeSessionId);
}

function createNewSession() {
    const session = {
        id: 'sess_' + Date.now(),
        title: 'New Chat',
        messages: [],
        createdAt: Date.now()
    };
    sessions.push(session);
    activeSessionId = session.id;
    analytics.totalChats++;
    saveAnalytics();
    saveSessions();
    renderSidebar();
    renderActiveSession();
}

function switchSession(id) {
    if (id === activeSessionId) return;
    activeSessionId = id;
    saveSessions();
    renderSidebar();
    renderActiveSession();
    if (window.innerWidth <= 640) {
        sidebar.classList.add('collapsed');
    }
}

function deleteSession(id) {
    sessions = sessions.filter(s => s.id !== id);
    if (activeSessionId === id) {
        if (sessions.length === 0) createNewSession();
        else { activeSessionId = sessions[sessions.length - 1].id; }
    }
    saveSessions();
    renderSidebar();
    if (sessions.length > 0) renderActiveSession();
}

function clearCurrentChat() {
    const s = getActiveSession();
    if (!s || s.messages.length === 0) return;
    if (!confirm('Clear this chat?')) return;
    s.messages = [];
    s.title = 'New Chat';
    saveSessions();
    renderSidebar();
    renderActiveSession();
}

function getActiveSession() {
    return sessions.find(s => s.id === activeSessionId) || null;
}

function updateSessionTitle(session, text) {
    if (session.title !== 'New Chat') return;
    session.title = text.slice(0, 36) + (text.length > 36 ? '…' : '');
    renderSidebar();
}

// ─── Sidebar Render ───────────────────────────────────────────────────────────
function renderSidebar() {
    chatList.innerHTML = '';
    // Newest first
    [...sessions].reverse().forEach(s => {
        const item = document.createElement('div');
        item.className = 'chat-item' + (s.id === activeSessionId ? ' active' : '');
        item.innerHTML = `
            <span class="chat-item-title">${escapeHtml(s.title)}</span>
            <button class="chat-item-delete" title="Delete chat"><i class="ph ph-trash-simple"></i></button>`;
        item.addEventListener('click', () => switchSession(s.id));
        item.querySelector('.chat-item-delete').addEventListener('click', e => {
            e.stopPropagation();
            deleteSession(s.id);
        });
        chatList.appendChild(item);
    });

    // Update header title
    const active = getActiveSession();
    headerTitle.textContent = active ? active.title : 'ANGELO';
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggleBtn.querySelector('i').className = 'ph ph-moon';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggleBtn.querySelector('i').className = 'ph ph-sun';
    }
    localStorage.setItem('angelo_theme', theme);
}

// ─── Chat Render ──────────────────────────────────────────────────────────────
function renderActiveSession() {
    // Clear everything except welcome message
    const kids = [...chatContainer.children];
    kids.forEach(k => { if (k !== welcomeMessage) k.remove(); });

    const s = getActiveSession();
    if (!s || s.messages.length === 0) {
        welcomeMessage.style.display = 'flex';
        headerTitle.textContent = s ? s.title : 'ANGELO';
        return;
    }
    welcomeMessage.style.display = 'none';
    headerTitle.textContent = s.title;
    s.messages.forEach(m => appendMessageDOM(m.role, m.content, false, m.timestamp));
    scrollToBottom();
}

// ─── Message DOM ──────────────────────────────────────────────────────────────
function appendMessageDOM(role, content, animate = true) {
    welcomeMessage.style.display = 'none';

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', role === 'user' ? 'user' : 'bot');
    if (!animate) { msgDiv.style.animation = 'none'; msgDiv.style.opacity = '1'; msgDiv.style.transform = 'none'; }

    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = role === 'user'
        ? '<i class="ph ph-user"></i>'
        : '<img src="logo.png" alt="ANGELO" onerror="this.parentElement.innerHTML=\'<i class=\\\"ph-fill ph-sparkle\\\"></i>\'">';

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');

    if (role === 'bot') {
        contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(content));
        addCodeEnhancements(contentDiv);
    } else {
        contentDiv.textContent = content;
    }

    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(contentDiv);
    chatContainer.appendChild(msgDiv);
    return contentDiv;
}

// ─── Code Block Enhancements ─────────────────────────────────────────────────
function addCodeEnhancements(container) {
    container.querySelectorAll('pre code').forEach(codeEl => {
        // Highlight.js
        hljs.highlightElement(codeEl);

        const pre = codeEl.parentElement;
        const lang = (codeEl.className.match(/language-(\w+)/) || [])[1] || 'code';

        // Build header
        const header = document.createElement('div');
        header.className = 'code-header';
        header.innerHTML = `
            <span class="code-lang">${lang}</span>
            <button class="copy-btn">
                <i class="ph ph-copy"></i> Copy
            </button>`;

        // Copy logic
        header.querySelector('.copy-btn').addEventListener('click', function () {
            const btn = this;
            navigator.clipboard.writeText(codeEl.innerText).then(() => {
                btn.classList.add('copied');
                btn.innerHTML = '<i class="ph ph-check"></i> Copied!';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = '<i class="ph ph-copy"></i> Copy';
                }, 2000);
            });
        });

        pre.insertBefore(header, codeEl);
    });
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function showTyping() {
    const div = document.createElement('div');
    div.classList.add('message', 'bot');
    div.id = 'typingIndicator';
    div.innerHTML = `
        <div class="avatar"><img src="logo.png" alt="ANGELO" onerror="this.parentElement.innerHTML='<i class=\\"ph-fill ph-sparkle\\"></i>'"></div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
            </div>
        </div>`;
    chatContainer.appendChild(div);
    scrollToBottom();
}
function removeTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}
function scrollToBottom() { chatContainer.scrollTop = chatContainer.scrollHeight; }

// ─── Send ─────────────────────────────────────────────────────────────────────
async function handleSend() {
    if (isGenerating) return;
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = '';
    messageInput.style.height = 'auto';

    const session = getActiveSession();
    if (!session) return;

    // Save user message with timestamp
    session.messages.push({ role: 'user', content: text, timestamp: Date.now() });
    updateSessionTitle(session, text);
    saveSessions();
    renderSidebar();
    appendMessageDOM('user', text, true, Date.now());

    isGenerating = true;
    sendBtn.disabled = true;
    showTyping();

    // Update analytics
    trackMessage(text);

    try {
        const messages = session.messages.slice(-20).map(m => ({
            role: m.role,
            content: m.content
        }));

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: messages })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Server error');
        }

        removeTyping();

        // Create streaming bubble
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', 'bot');
        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');
        avatarDiv.innerHTML = '<img src="logo.png" alt="ANGELO" onerror="this.parentElement.innerHTML=\'<i class=\\\"ph-fill ph-sparkle\\\"></i>\'">';
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content', 'streaming');
        msgDiv.appendChild(avatarDiv);
        msgDiv.appendChild(contentDiv);
        chatContainer.appendChild(msgDiv);

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';
        let buffer = '';
        let lastUpdate = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line in buffer

            for (const line of lines) {
                if (line.trim() === '') continue;
                try {
                    const parsed = JSON.parse(line);
                    // Cohere sends 'text-generation' events with the new text chunk
                    if (parsed.event_type === 'text-generation' && parsed.text) {
                        fullText += parsed.text;
                    } 
                } catch (e) {
                    // Ignore partial json parse errors
                }
            }

            // Throttle DOM updates to prevent visual stuttering
            const now = Date.now();
            if (now - lastUpdate > 30) {
                contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(fullText));
                scrollToBottom();
                lastUpdate = now;
            }
        }

        // Final update to ensure we didn't miss the last chunk
        contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(fullText));
        scrollToBottom();
        
        contentDiv.classList.remove('streaming');
        addCodeEnhancements(contentDiv);

        // Save bot reply with timestamp
        session.messages.push({ role: 'bot', content: fullText, timestamp: Date.now() });
        analytics.totalMessages++;
        saveAnalytics();
        saveSessions();

    } catch (err) {
        removeTyping();
        let msg = err?.message || 'Something went wrong.';
        if (/sign|auth|login/i.test(msg)) {
            msg = 'Please sign in to your free Puter account. A sign-in window may have opened — complete it, then try again.';
        }
        appendMessageDOM('bot', `**Error:** ${msg}`, true);
    } finally {
        isGenerating = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// ─── Chip shortcut ────────────────────────────────────────────────────────────
function useChip(btn) {
    messageInput.value = btn.textContent.replace(/^[\W]+/, '').trim();
    messageInput.focus();
    handleSend();
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function loadAnalytics() {
    try { analytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY)) || analytics; } catch {}
}
function saveAnalytics() { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics)); }

function trackMessage(text) {
    analytics.totalMessages++;
    const today = new Date().toISOString().split('T')[0];
    analytics.dailyActivity[today] = (analytics.dailyActivity[today] || 0) + 1;

    // Keyword extraction (simple: words > 4 chars, not stopwords)
    const stopwords = new Set(['that','this','with','from','have','will','what','which','your','just','more','than','then','they','them','these','those','when','where','there','their','about','some','into','would','could','should','like','been','also']);
    text.toLowerCase().split(/\W+/).filter(w => w.length > 4 && !stopwords.has(w)).forEach(w => {
        analytics.keywords[w] = (analytics.keywords[w] || 0) + 1;
    });
    saveAnalytics();
}

function renderAnalytics() {
    // Top keywords
    const topKeywords = Object.entries(analytics.keywords)
        .sort((a,b) => b[1]-a[1]).slice(0, 12).map(([k]) => k);

    // Daily activity (last 7 days)
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        days.push({ label: d.toLocaleDateString('en',{weekday:'short'}), count: analytics.dailyActivity[key] || 0 });
    }
    const maxCount = Math.max(...days.map(d => d.count), 1);

    analyticsBody.innerHTML = `
        <div class="stat-grid">
            <div class="stat-card">
                <div class="stat-value">${analytics.totalMessages}</div>
                <div class="stat-label">Total Messages</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${sessions.length}</div>
                <div class="stat-label">Chat Sessions</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Object.keys(analytics.dailyActivity).length}</div>
                <div class="stat-label">Days Active</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${sessions.filter(s=>s.messages.length>0).length}</div>
                <div class="stat-label">Active Chats</div>
            </div>
        </div>

        <div>
            <div class="analytics-section-title">Activity (Last 7 Days)</div>
            <div class="activity-bar-list">
                ${days.map(d => `
                    <div class="activity-bar-row">
                        <span class="activity-bar-label">${d.label}</span>
                        <div class="activity-bar-track">
                            <div class="activity-bar-fill" style="width:${Math.round((d.count/maxCount)*100)}%"></div>
                        </div>
                        <span class="activity-bar-count">${d.count}</span>
                    </div>`).join('')}
            </div>
        </div>

        ${topKeywords.length > 0 ? `
        <div>
            <div class="analytics-section-title">Top Keywords</div>
            <div class="keyword-list">
                ${topKeywords.map(k => `<span class="keyword-tag">${escapeHtml(k)}</span>`).join('')}
            </div>
        </div>` : ''}
    `;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHtml(text) {
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Start ────────────────────────────────────────────────────────────────────
init();
