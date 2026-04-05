/* ═══════════════════════════════════════════════════════════
   FraudShield — Dashboard JavaScript
   Handles Role-based Logic, API communication, and UI
   ═══════════════════════════════════════════════════════════ */

const API_BASE = 'http://localhost:5000/api';

// ─── Chart.js Global Config ────────────────────────────────
if (typeof Chart !== 'undefined') {
    Chart.defaults.color = '#a0a0c0';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.scale.grid = { color: 'rgba(99, 102, 241, 0.06)' };
    Chart.defaults.scale.border = { color: 'rgba(99, 102, 241, 0.1)' };
}

// ─── State ──────────────────────────────────────────────────
let currentUser = JSON.parse(localStorage.getItem('fraudshield_user')) || null;
let currentSection = 'dashboard';
let currentFilter = 'all';
let currentPage = 1;
let charts = {};

// ─── Initialization ─────────────────────────────────────────
async function init() {
    updateClock();
    setInterval(updateClock, 1000);

    if (currentUser) {
        showApp();
        loadProfile();
        loadDashboardData();
    } else {
        showLogin();
    }
}

// ─── Authentication ──────────────────────────────────────────
const loginForm = document.getElementById('login-form');
const loginOverlay = document.getElementById('login-overlay');
const mainContent = document.getElementById('main-content');
const sidebar = document.getElementById('sidebar');

function showLogin() {
    loginOverlay.classList.remove('hidden');
    mainContent.classList.add('hidden');
    sidebar.classList.add('hidden');
    document.body.className = '';
}

function showApp() {
    loginOverlay.classList.add('hidden');
    mainContent.classList.remove('hidden');
    sidebar.classList.remove('hidden');
    
    // Set body class for role-based CSS
    document.body.className = `role-${currentUser.role}`;
    document.getElementById('user-role-display').textContent = currentUser.role.toUpperCase();
    document.getElementById('display-user-name').textContent = currentUser.name;
    
    // Adjust Sidebar for role
    if (currentUser.role === 'admin') {
        renderAdminUI();
        switchSection('dashboard');
    } else {
        switchSection('dashboard');
    }
}

function renderAdminUI() {
    const navContainer = document.getElementById('admin-nav-container');
    const sectionContainer = document.getElementById('admin-sections-container');
    
    if (!navContainer || !sectionContainer) return;
    
    // Inject Nav Items
    navContainer.innerHTML = `
        <a href="#" class="nav-item" data-section="customers" id="nav-customers">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Customers</span>
        </a>
        <a href="#" class="nav-item" data-section="model" id="nav-model">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>AI Intelligence</span>
        </a>
    `;
    
    // Inject Sections
    sectionContainer.innerHTML = `
        <section class="content-section" id="section-customers">
            <div class="glass-card">
                <div class="card-header">
                    <h3>Customer Management</h3>
                </div>
                <div class="table-wrapper">
                    <table class="transactions-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Account Number</th>
                                <th>Current Balance</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="customers-body"></tbody>
                    </table>
                </div>
            </div>
        </section>
        <section class="content-section" id="section-model">
            <div class="model-grid">
                <div class="glass-card">
                    <div class="card-header">
                        <h3>🤖 AI Brain Performance</h3>
                    </div>
                    <div class="model-metrics" id="model-metrics"></div>
                </div>
                <div class="glass-card">
                    <div class="card-header">
                        <h3>📊 Decision Logic</h3>
                    </div>
                    <div class="confusion-matrix" id="confusion-matrix"></div>
                </div>
            </div>
        </section>
    `;
    
    // Re-bind click events for new nav items
    navContainer.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(item.dataset.section);
        });
    });
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('fraudshield_user', JSON.stringify(currentUser));
            showApp();
            loadProfile();
            loadDashboardData();
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (err) {
        showNotification('Server connection failed', 'error');
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('fraudshield_user');
    showLogin();
});

// ─── Navigation ─────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        switchSection(section);
    });
});

function switchSection(section) {
    if (!section) return;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`[data-section="${section}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Update content visibility
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const sectionEl = document.getElementById(`section-${section}`);
    if (sectionEl) {
        sectionEl.classList.add('active');
    }

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        'make-transaction': 'Send Money',
        customers: 'Customer Management',
        transactions: 'Transaction History',
        model: 'AI Intelligence'
    };
    document.getElementById('page-title').textContent = titles[section] || 'Dashboard';
    currentSection = section;

    // Data Hydration
    if (section === 'transactions') loadTransactions();
    if (section === 'customers' && currentUser && currentUser.role === 'admin') loadCustomers();
    if (section === 'model' && currentUser && currentUser.role === 'admin') loadModelInfo();
    if (section === 'dashboard') loadDashboardData();
}

// ─── API Helper ─────────────────────────────────────────────
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-User-Role': currentUser ? currentUser.role : 'guest',
        'X-User-Id': currentUser ? currentUser.id : ''
    };
}

// ─── Clock ──────────────────────────────────────────────────
function updateClock() {
    const now = new Date();
    const el = document.getElementById('header-time');
    if (el) {
        el.textContent = now.toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
}

// ─── Profile Data ───────────────────────────────────────────
async function loadProfile() {
    if (!currentUser || currentUser.role === 'admin') {
        document.getElementById('display-user-acc').textContent = 'Admin Mode';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/user/profile/${currentUser.id}`, {
            headers: getAuthHeaders()
        });
        const user = await res.json();
        document.getElementById('display-user-acc').textContent = user.account_number;
        document.getElementById('stat-balance-val').textContent = `₹${user.balance.toLocaleString('en-IN')}`;
    } catch (err) {
        console.error('Failed to load profile', err);
    }
}

// ─── Dashboard Data ─────────────────────────────────────────
async function loadDashboardData() {
    loadStats();
    loadAlerts();
    if (currentUser && currentUser.role === 'admin') {
        loadCharts();
    }
}

async function loadStats() {
    try {
        const url = currentUser.role === 'admin' ? `${API_BASE}/stats` : `${API_BASE}/stats?user_id=${currentUser.id}`;
        const res = await fetch(url, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (currentUser.role === 'admin') {
            animateValue('stat-total-val', 0, data.total_transactions, 1000, v => Math.floor(v).toLocaleString());
            animateValue('stat-fraud-val', 0, data.fraud_detected, 1000, v => Math.floor(v).toLocaleString());
        } else {
            animateValue('stat-total-val', 0, data.total_transactions, 1000, v => Math.floor(v).toLocaleString());
            animateValue('stat-fraud-val', 0, data.fraud_detected, 1000, v => Math.floor(v).toLocaleString());
            animateValue('stat-balance-val', 0, data.balance, 1000, v => `₹${v.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
        }
    } catch (err) {
        console.error('Stats load failed', err);
    }
}

function animateValue(elementId, start, end, duration, formatter) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (end - start) * eased;
        el.textContent = formatter(current);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ─── Alerts / Activity Feed ────────────────────────────────
async function loadAlerts() {
    try {
        const url = currentUser.role === 'admin' 
            ? `${API_BASE}/transactions?filter=fraud&per_page=5`
            : `${API_BASE}/transactions?user_id=${currentUser.id}&per_page=5`;
        
        const res = await fetch(url, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        renderAlerts(data.transactions);
        
        if (currentUser.role === 'user') {
            document.getElementById('recent-activity-title').textContent = 'Recent Transactions';
        } else {
            document.getElementById('recent-activity-title').textContent = '🚨 Recent Fraud Alerts';
        }
    } catch (err) {
        console.error('Alerts load failed', err);
    }
}

function renderAlerts(alerts) {
    const container = document.getElementById('alerts-list');
    if (!container) return;

    if (!alerts || alerts.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">No activity recorded yet.</div>';
        return;
    }

    container.innerHTML = alerts.map(a => `
        <div class="alert-item" style="${!a.is_fraud ? 'background: rgba(16,185,129,0.05); border-color:rgba(16,185,129,0.1)' : ''}">
            <div class="alert-dot" style="${!a.is_fraud ? 'background: var(--accent-emerald); box-shadow: 0 0 10px var(--accent-emerald); animation:none' : ''}"></div>
            <div class="alert-info">
                <div class="alert-title">${currentUser.role === 'admin' ? a.cardholder : (a.id || 'TXN')} — ${a.status}</div>
                <div class="alert-meta">${a.category} • ${a.city} • ${formatTime(a.datetime)}</div>
            </div>
            <div class="alert-amount" style="${!a.is_fraud ? 'color: var(--accent-emerald)' : ''}">₹${parseFloat(a.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
    `).join('');
}

function formatTime(dt) {
    const date = new Date(dt);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Transactions History ──────────────────────────────────
async function loadTransactions() {
    try {
        const url = `${API_BASE}/transactions?filter=${currentFilter}&page=${currentPage}&per_page=10&user_id=${currentUser.id}`;
        const res = await fetch(url, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        renderTransactions(data.transactions);
        renderPagination(data.total_pages, data.page);
    } catch (err) {
        console.error('Transactions load failed', err);
    }
}

function renderTransactions(txns) {
    const tbody = document.getElementById('transactions-body');
    if (!tbody) return;

    if (!txns || txns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">No transactions found.</td></tr>';
        return;
    }

    tbody.innerHTML = txns.map(t => {
        const isFraud = t.is_fraud;
        const statusClass = isFraud ? 'fraud' : 'legit';
        const statusLabel = isFraud ? 'Blocked' : 'Success';

        return `
        <tr>
            <td style="font-family: var(--font-mono); font-size: 0.85rem;">${t.id}</td>
            <td class="admin-only">${t.cardholder}</td>
            <td class="amount" style="color:${isFraud ? '#f43f5e' : 'var(--text-primary)'}">₹${parseFloat(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td>${t.category}</td>
            <td>${t.city}</td>
            <td style="font-size:0.85rem;color:var(--text-secondary)">${formatTime(t.datetime)}</td>
            <td><span class="status-pill ${statusClass}"><span class="status-dot"></span>${statusLabel}</span></td>
            <td>
                <div class="confidence-bar"><div class="confidence-fill" style="width:${t.confidence * 100}%; background:${isFraud ? '#f43f5e' : '#10b981'}"></div></div>
                <span style="font-family:var(--font-mono);font-size:0.8rem;color:${isFraud ? '#f43f5e' : '#10b981'}">${(t.confidence * 100).toFixed(0)}%</span>
            </td>
        </tr>`;
    }).join('');
}

function renderPagination(totalPages, page) {
    const container = document.getElementById('pagination');
    if (!container) return;
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    container.innerHTML = html;
}

window.goToPage = (page) => {
    currentPage = page;
    loadTransactions();
};

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        currentPage = 1;
        loadTransactions();
    });
});

// ─── Make Transaction (User) ──────────────────────────────
const transferForm = document.getElementById('transfer-form');
if (transferForm) {
    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            user_id: currentUser.id,
            amount: parseFloat(document.getElementById('tx-amount').value),
            merchant_category: parseInt(document.getElementById('tx-category').value),
            city: document.getElementById('tx-city').value,
            is_international: document.getElementById('tx-international').checked ? 1 : 0,
            is_online: document.getElementById('tx-online').checked ? 1 : 0
        };

        const btn = document.getElementById('btn-submit-tx');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Processing...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/transaction/create`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                showNotification('Transaction Successful!', 'success');
                transferForm.reset();
                loadProfile(); // Update balance
            } else {
                showNotification(data.message || 'Transaction Blocked!', 'error');
            }
        } catch (err) {
            showNotification('Transaction failed to process', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// ─── Customer Management (Admin) ──────────────────────────
async function loadCustomers() {
    try {
        const res = await fetch(`${API_BASE}/admin/customers`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        renderCustomers(data);
    } catch (err) {
        console.error('Customers load failed', err);
    }
}

function renderCustomers(customers) {
    const tbody = document.getElementById('customers-body');
    if (!tbody) return;

    if (!customers || customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No customers found.</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map(c => `
        <tr>
            <td style="font-weight:600">${c.name}</td>
            <td style="color:var(--text-secondary)">${c.email}</td>
            <td style="font-family:var(--font-mono); font-size:0.85rem">${c.account_number}</td>
            <td style="font-weight:700">₹${c.balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            <td>
                <button class="btn-outline btn-sm" onclick="viewUserHistory('${c.id}')">History</button>
            </td>
        </tr>
    `).join('');
}

window.viewUserHistory = (userId) => {
    alert(`Viewing history for ${userId} (In a full app, this would filter the transaction table)`);
};

// ─── Charts (Admin) ────────────────────────────────────────
async function loadCharts() {
    try {
        const res = await fetch(`${API_BASE}/chart-data`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        createHourlyChart(data.fraud_by_hour);
        createCategoryChart(data.fraud_by_category);
    } catch (err) {
        console.error('Charts load failed', err);
    }
}

function createHourlyChart(data) {
    const ctx = document.getElementById('chart-hourly');
    if (!ctx) return;
    
    if (charts.hourly) charts.hourly.destroy();
    
    charts.hourly = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Fraud Probability',
                data: data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function createCategoryChart(data) {
    const ctx = document.getElementById('chart-category');
    if (!ctx) return;

    if (charts.category) charts.category.destroy();

    charts.category = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#3b82f6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
        }
    });
}

// ─── Model Info (Admin) ────────────────────────────────────
async function loadModelInfo() {
    try {
        const res = await fetch(`${API_BASE}/model-info`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        
        const container = document.getElementById('model-metrics');
        if (container) {
            container.innerHTML = `
                <div class="metric-item">
                    <span class="metric-name">Precision</span>
                    <span class="metric-value good">${(data.precision * 100).toFixed(1)}%</span>
                </div>
                <div class="metric-item">
                    <span class="metric-name">Recall</span>
                    <span class="metric-value great">${(data.recall * 100).toFixed(1)}%</span>
                </div>
                <div class="metric-item">
                    <span class="metric-name">F1 Score</span>
                    <span class="metric-value good">${(data.f1_score * 100).toFixed(1)}%</span>
                </div>
            `;
        }

        renderConfusionMatrix(data.confusion_matrix);
    } catch (err) {
        console.error('Model info failed', err);
    }
}

function renderConfusionMatrix(cm) {
    const container = document.getElementById('confusion-matrix');
    if (!container || !cm) return;
    container.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; width:100%">
            <div class="glass-card" style="margin:0; text-align:center">
                <div style="font-size:0.7rem; color:var(--text-muted)">True Negatives</div>
                <div style="font-size:1.2rem; font-weight:700">${cm[0][0]}</div>
            </div>
            <div class="glass-card" style="margin:0; text-align:center">
                <div style="font-size:0.7rem; color:var(--text-muted)">False Positives</div>
                <div style="font-size:1.2rem; font-weight:700">${cm[0][1]}</div>
            </div>
            <div class="glass-card" style="margin:0; text-align:center">
                <div style="font-size:0.7rem; color:var(--text-muted)">False Negatives</div>
                <div style="font-size:1.2rem; font-weight:700">${cm[1][0]}</div>
            </div>
            <div class="glass-card" style="margin:0; text-align:center">
                <div style="font-size:0.7rem; color:var(--text-muted)">True Positives</div>
                <div style="font-size:1.2rem; font-weight:700">${cm[1][1]}</div>
            </div>
        </div>
    `;
}

// ─── Notifications ─────────────────────────────────────────
function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.innerHTML = `
        <div class="notif-icon">${type === 'success' ? '✅' : '🚨'}</div>
        <div class="notif-text">${message}</div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Run init
init();
