/* ═══════════════════════════════════════════════════════════
   FraudShield — Dashboard JavaScript
   Handles API communication, charts, and UI interactions
   ═══════════════════════════════════════════════════════════ */

const API_BASE = 'http://localhost:5000/api';

// ─── Chart.js Global Config ────────────────────────────────
Chart.defaults.color = '#a0a0c0';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.scale.grid = { color: 'rgba(99, 102, 241, 0.06)' };
Chart.defaults.scale.border = { color: 'rgba(99, 102, 241, 0.1)' };

// ─── State ──────────────────────────────────────────────────
let currentSection = 'dashboard';
let currentFilter = 'all';
let currentPage = 1;
let charts = {};

// ─── Navigation ─────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        switchSection(section);
    });
});

function switchSection(section) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const sectionEl = document.getElementById(`section-${section}`);
    sectionEl.classList.remove('active');
    // Force reflow for animation
    void sectionEl.offsetWidth;
    sectionEl.classList.add('active');

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        analyze: 'Analyze Transaction',
        transactions: 'Transactions',
        model: 'Model Performance'
    };
    document.getElementById('page-title').textContent = titles[section] || 'Dashboard';
    currentSection = section;

    // Load section data
    if (section === 'transactions') loadTransactions();
    if (section === 'model') loadModelInfo();

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
}

// ─── Mobile Menu ────────────────────────────────────────────
document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// ─── Clock ──────────────────────────────────────────────────
function updateClock() {
    const now = new Date();
    document.getElementById('header-time').textContent = now.toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}
setInterval(updateClock, 1000);
updateClock();

// ─── Dashboard Stats ───────────────────────────────────────
async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/stats`);
        const data = await res.json();

        animateValue('stat-total-val', 0, data.total_transactions, 1200, val => val.toLocaleString());
        animateValue('stat-fraud-val', 0, data.fraud_detected, 1200, val => val.toLocaleString());
        animateValue('stat-accuracy-val', 0, data.model_accuracy * 100, 1200, val => val.toFixed(1) + '%');
        animateValue('stat-protected-val', 0, data.total_amount_protected, 1200, val => '$' + (val / 1e6).toFixed(2) + 'M');
    } catch (err) {
        console.warn('Stats API not available:', err.message);
        document.getElementById('stat-total-val').textContent = '15,000';
        document.getElementById('stat-fraud-val').textContent = '900';
        document.getElementById('stat-accuracy-val').textContent = '97.2%';
        document.getElementById('stat-protected-val').textContent = '$3.45M';
    }
}

function animateValue(elementId, start, end, duration, formatter) {
    const el = document.getElementById(elementId);
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = start + (end - start) * eased;

        el.textContent = formatter(current);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// ─── Dashboard Charts ──────────────────────────────────────
async function loadCharts() {
    try {
        const res = await fetch(`${API_BASE}/chart-data`);
        const data = await res.json();
        createHourlyChart(data.fraud_by_hour);
        createCategoryChart(data.fraud_by_category);
        createWeeklyChart(data.weekly_trend);
        createAmountChart(data.amount_ranges, data.fraud_by_amount);
    } catch (err) {
        console.warn('Chart API not available, using sample data');
        createSampleCharts();
    }
}

function createHourlyChart(hourlyData) {
    const ctx = document.getElementById('chart-hourly').getContext('2d');
    if (charts.hourly) charts.hourly.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.01)');

    charts.hourly = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Fraud Count',
                data: hourlyData,
                borderColor: '#6366f1',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#6366f1',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 30, 0.9)',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: { ticks: { maxTicksLimit: 8, font: { size: 11 } } },
                y: { beginAtZero: true, ticks: { font: { size: 11 } } }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

function createCategoryChart(categoryData) {
    const ctx = document.getElementById('chart-category').getContext('2d');
    if (charts.category) charts.category.destroy();

    const labels = Object.keys(categoryData);
    const values = Object.values(categoryData);
    const colors = [
        '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e',
        '#a855f7', '#6366f1', '#ec4899', '#14b8a6', '#ef4444'
    ];

    charts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.map(c => c + '40'),
                borderColor: colors,
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { font: { size: 11 }, boxWidth: 12, padding: 10 }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 30, 0.9)',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8
                }
            },
            cutout: '65%'
        }
    });
}

function createWeeklyChart(weeklyData) {
    const ctx = document.getElementById('chart-weekly').getContext('2d');
    if (charts.weekly) charts.weekly.destroy();

    charts.weekly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weeklyData.map(d => d.day),
            datasets: [
                {
                    label: 'Total Transactions',
                    data: weeklyData.map(d => d.total),
                    backgroundColor: 'rgba(99, 102, 241, 0.3)',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    borderRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'Fraud Detected',
                    data: weeklyData.map(d => d.fraud),
                    backgroundColor: 'rgba(244, 63, 94, 0.5)',
                    borderColor: '#f43f5e',
                    borderWidth: 1,
                    borderRadius: 6,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { font: { size: 11 } } },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 30, 0.9)',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: { ticks: { font: { size: 11 } } },
                y: { position: 'left', beginAtZero: true, ticks: { font: { size: 11 } } },
                y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { font: { size: 11 } } }
            }
        }
    });
}

function createAmountChart(ranges, values) {
    const ctx = document.getElementById('chart-amount').getContext('2d');
    if (charts.amount) charts.amount.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.05)');

    charts.amount = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ranges,
            datasets: [{
                label: 'Fraud Cases',
                data: values,
                backgroundColor: gradient,
                borderColor: '#a855f7',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 30, 0.9)',
                    borderColor: 'rgba(168, 85, 247, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: { ticks: { font: { size: 11 } } },
                y: { beginAtZero: true, ticks: { font: { size: 11 } } }
            }
        }
    });
}

function createSampleCharts() {
    const hourly = Array.from({ length: 24 }, (_, i) => 
        i >= 0 && i <= 5 ? Math.floor(Math.random() * 25) + 15 : Math.floor(Math.random() * 10) + 2
    );
    createHourlyChart(hourly);

    createCategoryChart({
        'Grocery': 12, 'Gas': 8, 'Restaurant': 10, 'Online': 15,
        'Travel': 18, 'Entertainment': 14, 'Electronics': 20,
        'Cash Advance': 55, 'Jewelry': 48, 'Money Transfer': 65
    });

    createWeeklyChart([
        { day: 'Mon', total: 2100, fraud: 18 },
        { day: 'Tue', total: 2300, fraud: 22 },
        { day: 'Wed', total: 1950, fraud: 15 },
        { day: 'Thu', total: 2200, fraud: 28 },
        { day: 'Fri', total: 2400, fraud: 32 },
        { day: 'Sat', total: 1800, fraud: 12 },
        { day: 'Sun', total: 1600, fraud: 10 }
    ]);

    createAmountChart(
        ['$0-50', '$50-200', '$200-500', '$500-1K', '$1K-5K', '$5K+'],
        [8, 18, 35, 48, 58, 72]
    );
}

// ─── Fraud Alerts ───────────────────────────────────────────
async function loadAlerts() {
    try {
        const res = await fetch(`${API_BASE}/transactions?filter=fraud&per_page=5`);
        const data = await res.json();
        renderAlerts(data.transactions);
    } catch (err) {
        renderAlerts(getSampleAlerts());
    }
}

function getSampleAlerts() {
    return [
        { id: 'TXN-10042', cardholder: 'Michael Davis', amount: 8450.00, category: 'Jewelry & Luxury', datetime: new Date().toISOString(), city: 'Lagos', confidence: 0.97 },
        { id: 'TXN-10038', cardholder: 'Nina Patel', amount: 3200.00, category: 'Money Transfer', datetime: new Date(Date.now() - 3600000).toISOString(), city: 'Unknown', confidence: 0.94 },
        { id: 'TXN-10035', cardholder: 'Kevin Wu', amount: 12500.00, category: 'Cash Advance', datetime: new Date(Date.now() - 7200000).toISOString(), city: 'Moscow', confidence: 0.99 },
        { id: 'TXN-10029', cardholder: 'Laura Martinez', amount: 1890.00, category: 'Electronics', datetime: new Date(Date.now() - 10800000).toISOString(), city: 'Dubai', confidence: 0.91 },
        { id: 'TXN-10025', cardholder: 'Samuel Jackson', amount: 5670.00, category: 'Money Transfer', datetime: new Date(Date.now() - 14400000).toISOString(), city: 'London', confidence: 0.96 },
    ];
}

function renderAlerts(alerts) {
    const container = document.getElementById('alerts-list');
    container.innerHTML = alerts.map(a => `
        <div class="alert-item">
            <div class="alert-dot"></div>
            <div class="alert-info">
                <div class="alert-title">${a.cardholder} — ${a.id}</div>
                <div class="alert-meta">${a.category} • ${a.city} • ${formatTime(a.datetime)}</div>
            </div>
            <div class="alert-amount">$${parseFloat(a.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
    `).join('');
}

function formatTime(dt) {
    const date = new Date(dt);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Analyze / Predict ─────────────────────────────────────
document.getElementById('predict-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
        amount: parseFloat(document.getElementById('input-amount').value),
        time_seconds: parseFloat(document.getElementById('input-time').value),
        distance_from_home: parseFloat(document.getElementById('input-distance').value),
        transaction_frequency: parseInt(document.getElementById('input-frequency').value),
        merchant_risk_score: parseFloat(document.getElementById('input-merchant-risk').value),
        hour_of_day: parseInt(document.getElementById('input-hour').value),
        day_of_week: parseInt(document.getElementById('input-day').value),
        merchant_category: parseInt(document.getElementById('input-category').value),
        cardholder_age: parseFloat(document.getElementById('input-age').value),
        card_age_years: parseFloat(document.getElementById('input-card-age').value),
        velocity_24h: parseInt(document.getElementById('input-velocity').value),
        amount_deviation: parseFloat(document.getElementById('input-deviation').value),
        is_international: document.getElementById('input-international').checked ? 1 : 0,
        is_online: document.getElementById('input-online').checked ? 1 : 0,
        pin_used: document.getElementById('input-pin').checked ? 1 : 0
    };

    const btn = document.getElementById('btn-predict');
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0"></div> Analyzing...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        showResult(result);
    } catch (err) {
        // Simulate result if API is down
        const fakeProb = payload.amount > 1000 && payload.distance_from_home > 50 ? 0.85 : 0.12;
        showResult({
            is_fraud: fakeProb > 0.5,
            fraud_probability: fakeProb,
            legitimate_probability: 1 - fakeProb,
            risk_level: fakeProb > 0.7 ? 'HIGH' : fakeProb > 0.4 ? 'MEDIUM' : 'LOW',
            feature_contributions: {}
        });
    } finally {
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Analyze Transaction`;
        btn.disabled = false;
    }
});

function showResult(result) {
    const card = document.getElementById('result-card');
    card.classList.remove('hidden');

    // Icon
    const icon = document.getElementById('result-icon');
    if (result.is_fraud) {
        icon.className = 'result-icon fraud';
        icon.innerHTML = '🚨';
        document.getElementById('result-title').textContent = 'Fraudulent Transaction Detected';
        document.getElementById('result-subtitle').textContent = 'This transaction exhibits fraud patterns.';
        document.getElementById('result-header').style.borderBottomColor = 'rgba(244, 63, 94, 0.2)';
    } else {
        icon.className = 'result-icon legit';
        icon.innerHTML = '✅';
        document.getElementById('result-title').textContent = 'Legitimate Transaction';
        document.getElementById('result-subtitle').textContent = 'This transaction appears to be genuine.';
        document.getElementById('result-header').style.borderBottomColor = 'rgba(16, 185, 129, 0.2)';
    }

    // Meters
    const fraudPct = (result.fraud_probability * 100);
    const legitPct = (result.legitimate_probability * 100);

    setTimeout(() => {
        document.getElementById('meter-fraud').style.width = fraudPct + '%';
        document.getElementById('meter-legit').style.width = legitPct + '%';
    }, 50);

    document.getElementById('meter-fraud-val').textContent = fraudPct.toFixed(1) + '%';
    document.getElementById('meter-legit-val').textContent = legitPct.toFixed(1) + '%';

    // Risk badge
    const badge = document.getElementById('risk-badge');
    badge.textContent = result.risk_level + ' RISK';
    badge.className = 'risk-badge ' + result.risk_level.toLowerCase();

    // Feature importance
    const featContainer = document.getElementById('feature-importance-mini');
    if (result.feature_contributions && Object.keys(result.feature_contributions).length > 0) {
        const sorted = Object.entries(result.feature_contributions)
            .sort((a, b) => b[1].importance - a[1].importance)
            .slice(0, 6);

        featContainer.innerHTML = sorted.map(([name, info]) => `
            <div class="feat-mini-item">
                <span class="feat-mini-name">${name.replace(/_/g, ' ')}</span>
                <span class="feat-mini-val">${typeof info.value === 'number' ? info.value.toFixed(2) : info.value}</span>
            </div>
        `).join('');
    }

    // Scroll to result
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Fill sample data
document.getElementById('btn-fill-sample').addEventListener('click', () => {
    document.getElementById('input-amount').value = '4500.00';
    document.getElementById('input-distance').value = '120.5';
    document.getElementById('input-frequency').value = '8';
    document.getElementById('input-merchant-risk').value = '0.75';
    document.getElementById('input-hour').value = '2';
    document.getElementById('input-day').value = '5';
    document.getElementById('input-category').value = '9';
    document.getElementById('input-age').value = '28';
    document.getElementById('input-card-age').value = '0.5';
    document.getElementById('input-velocity').value = '9';
    document.getElementById('input-deviation').value = '4.2';
    document.getElementById('input-time').value = '85000';
    document.getElementById('input-international').checked = true;
    document.getElementById('input-online').checked = true;
    document.getElementById('input-pin').checked = false;
});

// ─── Transactions ───────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        currentPage = 1;
        loadTransactions();
    });
});

async function loadTransactions() {
    try {
        const res = await fetch(`${API_BASE}/transactions?filter=${currentFilter}&page=${currentPage}&per_page=10`);
        const data = await res.json();
        renderTransactions(data.transactions);
        renderPagination(data.total_pages, data.page);
    } catch (err) {
        renderTransactions(getSampleTransactions());
        renderPagination(3, 1);
    }
}

function getSampleTransactions() {
    const names = ['Alice Johnson', 'Bob Smith', 'Carlos Rivera', 'Diana Chen', 'Ethan Brown', 'Fiona O\'Brien', 'George Kim', 'Hannah Lee', 'Ivan Petrov', 'Julia Santos'];
    const categories = ['Grocery', 'Gas Station', 'Restaurant', 'Online Shopping', 'Travel', 'Entertainment', 'Electronics', 'Cash Advance', 'Jewelry', 'Money Transfer'];
    const cities = ['New York', 'Los Angeles', 'Chicago', 'London', 'Tokyo', 'Mumbai', 'Sydney', 'Toronto', 'Dubai', 'Singapore'];

    return Array.from({ length: 10 }, (_, i) => ({
        id: `TXN-${10000 + i}`,
        cardholder: names[i],
        amount: Math.random() < 0.15 ? (Math.random() * 10000 + 500).toFixed(2) : (Math.random() * 500 + 10).toFixed(2),
        category: categories[Math.floor(Math.random() * categories.length)],
        city: cities[Math.floor(Math.random() * cities.length)],
        datetime: new Date(Date.now() - Math.random() * 259200000).toISOString(),
        is_fraud: Math.random() < 0.15,
        confidence: Math.random() < 0.15 ? (Math.random() * 0.15 + 0.85).toFixed(2) : (Math.random() * 0.1 + 0.02).toFixed(2),
        card_last4: String(Math.floor(Math.random() * 9000) + 1000)
    }));
}

function renderTransactions(transactions) {
    const tbody = document.getElementById('transactions-body');
    tbody.innerHTML = transactions.map(t => {
        const isFraud = t.is_fraud;
        const conf = parseFloat(t.confidence);
        const confColor = isFraud ? '#f43f5e' : '#10b981';

        return `
        <tr>
            <td style="font-family: var(--font-mono); font-size: 0.85rem;">${t.id}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width:32px;height:32px;border-radius:50%;background:${isFraud ? 'rgba(244,63,94,0.12)' : 'rgba(99,102,241,0.12)'};display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:600;color:${isFraud ? '#f43f5e' : '#6366f1'}">${t.cardholder.split(' ').map(n => n[0]).join('')}</div>
                    <div>
                        <div style="font-weight:500">${t.cardholder}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted)">•••• ${t.card_last4}</div>
                    </div>
                </div>
            </td>
            <td class="amount" style="color:${isFraud ? '#f43f5e' : 'var(--text-primary)'}">$${parseFloat(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td>${t.category}</td>
            <td>${t.city}</td>
            <td style="font-size:0.85rem;color:var(--text-secondary)">${formatTime(t.datetime)}</td>
            <td><span class="status-pill ${isFraud ? 'fraud' : 'legit'}"><span class="status-dot"></span>${isFraud ? 'Fraud' : 'Legit'}</span></td>
            <td>
                <div class="confidence-bar"><div class="confidence-fill" style="width:${conf * 100}%;background:${confColor}"></div></div>
                <span style="font-family:var(--font-mono);font-size:0.8rem;color:${confColor}">${(conf * 100).toFixed(0)}%</span>
            </td>
        </tr>`;
    }).join('');
}

function renderPagination(totalPages, currentPage) {
    const container = document.getElementById('pagination');
    let html = '';

    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadTransactions();
}

// ─── Model Info ─────────────────────────────────────────────
async function loadModelInfo() {
    try {
        const res = await fetch(`${API_BASE}/model-info`);
        const data = await res.json();
        renderModelMetrics(data);
        renderConfusionMatrix(data.confusion_matrix);
        createFeatureChart(data.feature_importance);
    } catch (err) {
        renderModelMetrics({
            accuracy: 0.972, precision: 0.945, recall: 0.918,
            f1_score: 0.931, auc_roc: 0.985,
            training_samples: 12000, test_samples: 3000
        });
        renderConfusionMatrix([[2820, 12], [15, 153]]);
        createFeatureChart({
            amount: 0.22, distance_from_home: 0.18, amount_deviation: 0.14,
            merchant_risk_score: 0.12, velocity_24h: 0.09, card_age_years: 0.06,
            transaction_frequency: 0.05, is_online: 0.04, is_international: 0.03,
            hour_of_day: 0.02, pin_used: 0.015, cardholder_age: 0.01,
            merchant_category: 0.008, day_of_week: 0.005, time_seconds: 0.002
        });
    }
}

function renderModelMetrics(data) {
    const container = document.getElementById('model-metrics');
    const items = [
        { name: 'Accuracy', value: (data.accuracy * 100).toFixed(1) + '%', cls: 'great' },
        { name: 'Precision', value: (data.precision * 100).toFixed(1) + '%', cls: 'good' },
        { name: 'Recall', value: (data.recall * 100).toFixed(1) + '%', cls: 'good' },
        { name: 'F1 Score', value: (data.f1_score * 100).toFixed(1) + '%', cls: 'good' },
        { name: 'AUC-ROC', value: (data.auc_roc * 100).toFixed(1) + '%', cls: 'great' },
        { name: 'Training Set', value: (data.training_samples || 12000).toLocaleString(), cls: 'good' },
    ];

    container.innerHTML = items.map(item => `
        <div class="metric-item">
            <span class="metric-name">${item.name}</span>
            <span class="metric-value ${item.cls}">${item.value}</span>
        </div>
    `).join('');
}

function renderConfusionMatrix(cm) {
    const container = document.getElementById('confusion-matrix');
    if (!cm || cm.length < 2) return;

    container.innerHTML = `
        <div></div>
        <div class="cm-header">Pred. Legit</div>
        <div class="cm-header">Pred. Fraud</div>
        <div class="cm-header" style="writing-mode: vertical-lr; transform: rotate(180deg);">Actual Legit</div>
        <div class="cm-cell cm-tp">${cm[0][0]}<span class="cm-label">True Neg</span></div>
        <div class="cm-cell cm-fp">${cm[0][1]}<span class="cm-label">False Pos</span></div>
        <div class="cm-header" style="writing-mode: vertical-lr; transform: rotate(180deg);">Actual Fraud</div>
        <div class="cm-cell cm-fn">${cm[1][0]}<span class="cm-label">False Neg</span></div>
        <div class="cm-cell cm-tn">${cm[1][1]}<span class="cm-label">True Pos</span></div>
    `;
}

function createFeatureChart(featureImportance) {
    const ctx = document.getElementById('chart-features').getContext('2d');
    if (charts.features) charts.features.destroy();

    const sorted = Object.entries(featureImportance).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([k]) => k.replace(/_/g, ' '));
    const values = sorted.map(([, v]) => (v * 100).toFixed(1));

    const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.6)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.6)');

    charts.features = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Importance (%)',
                data: values,
                backgroundColor: gradient,
                borderColor: 'rgba(99, 102, 241, 0.8)',
                borderWidth: 1,
                borderRadius: 6,
                barThickness: 20
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 30, 0.9)',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => `Importance: ${ctx.raw}%`
                    }
                }
            },
            scales: {
                x: { beginAtZero: true, ticks: { font: { size: 11 }, callback: v => v + '%' } },
                y: { ticks: { font: { size: 11 } } }
            }
        }
    });
}

// ─── View All Alerts ────────────────────────────────────────
document.getElementById('btn-view-all-alerts').addEventListener('click', () => {
    switchSection('transactions');
    document.querySelector('[data-filter="fraud"]').click();
});

// ─── Initialize ─────────────────────────────────────────────
async function init() {
    loadStats();
    loadCharts();
    loadAlerts();
}

init();
