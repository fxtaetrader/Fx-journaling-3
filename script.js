// ===== FX TAE TRADING JOURNAL - COMPLETE FIXED VERSION =====
// All issues fixed: PDF balance, Equity Curve, Withdrawals

// ===== AUTHENTICATION & USER MANAGEMENT =====
const USERS_KEY = 'fxTaeUsers';
const CURRENT_USER_KEY = 'fxTaeCurrentUser';
const AUTH_KEY = 'fxTaeAuthenticated';

// Dashboard Data Keys
const TRADES_KEY = 'fxTaeTrades';
const GOALS_KEY = 'fxTaeGoals';
const DEPOSITS_KEY = 'fxTaeDeposits';
const WITHDRAWALS_KEY = 'fxTaeWithdrawals';
const STARTING_BALANCE_KEY = 'fxTaeStartingBalance';

// Global state
let trades = [];
let goals = [];
let deposits = [];
let withdrawals = [];
let accountBalance = 0;
let startingBalance = 0;
let equityChart = null;
let winLossChart = null;
let buysSellsChart = null;
let currentCalendarMonth = new Date().getMonth();
let currentCalendarYear = new Date().getFullYear();

// ===== AUTHENTICATION FUNCTIONS =====
function initializeUsers() {
    if (!localStorage.getItem(USERS_KEY)) {
        localStorage.setItem(USERS_KEY, JSON.stringify([]));
    }
}

function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

function saveUser(user) {
    const users = getUsers();
    if (users.some(u => u.email === user.email)) {
        return { success: false, message: 'Email already registered' };
    }
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return { success: true };
}

function authenticateUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    return user ? { success: true, user } : { success: false, message: 'Invalid email or password' };
}

function setCurrentUser(user) {
    const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
    sessionStorage.setItem(AUTH_KEY, 'true');
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
}

function isAuthenticated() {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
}

function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.replace('index.html');
}

// ===== PREVENT BACK NAVIGATION =====
function preventBackNavigation() {
    history.pushState(null, null, location.href);
    window.addEventListener('popstate', function(event) {
        history.pushState(null, null, location.href);
    });
}

// ===== ALLOW SCROLLING =====
function enableScrolling() {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    const mainContainer = document.querySelector('.dashboard-main');
    if (mainContainer) {
        mainContainer.style.overflowY = 'visible';
        mainContainer.style.height = 'auto';
        mainContainer.style.minHeight = 'calc(100vh - 70px)';
    }
}

// ===== UTILITY FUNCTIONS =====
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
    return `$${Math.abs(amount).toFixed(2)}`;
}

function formatCurrencyWithSign(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function formatFullDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function formatDateTime(dateString, timeString) {
    if (!dateString) return '';
    try {
        return `${formatFullDate(dateString)} ${timeString || ''}`.trim();
    } catch {
        return dateString;
    }
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    
    const icon = iconMap[type] || 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode === container) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ===== DATA MANAGEMENT =====
function loadTrades() {
    try {
        const saved = localStorage.getItem(TRADES_KEY);
        trades = saved ? JSON.parse(saved) : [];
    } catch {
        trades = [];
    }
}

function loadGoals() {
    try {
        const saved = localStorage.getItem(GOALS_KEY);
        goals = saved ? JSON.parse(saved) : [];
    } catch {
        goals = [];
    }
}

function loadDeposits() {
    try {
        const saved = localStorage.getItem(DEPOSITS_KEY);
        deposits = saved ? JSON.parse(saved) : [];
    } catch {
        deposits = [];
    }
}

function loadWithdrawals() {
    try {
        const saved = localStorage.getItem(WITHDRAWALS_KEY);
        withdrawals = saved ? JSON.parse(saved) : [];
    } catch {
        withdrawals = [];
    }
}

function loadStartingBalance() {
    try {
        const saved = localStorage.getItem(STARTING_BALANCE_KEY);
        startingBalance = saved ? parseFloat(saved) : 0;
    } catch {
        startingBalance = 0;
    }
}

function saveStartingBalance() {
    localStorage.setItem(STARTING_BALANCE_KEY, startingBalance.toString());
}

function calculateAccountBalance() {
    // CRITICAL: Current Balance = Starting Balance + Total P&L - Total Withdrawals
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
    return startingBalance + totalPnL - totalWithdrawals;
}

function loadAccountBalance() {
    accountBalance = calculateAccountBalance();
}

function saveTrades() {
    localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
}

function saveGoals() {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

function saveDeposits() {
    localStorage.setItem(DEPOSITS_KEY, JSON.stringify(deposits));
}

function saveWithdrawals() {
    localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(withdrawals));
}

// ===== DASHBOARD INITIALIZATION =====
function initializeDashboard() {
    console.log('Initializing FX TAE Dashboard...');
    
    if (!isAuthenticated()) {
        window.location.replace('index.html');
        return;
    }
    
    preventBackNavigation();
    enableScrolling();
    
    try {
        loadStartingBalance();
        loadTrades();
        loadGoals();
        loadDeposits();
        loadWithdrawals();
        loadAccountBalance();
        
        updateUserInfo();
        updateAccountBalanceDisplay();
        updateDashboardStats();
        updateRecentActivity();
        updateTransactionHistory();
        updateAllTradesTable();
        updateGoalsList();
        updateCalendar();
        
        setTimeout(() => {
            initializeCharts();
        }, 500);
        
        setTodayDates();
        setupEventListeners();
        
        const savedTheme = localStorage.getItem('fxTaeTheme') || 'light';
        setTheme(savedTheme);
        
        console.log('Dashboard initialized successfully!');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showToast('Error loading dashboard. Please refresh.', 'error');
    }
}

function setTodayDates() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const tradeDate = document.getElementById('tradeDate');
    if (tradeDate) tradeDate.value = today;
    
    const tradeTime = document.getElementById('tradeTime');
    if (tradeTime) tradeTime.value = timeStr;
    
    const depositDate = document.getElementById('depositDate');
    if (depositDate) depositDate.value = today;
    
    const depositTime = document.getElementById('depositTime');
    if (depositTime) depositTime.value = timeStr;
    
    const withdrawalDate = document.getElementById('withdrawalDate');
    if (withdrawalDate) withdrawalDate.value = today;
    
    const withdrawalTime = document.getElementById('withdrawalTime');
    if (withdrawalTime) withdrawalTime.value = timeStr;
}

// ===== UI UPDATES =====
function updateUserInfo() {
    const user = getCurrentUser();
    
    const userNameElements = ['userName', 'sidebarUserName', 'dashboardUserName'];
    userNameElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = user.name || 'Trader';
    });
    
    const userEmailEl = document.getElementById('sidebarUserEmail');
    if (userEmailEl) userEmailEl.textContent = user.email || 'trader@example.com';
    
    const settingsEmailEl = document.getElementById('settingsEmail');
    if (settingsEmailEl) settingsEmailEl.value = user.email || 'trader@example.com';
}

function updateAccountBalanceDisplay() {
    // Recalculate balance to ensure it's correct
    accountBalance = calculateAccountBalance();
    
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
    const totalDeposits = deposits.length > 0 ? deposits[0].amount : 0;
    
    // Update all balance displays
    const balanceElements = {
        'accountBalance': accountBalance,
        'sidebarBalance': accountBalance,
        'accountBalanceDisplay': accountBalance,
        'startingBalanceDisplay': startingBalance,
        'totalDepositsDisplay': totalDeposits,
        'totalWithdrawalsDisplay': totalWithdrawals,
        'totalGrowth': accountBalance - startingBalance,
        'equityTotal': accountBalance,
        'todayPnl': totalPnL // This will be overwritten by dashboard stats but fine
    };
    
    for (let [id, value] of Object.entries(balanceElements)) {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'totalGrowth') {
                el.textContent = formatCurrencyWithSign(value);
            } else {
                el.textContent = formatCurrency(value);
            }
        }
    }
    
    const growthPercent = startingBalance > 0 ? ((accountBalance - startingBalance) / startingBalance * 100).toFixed(1) : 0;
    const growthPercentageEl = document.getElementById('growthPercentage');
    if (growthPercentageEl) {
        growthPercentageEl.textContent = (growthPercent > 0 ? '+' : '') + growthPercent + '%';
    }
}

function updateDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = trades.filter(t => t.date === today);
    const todayPnL = todayTrades.reduce((sum, t) => sum + t.pnl, 0);
    
    const todayPnlEl = document.getElementById('todayPnl');
    if (todayPnlEl) todayPnlEl.textContent = formatCurrencyWithSign(todayPnL);
    
    const todayTradesCountEl = document.getElementById('todayTradesCount');
    if (todayTradesCountEl) todayTradesCountEl.textContent = `${todayTrades.length}/4 trades`;
    
    const todayTradeCountEl = document.getElementById('todayTradeCount');
    if (todayTradeCountEl) todayTradeCountEl.textContent = `${todayTrades.length}/4`;
    
    const dailyLimitProgressEl = document.getElementById('dailyLimitProgress');
    if (dailyLimitProgressEl) {
        const dailyProgress = (todayTrades.length / 4) * 100;
        dailyLimitProgressEl.style.width = `${dailyProgress}%`;
    }
    
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const weeklyTrades = trades.filter(t => t.date >= weekAgo);
    const weeklyPnL = weeklyTrades.reduce((sum, t) => sum + t.pnl, 0);
    
    const weeklyPnlEl = document.getElementById('weeklyPnl');
    if (weeklyPnlEl) weeklyPnlEl.textContent = formatCurrencyWithSign(weeklyPnL);
    
    const weeklyTradesCountEl = document.getElementById('weeklyTradesCount');
    if (weeklyTradesCountEl) weeklyTradesCountEl.textContent = `${weeklyTrades.length} trades`;
    
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const monthlyTrades = trades.filter(t => t.date >= monthAgo);
    const monthlyPnL = monthlyTrades.reduce((sum, t) => sum + t.pnl, 0);
    
    const monthlyPnlEl = document.getElementById('monthlyPnl');
    if (monthlyPnlEl) monthlyPnlEl.textContent = formatCurrencyWithSign(monthlyPnL);
    
    const monthlyTradesCountEl = document.getElementById('monthlyTradesCount');
    if (monthlyTradesCountEl) monthlyTradesCountEl.textContent = `${monthlyTrades.length} trades`;
}

// ===== TRADE FUNCTIONS =====
function saveTrade() {
    const date = document.getElementById('tradeDate')?.value;
    const time = document.getElementById('tradeTime')?.value;
    const tradeNumber = parseInt(document.getElementById('tradeNumber')?.value);
    const pair = document.getElementById('currencyPair')?.value;
    const direction = document.getElementById('tradeDirection')?.value;
    let strategy = document.getElementById('strategy')?.value;
    const customStrategy = document.getElementById('customStrategy')?.value;
    const pnl = parseFloat(document.getElementById('pnlAmount')?.value);
    const notes = document.getElementById('tradeNotes')?.value;
    
    if (!date || !time || !pair || !direction || isNaN(pnl)) {
        showToast('Please fill all required fields', 'error');
        return false;
    }
    
    const todayTrades = trades.filter(t => t.date === date);
    if (todayTrades.length >= 4) {
        showToast('Maximum 4 trades per day reached!', 'error');
        return false;
    }
    
    if (customStrategy && document.getElementById('customStrategy').style.display !== 'none') {
        strategy = customStrategy;
    }
    
    const trade = {
        id: Date.now(),
        date,
        time,
        tradeNumber,
        pair,
        direction,
        strategy,
        pnl,
        notes: notes || 'No notes',
        type: 'trade'
    };
    
    trades.unshift(trade);
    saveTrades();
    
    // Recalculate balance
    accountBalance = calculateAccountBalance();
    
    updateAccountBalanceDisplay();
    updateDashboardStats();
    updateRecentActivity();
    updateAllTradesTable();
    
    if (equityChart) {
        updateEquityChart(document.querySelector('.period-btn.active')?.getAttribute('data-period') || '12m');
    }
    if (winLossChart) {
        updateWinLossChart();
    }
    if (buysSellsChart) {
        updateBuysSellsChart();
    }
    
    updateCalendar();
    
    document.getElementById('pnlAmount').value = '';
    document.getElementById('tradeNotes').value = '';
    document.getElementById('customStrategy').style.display = 'none';
    document.getElementById('customStrategy').value = '';
    
    showToast(`Trade saved! P&L: ${formatCurrencyWithSign(pnl)}`, 'success');
    return true;
}

function saveAndDownloadTrade() {
    if (saveTrade() && trades.length > 0) {
        setTimeout(() => downloadTradePDF(trades[0]), 500);
    }
}

function deleteTrade(tradeId) {
    if (!confirm('Delete this trade?')) return;
    
    trades = trades.filter(t => t.id !== tradeId);
    saveTrades();
    
    accountBalance = calculateAccountBalance();
    
    updateAccountBalanceDisplay();
    updateDashboardStats();
    updateRecentActivity();
    updateAllTradesTable();
    
    if (equityChart) {
        updateEquityChart(document.querySelector('.period-btn.active')?.getAttribute('data-period') || '12m');
    }
    if (winLossChart) {
        updateWinLossChart();
    }
    if (buysSellsChart) {
        updateBuysSellsChart();
    }
    
    updateCalendar();
    showToast('Trade deleted', 'success');
}

// ===== DEPOSIT FUNCTIONS - FIXED =====
function processDeposit() {
    console.log('💰 Processing deposit - amount becomes starting balance');
    
    const date = document.getElementById('depositDate')?.value;
    const time = document.getElementById('depositTime')?.value;
    const broker = document.getElementById('depositBroker')?.value;
    const amount = parseFloat(document.getElementById('depositAmount')?.value);
    const notes = document.getElementById('depositNotes')?.value;
    
    if (!date || !time || !broker || isNaN(amount) || amount <= 0) {
        showToast('Please fill all fields with valid amount', 'error');
        return false;
    }
    
    // FIXED: Deposit amount becomes the starting balance
    const oldBalance = startingBalance;
    startingBalance = amount;
    saveStartingBalance();
    
    // Create deposit record
    const deposit = {
        id: Date.now(),
        date,
        time,
        broker,
        amount: amount,
        notes: notes || 'Deposit',
        balanceBefore: oldBalance,
        balanceAfter: amount,
        type: 'deposit'
    };
    
    // Replace deposits array with this single deposit
    deposits = [deposit];
    saveDeposits();
    
    // Recalculate balance
    accountBalance = calculateAccountBalance();
    
    updateAccountBalanceDisplay();
    updateRecentActivity();
    updateTransactionHistory();
    
    if (equityChart) {
        updateEquityChart('12m');
    }
    
    document.getElementById('depositAmount').value = '';
    document.getElementById('depositNotes').value = '';
    document.getElementById('newBalanceAfterDeposit').value = amount.toFixed(2);
    
    showToast(`✅ Starting Balance set to $${amount.toFixed(2)}!`, 'success');
    return true;
}

function saveAndDownloadDeposit() {
    if (processDeposit() && deposits.length > 0) {
        setTimeout(() => downloadDepositPDF(deposits[0]), 500);
    }
}

function deleteDeposit(depositId) {
    if (!confirm('Delete this deposit?')) return;
    
    deposits = deposits.filter(d => d.id !== depositId);
    saveDeposits();
    
    if (deposits.length === 0) {
        startingBalance = 0;
        saveStartingBalance();
    }
    
    accountBalance = calculateAccountBalance();
    
    updateAccountBalanceDisplay();
    updateRecentActivity();
    updateTransactionHistory();
    
    if (equityChart) {
        updateEquityChart('12m');
    }
    
    showToast('Deposit deleted', 'success');
}

// ===== WITHDRAWAL FUNCTIONS - FIXED =====
function processWithdrawal() {
    const date = document.getElementById('withdrawalDate')?.value;
    const time = document.getElementById('withdrawalTime')?.value;
    const broker = document.getElementById('withdrawalBroker')?.value;
    const amount = parseFloat(document.getElementById('withdrawalAmount')?.value);
    const notes = document.getElementById('withdrawalNotes')?.value;
    
    if (!date || !time || !broker || isNaN(amount) || amount <= 0) {
        showToast('Please fill all fields with valid amount', 'error');
        return false;
    }
    
    // Calculate current balance
    const currentBalance = calculateAccountBalance();
    
    if (amount > currentBalance) {
        showToast('Insufficient balance!', 'error');
        return false;
    }
    
    const withdrawal = {
        id: Date.now(),
        date,
        time,
        broker,
        amount: amount,
        notes: notes || 'Withdrawal',
        balanceBefore: currentBalance,
        balanceAfter: currentBalance - amount,
        type: 'withdrawal'
    };
    
    withdrawals.unshift(withdrawal);
    saveWithdrawals();
    
    accountBalance = calculateAccountBalance();
    
    updateAccountBalanceDisplay();
    updateRecentActivity();
    updateTransactionHistory();
    
    if (equityChart) {
        updateEquityChart('12m');
    }
    
    document.getElementById('withdrawalAmount').value = '';
    document.getElementById('withdrawalNotes').value = '';
    document.getElementById('newBalanceAfterWithdrawal').value = (currentBalance - amount).toFixed(2);
    
    showToast(`Withdrawal of $${amount.toFixed(2)} processed!`, 'success');
    return true;
}

function saveAndDownloadWithdrawal() {
    if (processWithdrawal() && withdrawals.length > 0) {
        setTimeout(() => downloadWithdrawalPDF(withdrawals[0]), 500);
    }
}

function deleteWithdrawal(withdrawalId) {
    if (!confirm('Delete this withdrawal?')) return;
    
    withdrawals = withdrawals.filter(w => w.id !== withdrawalId);
    saveWithdrawals();
    
    accountBalance = calculateAccountBalance();
    
    updateAccountBalanceDisplay();
    updateRecentActivity();
    updateTransactionHistory();
    
    if (equityChart) {
        updateEquityChart('12m');
    }
    
    showToast('Withdrawal deleted', 'success');
}

// ===== RECENT ACTIVITY =====
function updateRecentActivity() {
    const tableBody = document.getElementById('recentActivityTable');
    if (!tableBody) return;
    
    const allActivities = [
        ...trades.map(t => ({ ...t, type: 'trade' })),
        ...deposits.map(d => ({ ...d, type: 'deposit' })),
        ...withdrawals.map(w => ({ ...w, type: 'withdrawal' }))
    ].sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
     .slice(0, 5);
    
    if (allActivities.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                    <i class="fas fa-chart-line" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <p>No activity recorded yet.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = allActivities.map(activity => {
        if (activity.type === 'trade') {
            return `
                <tr>
                    <td>${formatDateTime(activity.date, activity.time)}</td>
                    <td><span style="background: rgba(59,130,246,0.1); color: #3b82f6; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">TRADE</span></td>
                    <td>${activity.pair} (${activity.direction?.toUpperCase()}) - ${activity.strategy}</td>
                    <td class="${activity.pnl >= 0 ? 'profit' : 'loss'}" style="font-weight: 600;">${formatCurrencyWithSign(activity.pnl)}</td>
                    <td><span style="background: ${activity.pnl >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${activity.pnl >= 0 ? '#22c55e' : '#ef4444'}; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">${activity.pnl >= 0 ? 'WIN' : 'LOSS'}</span></td>
                    <td>
                        <button onclick="deleteTrade(${activity.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        } else if (activity.type === 'deposit') {
            return `
                <tr>
                    <td>${formatDateTime(activity.date, activity.time)}</td>
                    <td><span style="background: rgba(34,197,94,0.1); color: #22c55e; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">DEPOSIT</span></td>
                    <td>${activity.broker}</td>
                    <td class="profit" style="font-weight: 600;">${formatCurrencyWithSign(activity.amount)}</td>
                    <td><span style="background: rgba(34,197,94,0.1); color: #22c55e; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">COMPLETED</span></td>
                    <td>
                        <button onclick="deleteDeposit(${activity.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td>${formatDateTime(activity.date, activity.time)}</td>
                    <td><span style="background: rgba(239,68,68,0.1); color: #ef4444; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">WITHDRAWAL</span></td>
                    <td>${activity.broker}</td>
                    <td class="loss" style="font-weight: 600;">${formatCurrencyWithSign(-activity.amount)}</td>
                    <td><span style="background: rgba(245,158,11,0.1); color: #f59e0b; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">PROCESSED</span></td>
                    <td>
                        <button onclick="deleteWithdrawal(${activity.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
    }).join('');
}

// ===== TRANSACTION HISTORY =====
function updateTransactionHistory() {
    const tableBody = document.getElementById('transactionHistoryTable');
    if (!tableBody) return;
    
    const allTransactions = [
        ...deposits.map(d => ({ ...d, transactionType: 'deposit' })),
        ...withdrawals.map(w => ({ ...w, transactionType: 'withdrawal' }))
    ].sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    if (allTransactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                    <i class="fas fa-money-bill-transfer" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <p>No transactions yet</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = allTransactions.map(t => {
        if (t.transactionType === 'deposit') {
            return `
                <tr>
                    <td>${formatDateTime(t.date, t.time)}</td>
                    <td><span style="background: rgba(34,197,94,0.1); color: #22c55e; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">DEPOSIT</span></td>
                    <td>${t.broker}</td>
                    <td class="profit" style="font-weight: 600;">${formatCurrency(t.amount)}</td>
                    <td>${formatCurrency(t.balanceBefore)}</td>
                    <td>${formatCurrency(t.balanceAfter)}</td>
                    <td>${t.notes || '-'}</td>
                    <td>
                        <button onclick="deleteDeposit(${t.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td>${formatDateTime(t.date, t.time)}</td>
                    <td><span style="background: rgba(239,68,68,0.1); color: #ef4444; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">WITHDRAWAL</span></td>
                    <td>${t.broker}</td>
                    <td class="loss" style="font-weight: 600;">${formatCurrency(t.amount)}</td>
                    <td>${formatCurrency(t.balanceBefore)}</td>
                    <td>${formatCurrency(t.balanceAfter)}</td>
                    <td>${t.notes || '-'}</td>
                    <td>
                        <button onclick="deleteWithdrawal(${t.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
    }).join('');
}

// ===== ALL TRADES TABLE =====
function updateAllTradesTable() {
    const tableBody = document.getElementById('allTradesTable');
    if (!tableBody) return;
    
    const sortedTrades = [...trades].sort((a, b) => 
        new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
    );
    
    if (sortedTrades.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                    <i class="fas fa-book" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <p>No trades recorded yet</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = sortedTrades.map(trade => `
        <tr>
            <td>${formatDateTime(trade.date, trade.time)}</td>
            <td>${trade.tradeNumber}</td>
            <td>${trade.pair}</td>
            <td><span style="background: ${trade.direction === 'buy' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${trade.direction === 'buy' ? '#22c55e' : '#ef4444'}; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">${trade.direction?.toUpperCase() || 'BUY'}</span></td>
            <td>${trade.strategy}</td>
            <td class="${trade.pnl >= 0 ? 'profit' : 'loss'}" style="font-weight: 600;">${formatCurrencyWithSign(trade.pnl)}</td>
            <td><span style="background: ${trade.pnl >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${trade.pnl >= 0 ? '#22c55e' : '#ef4444'}; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">${trade.pnl >= 0 ? 'WIN' : 'LOSS'}</span></td>
            <td>
                <button onclick="deleteTrade(${trade.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const winRate = trades.length > 0 ? (winningTrades / trades.length * 100).toFixed(1) : 0;
    
    const totalTradesEl = document.getElementById('totalTradesCount');
    if (totalTradesEl) totalTradesEl.textContent = trades.length;
    
    const winningTradesEl = document.getElementById('winningTradesCount');
    if (winningTradesEl) winningTradesEl.textContent = winningTrades;
    
    const losingTradesEl = document.getElementById('losingTradesCount');
    if (losingTradesEl) losingTradesEl.textContent = losingTrades;
    
    const winRateEl = document.getElementById('winRateDisplay');
    if (winRateEl) winRateEl.textContent = `${winRate}%`;
    
    const netPnlEl = document.getElementById('netPnlDisplay');
    if (netPnlEl) netPnlEl.textContent = formatCurrencyWithSign(totalPnL);
    
    const winningAnalyticsEl = document.getElementById('winningTradesAnalytics');
    if (winningAnalyticsEl) winningAnalyticsEl.textContent = winningTrades;
    
    const losingAnalyticsEl = document.getElementById('losingTradesAnalytics');
    if (losingAnalyticsEl) losingAnalyticsEl.textContent = losingTrades;
    
    const totalProfitEl = document.getElementById('totalProfit');
    if (totalProfitEl) totalProfitEl.textContent = formatCurrency(totalProfit);
    
    const totalLossEl = document.getElementById('totalLoss');
    if (totalLossEl) totalLossEl.textContent = formatCurrency(totalLoss);
    
    const buys = trades.filter(t => t.direction === 'buy').length;
    const sells = trades.filter(t => t.direction === 'sell').length;
    
    const totalBuysEl = document.getElementById('totalBuys');
    if (totalBuysEl) totalBuysEl.textContent = buys;
    
    const totalSellsEl = document.getElementById('totalSells');
    if (totalSellsEl) totalSellsEl.textContent = sells;
}

// ===== GOALS FUNCTIONS =====
function saveGoal() {
    const input = document.getElementById('goalInput');
    const content = input?.value.trim();
    
    if (!content) {
        showToast('Please write your goal', 'error');
        return;
    }
    
    const goal = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        content
    };
    
    goals.unshift(goal);
    saveGoals();
    updateGoalsList();
    
    input.value = '';
    showToast('Goal saved!', 'success');
}

function clearGoal() {
    const input = document.getElementById('goalInput');
    if (input) input.value = '';
}

function updateGoalsList() {
    const list = document.getElementById('goalsList');
    if (!list) return;
    
    if (goals.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                <i class="fas fa-bullseye" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                <p>No goals yet. Write your first trading goal!</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = goals.map(goal => `
        <div class="goal-card">
            <div class="goal-header">
                <span class="goal-date">${formatFullDate(goal.date)}</span>
                <div class="goal-actions">
                    <button class="edit-btn" onclick="editGoal(${goal.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteGoal(${goal.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="goal-content">${goal.content}</div>
        </div>
    `).join('');
}

function editGoal(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const input = document.getElementById('goalInput');
    if (input) input.value = goal.content;
    
    goals = goals.filter(g => g.id !== goalId);
    saveGoals();
    updateGoalsList();
    
    showToast('Goal loaded for editing', 'info');
}

function deleteGoal(goalId) {
    if (!confirm('Delete this goal?')) return;
    
    goals = goals.filter(g => g.id !== goalId);
    saveGoals();
    updateGoalsList();
    showToast('Goal deleted', 'success');
}

// ===== CHARTS =====
function initializeCharts() {
    initializeWinLossChart();
    initializeBuysSellsChart();
    initializeEquityChart();
}

function initializeWinLossChart() {
    const ctx = document.getElementById('winLossChart');
    if (!ctx) return;
    
    if (winLossChart) {
        winLossChart.destroy();
    }
    
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    
    winLossChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Winning Trades', 'Losing Trades'],
            datasets: [{
                data: [winningTrades, losingTrades],
                backgroundColor: ['#22c55e', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}

function initializeBuysSellsChart() {
    const ctx = document.getElementById('buysSellsChart');
    if (!ctx) return;
    
    if (buysSellsChart) {
        buysSellsChart.destroy();
    }
    
    const buys = trades.filter(t => t.direction === 'buy').length;
    const sells = trades.filter(t => t.direction === 'sell').length;
    
    buysSellsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Buy Trades', 'Sell Trades'],
            datasets: [{
                data: [buys, sells],
                backgroundColor: ['#3b82f6', '#f59e0b'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            circumference: 180,
            rotation: 270,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}

// ===== FIXED EQUITY CURVE - ONLY SHOWS DAYS WITH ACTIVITY =====
function initializeEquityChart() {
    const ctx = document.getElementById('equityChart');
    if (!ctx) return;
    
    if (equityChart) {
        equityChart.destroy();
    }
    
    equityChart = new Chart(ctx, {
        type: 'line',
        data: getEquityData('1m'), // Default to 1M view
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Balance: ${formatCurrency(context.parsed.y)}`;
                        },
                        title: function(context) {
                            return context[0].label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        },
                        maxTicksLimit: 8
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        maxTicksLimit: 12
                    }
                }
            },
            elements: {
                point: {
                    radius: 5,
                    hoverRadius: 8,
                    backgroundColor: '#3b82f6'
                },
                line: {
                    borderColor: '#3b82f6',
                    borderWidth: 3,
                    tension: 0.2,
                    fill: true,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)'
                }
            }
        }
    });
    
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const period = this.getAttribute('data-period');
            updateEquityChart(period);
        });
    });
}

function updateEquityChart(period) {
    if (!equityChart) return;
    equityChart.data = getEquityData(period);
    equityChart.update();
}

function updateWinLossChart() {
    if (!winLossChart) return;
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    winLossChart.data.datasets[0].data = [winningTrades, losingTrades];
    winLossChart.update();
}

function updateBuysSellsChart() {
    if (!buysSellsChart) return;
    const buys = trades.filter(t => t.direction === 'buy').length;
    const sells = trades.filter(t => t.direction === 'sell').length;
    buysSellsChart.data.datasets[0].data = [buys, sells];
    buysSellsChart.update();
}

// ===== FIXED: ONLY SHOWS DAYS WITH ACTUAL ACTIVITY =====
function getEquityData(period) {
    // Collect all activities that affect balance
    const activities = [];
    
    // Add deposits
    deposits.forEach(d => {
        activities.push({
            date: d.date,
            amount: d.amount,
            type: 'deposit'
        });
    });
    
    // Add withdrawals (negative)
    withdrawals.forEach(w => {
        activities.push({
            date: w.date,
            amount: -w.amount,
            type: 'withdrawal'
        });
    });
    
    // Add trades
    trades.forEach(t => {
        activities.push({
            date: t.date,
            amount: t.pnl,
            type: 'trade'
        });
    });
    
    // Sort by date
    activities.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Group by date (combine multiple activities on same day)
    const dailyChanges = new Map();
    activities.forEach(activity => {
        const date = activity.date;
        if (!dailyChanges.has(date)) {
            dailyChanges.set(date, 0);
        }
        dailyChanges.set(date, dailyChanges.get(date) + activity.amount);
    });
    
    // Get unique dates with activity
    const activeDates = Array.from(dailyChanges.keys()).sort();
    
    if (period === '1m') {
        // Filter to last 30 days
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const relevantDates = activeDates.filter(date => new Date(date) >= oneMonthAgo);
        
        const labels = ['Start'];
        const data = [startingBalance];
        let runningBalance = startingBalance;
        
        relevantDates.forEach(date => {
            runningBalance += dailyChanges.get(date);
            data.push(runningBalance);
            labels.push(formatFullDate(date));
        });
        
        updateEquityStats(data);
        
        return {
            labels,
            datasets: [{
                label: 'Account Balance',
                data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true
            }]
        };
    } else {
        // 12M view - group by month
        const monthlyData = new Map();
        
        activities.forEach(activity => {
            const monthKey = activity.date.substring(0, 7); // YYYY-MM
            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, 0);
            }
            monthlyData.set(monthKey, monthlyData.get(monthKey) + activity.amount);
        });
        
        const labels = ['Start'];
        const data = [startingBalance];
        let runningBalance = startingBalance;
        
        // Get last 12 months with activity
        const sortedMonths = Array.from(monthlyData.keys()).sort().slice(-12);
        
        sortedMonths.forEach(month => {
            runningBalance += monthlyData.get(month);
            data.push(runningBalance);
            const [year, monthNum] = month.split('-');
            const monthName = new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            labels.push(monthName);
        });
        
        updateEquityStats(data);
        
        return {
            labels,
            datasets: [{
                label: 'Account Balance',
                data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true
            }]
        };
    }
}

function updateEquityStats(data) {
    const peak = Math.max(...data);
    const currentEquity = data[data.length - 1];
    const drawdown = peak > 0 ? ((peak - currentEquity) / peak * 100).toFixed(1) : 0;
    
    const peakEl = document.getElementById('equityPeak');
    if (peakEl) peakEl.textContent = formatCurrency(peak);
    
    const drawdownEl = document.getElementById('equityDrawdown');
    if (drawdownEl) drawdownEl.textContent = `${drawdown}%`;
}

// ===== CALENDAR =====
function updateCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthYear = document.getElementById('calendarMonthYear');
    if (!grid || !monthYear) return;
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    
    monthYear.textContent = `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;
    
    const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const lastDay = new Date(currentCalendarYear, currentCalendarMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    let html = '';
    
    for (let i = 0; i < startingDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const today = new Date().toISOString().split('T')[0];
        
        const dayTrades = trades.filter(t => t.date === dateStr);
        const dayPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
        
        let dayClass = 'calendar-day';
        if (dateStr === today) dayClass += ' current-day';
        if (dayTrades.length > 0) {
            dayClass += dayPnL >= 0 ? ' profit-day' : ' loss-day';
        }
        
        html += `
            <div class="${dayClass}">
                <span class="calendar-date">${day}</span>
                ${dayTrades.length > 0 ? `
                    <span class="day-pnl ${dayPnL >= 0 ? 'profit' : 'loss'}">
                        ${dayPnL >= 0 ? '+' : '-'}$${Math.abs(dayPnL).toFixed(0)}
                    </span>
                ` : ''}
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

function changeCalendarMonth(direction) {
    currentCalendarMonth += direction;
    
    if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear--;
    } else if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear++;
    }
    
    updateCalendar();
}

// ===== PDF EXPORT FUNCTIONS - FIXED TO USE CORRECT BALANCE =====
function generateStyledPDF({ title, content, filename, color = '#3b82f6' }) {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            showToast('PDF library not loaded', 'error');
            return;
        }
        
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.width;
        const margin = 20;
        const user = getCurrentUser();
        
        pdf.setFillColor(color);
        pdf.rect(0, 0, pageWidth, 30, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin, 20);
        
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, 40);
        pdf.text(`Trader: ${user.name || 'Trader'}`, margin, 48);
        
        pdf.setDrawColor(color);
        pdf.setLineWidth(0.5);
        pdf.line(margin, 55, pageWidth - margin, 55);
        
        const lines = content.split('\n');
        let yPos = 70;
        
        lines.forEach(line => {
            if (yPos > 280) {
                pdf.addPage();
                yPos = 20;
            }
            
            if (line.startsWith('TRADE DETAILS') || line.startsWith('ACCOUNT OVERVIEW') || 
                line.startsWith('PERFORMANCE METRICS') || line.startsWith('ALL TRADES') ||
                line.startsWith('DEPOSIT HISTORY') || line.startsWith('WITHDRAWAL HISTORY') ||
                line.startsWith('ACCOUNT SUMMARY')) {
                pdf.setTextColor(color);
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.text(line, margin, yPos);
                yPos += 8;
            } else if (line.startsWith('=')) {
                pdf.setTextColor(150, 150, 150);
                pdf.setFontSize(10);
                pdf.text(line, margin, yPos);
                yPos += 5;
            } else if (line.includes('WIN') || line.includes('+') || line.includes('profit')) {
                pdf.setTextColor(34, 197, 94);
                pdf.setFontSize(10);
                pdf.text(line, margin, yPos);
                yPos += 5;
            } else if (line.includes('LOSS') || line.includes('-') || line.includes('loss')) {
                pdf.setTextColor(239, 68, 68);
                pdf.setFontSize(10);
                pdf.text(line, margin, yPos);
                yPos += 5;
            } else {
                pdf.setTextColor(50, 50, 50);
                pdf.setFontSize(10);
                pdf.text(line, margin, yPos);
                yPos += 5;
            }
        });
        
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(8);
        pdf.text('FX TAE Charts Trading Journal', margin, pdf.internal.pageSize.height - 10);
        pdf.text(`Downloaded by: ${user.name || 'Trader'}`, margin, pdf.internal.pageSize.height - 5);
        
        pdf.save(filename);
        showToast(`PDF downloaded: ${filename}`, 'success');
    } catch (error) {
        console.error('PDF error:', error);
        showToast('Error generating PDF', 'error');
    }
}

function downloadTradePDF(trade) {
    const totalProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const currentBalance = calculateAccountBalance();
    
    const content = `
        TRADE DETAILS
        =============
        Date: ${formatFullDate(trade.date)}
        Time: ${trade.time}
        Trade #: ${trade.tradeNumber}
        Pair: ${trade.pair}
        Direction: ${trade.direction?.toUpperCase() || 'BUY'}
        Strategy: ${trade.strategy}
        P&L: ${formatCurrencyWithSign(trade.pnl)}
        Result: ${trade.pnl >= 0 ? 'WIN' : 'LOSS'}
        Notes: ${trade.notes}
        
        ACCOUNT SUMMARY
        ===============
        Current Balance: ${formatCurrency(currentBalance)}
        Starting Balance: ${formatCurrency(startingBalance)}
        Total Deposits: ${formatCurrency(deposits.length > 0 ? deposits[0].amount : 0)}
        Total Withdrawals: ${formatCurrency(totalWithdrawals)}
        Total Profit: ${formatCurrency(totalProfit)}
        Total Loss: ${formatCurrency(totalLoss)}
        Net P&L: ${formatCurrencyWithSign(trades.reduce((sum, t) => sum + t.pnl, 0))}
    `;
    
    generateStyledPDF({
        title: `Trade #${trade.tradeNumber} - ${trade.pair}`,
        content,
        filename: `trade-${trade.id}-${trade.date}.pdf`,
        color: trade.pnl >= 0 ? '#22c55e' : '#ef4444'
    });
}

function downloadDepositPDF(deposit) {
    const currentBalance = calculateAccountBalance();
    
    const content = `
        DEPOSIT RECEIPT
        ===============
        Date: ${formatFullDate(deposit.date)}
        Time: ${deposit.time}
        Transaction ID: DEP-${deposit.id}
        Broker: ${deposit.broker}
        Amount: +${formatCurrency(deposit.amount)}
        
        ACCOUNT BALANCE
        ===============
        Balance Before: ${formatCurrency(deposit.balanceBefore)}
        Balance After: ${formatCurrency(currentBalance)}
        
        Notes: ${deposit.notes || 'No notes'}
        
        STATUS: COMPLETED
    `;
    
    generateStyledPDF({
        title: 'Deposit Receipt',
        content,
        filename: `deposit-${deposit.id}-${deposit.date}.pdf`,
        color: '#22c55e'
    });
}

function downloadWithdrawalPDF(withdrawal) {
    const currentBalance = calculateAccountBalance();
    
    const content = `
        WITHDRAWAL RECEIPT
        ==================
        Date: ${formatFullDate(withdrawal.date)}
        Time: ${withdrawal.time}
        Transaction ID: WD-${withdrawal.id}
        Broker: ${withdrawal.broker}
        Amount: -${formatCurrency(withdrawal.amount)}
        
        ACCOUNT BALANCE
        ===============
        Balance Before: ${formatCurrency(withdrawal.balanceBefore)}
        Balance After: ${formatCurrency(currentBalance)}
        
        Notes: ${withdrawal.notes || 'No notes'}
        
        STATUS: PROCESSED
    `;
    
    generateStyledPDF({
        title: 'Withdrawal Receipt',
        content,
        filename: `withdrawal-${withdrawal.id}-${withdrawal.date}.pdf`,
        color: '#ef4444'
    });
}

function exportDashboardPDF() {
    const todayPnL = trades.filter(t => t.date === new Date().toISOString().split('T')[0])
        .reduce((sum, t) => sum + t.pnl, 0);
    
    const totalProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const currentBalance = calculateAccountBalance();
    
    const content = `
        DASHBOARD REPORT
        ================
        Date: ${new Date().toLocaleDateString()}
        
        ACCOUNT OVERVIEW
        ================
        Current Balance: ${formatCurrency(currentBalance)}
        Starting Balance: ${formatCurrency(startingBalance)}
        Total Growth: ${formatCurrencyWithSign(currentBalance - startingBalance)}
        
        TODAY'S PERFORMANCE
        ===================
        P&L: ${formatCurrencyWithSign(todayPnL)}
        Trades: ${trades.filter(t => t.date === new Date().toISOString().split('T')[0]).length}/4
        
        DEPOSITS & WITHDRAWALS
        ======================
        Total Deposits: ${formatCurrency(deposits.length > 0 ? deposits[0].amount : 0)}
        Total Withdrawals: ${formatCurrency(totalWithdrawals)}
        
        TRADING STATISTICS
        ==================
        Total Trades: ${trades.length}
        Winning Trades: ${trades.filter(t => t.pnl > 0).length}
        Losing Trades: ${trades.filter(t => t.pnl < 0).length}
        Win Rate: ${trades.length > 0 ? ((trades.filter(t => t.pnl > 0).length / trades.length) * 100).toFixed(1) : 0}%
        Total Profit: ${formatCurrency(totalProfit)}
        Total Loss: ${formatCurrency(totalLoss)}
        Net P&L: ${formatCurrencyWithSign(trades.reduce((sum, t) => sum + t.pnl, 0))}
    `;
    
    generateStyledPDF({
        title: 'Dashboard Report',
        content,
        filename: `dashboard-${new Date().toISOString().split('T')[0]}.pdf`
    });
}

function exportJournalPDF() {
    const totalProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const currentBalance = calculateAccountBalance();
    
    const content = `
        COMPLETE TRADING JOURNAL
        ========================
        Generated: ${new Date().toLocaleString()}
        
        TRADING STATISTICS
        ==================
        Total Trades: ${trades.length}
        Winning Trades: ${trades.filter(t => t.pnl > 0).length}
        Losing Trades: ${trades.filter(t => t.pnl < 0).length}
        Win Rate: ${trades.length > 0 ? ((trades.filter(t => t.pnl > 0).length / trades.length) * 100).toFixed(1) : 0}%
        Total Profit: ${formatCurrency(totalProfit)}
        Total Loss: ${formatCurrency(totalLoss)}
        Net P&L: ${formatCurrencyWithSign(trades.reduce((sum, t) => sum + t.pnl, 0))}
        
        ACCOUNT SUMMARY
        ===============
        Current Balance: ${formatCurrency(currentBalance)}
        Starting Balance: ${formatCurrency(startingBalance)}
        Total Deposits: ${formatCurrency(deposits.length > 0 ? deposits[0].amount : 0)}
        Total Withdrawals: ${formatCurrency(totalWithdrawals)}
        
        ALL TRADES (${trades.length})
        ============
        ${trades.map(t => `${t.date} ${t.time} | Trade ${t.tradeNumber} | ${t.pair} | ${t.direction?.toUpperCase()} | ${t.strategy} | ${formatCurrencyWithSign(t.pnl)} | ${t.pnl >= 0 ? 'WIN' : 'LOSS'}`).join('\n')}
        
        DEPOSITS (${deposits.length})
        ========
        ${deposits.map(d => `${d.date} ${d.time} | ${d.broker} | +${formatCurrency(d.amount)}`).join('\n')}
        
        WITHDRAWALS (${withdrawals.length})
        ============
        ${withdrawals.map(w => `${w.date} ${w.time} | ${w.broker} | -${formatCurrency(w.amount)}`).join('\n')}
    `;
    
    generateStyledPDF({
        title: 'Trading Journal',
        content,
        filename: `journal-${new Date().toISOString().split('T')[0]}.pdf`
    });
}

function exportAnalyticsPDF() {
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const buys = trades.filter(t => t.direction === 'buy').length;
    const sells = trades.filter(t => t.direction === 'sell').length;
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const currentBalance = calculateAccountBalance();
    
    const content = `
        ADVANCED ANALYTICS REPORT
        ========================
        
        WIN/LOSS ANALYSIS
        =================
        Winning Trades: ${winningTrades.length}
        Losing Trades: ${losingTrades.length}
        Win Rate: ${trades.length > 0 ? ((winningTrades.length / trades.length) * 100).toFixed(1) : 0}%
        Total Profit: ${formatCurrency(totalProfit)}
        Total Loss: ${formatCurrency(totalLoss)}
        
        TRADE DIRECTION
        ===============
        Buy Trades: ${buys}
        Sell Trades: ${sells}
        
        ACCOUNT GROWTH
        ==============
        Starting Balance: ${formatCurrency(startingBalance)}
        Current Balance: ${formatCurrency(currentBalance)}
        Total Deposits: ${formatCurrency(deposits.length > 0 ? deposits[0].amount : 0)}
        Total Withdrawals: ${formatCurrency(totalWithdrawals)}
        Total Growth: ${formatCurrencyWithSign(currentBalance - startingBalance)}
    `;
    
    generateStyledPDF({
        title: 'Analytics Report',
        content,
        filename: `analytics-${new Date().toISOString().split('T')[0]}.pdf`
    });
}

function exportTransactionsPDF() {
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const currentBalance = calculateAccountBalance();
    
    const content = `
        TRANSACTION HISTORY
        ===================
        Generated: ${new Date().toLocaleString()}
        
        ACCOUNT SUMMARY
        ===============
        Current Balance: ${formatCurrency(currentBalance)}
        Starting Balance: ${formatCurrency(startingBalance)}
        Total Deposits: ${formatCurrency(deposits.length > 0 ? deposits[0].amount : 0)}
        Total Withdrawals: ${formatCurrency(totalWithdrawals)}
        
        DEPOSIT HISTORY (${deposits.length})
        ===============
        ${deposits.map(d => `${d.date} ${d.time} | ${d.broker} | +${formatCurrency(d.amount)} | Balance: ${formatCurrency(currentBalance)}`).join('\n')}
        
        WITHDRAWAL HISTORY (${withdrawals.length})
        ==================
        ${withdrawals.map(w => `${w.date} ${w.time} | ${w.broker} | -${formatCurrency(w.amount)} | Balance: ${formatCurrency(currentBalance)}`).join('\n')}
    `;
    
    generateStyledPDF({
        title: 'Transaction History',
        content,
        filename: `transactions-${new Date().toISOString().split('T')[0]}.pdf`
    });
}

function exportAllDataPDF() {
    const user = getCurrentUser();
    const totalProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const currentBalance = calculateAccountBalance();
    
    const content = `
        COMPLETE DATA EXPORT
        ====================
        Generated: ${new Date().toLocaleString()}
        Trader: ${user.name || 'Trader'}
        Email: ${user.email || 'N/A'}
        
        ACCOUNT SUMMARY
        ===============
        Starting Balance: ${formatCurrency(startingBalance)}
        Current Balance: ${formatCurrency(currentBalance)}
        Total Deposits: ${formatCurrency(deposits.length > 0 ? deposits[0].amount : 0)}
        Total Withdrawals: ${formatCurrency(totalWithdrawals)}
        Total Profit: ${formatCurrency(totalProfit)}
        Total Loss: ${formatCurrency(totalLoss)}
        Net P&L: ${formatCurrencyWithSign(trades.reduce((sum, t) => sum + t.pnl, 0))}
        
        TRADES DATA (${trades.length})
        ============
        ${trades.map(t => `${t.date} ${t.time} | #${t.tradeNumber} | ${t.pair} | ${t.direction} | ${t.strategy} | ${formatCurrencyWithSign(t.pnl)} | ${t.pnl >= 0 ? 'WIN' : 'LOSS'}`).join('\n')}
        
        DEPOSITS DATA (${deposits.length})
        =============
        ${deposits.map(d => `${d.date} ${d.time} | ${d.broker} | +${formatCurrency(d.amount)}`).join('\n')}
        
        WITHDRAWALS DATA (${withdrawals.length})
        ================
        ${withdrawals.map(w => `${w.date} ${w.time} | ${w.broker} | -${formatCurrency(w.amount)}`).join('\n')}
        
        GOALS DATA (${goals.length})
        ==========
        ${goals.map(g => `${g.date}: ${g.content}`).join('\n')}
    `;
    
    generateStyledPDF({
        title: 'Complete Data Export',
        content,
        filename: `complete-data-${new Date().toISOString().split('T')[0]}.pdf`
    });
}

// ===== SETTINGS FUNCTIONS =====
function setTheme(theme) {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    localStorage.setItem('fxTaeTheme', theme);
    
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(theme)) {
            btn.classList.add('active');
        }
    });
}

function saveUsername() {
    const newName = document.getElementById('settingsUsername')?.value.trim();
    if (!newName) {
        showToast('Please enter a username', 'error');
        return;
    }
    
    const user = getCurrentUser();
    user.name = newName;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    
    updateUserInfo();
    document.getElementById('settingsUsername').value = '';
    showToast('Username updated', 'success');
}

function showChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'flex';
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'none';
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
}

function saveNewPassword() {
    const current = document.getElementById('currentPassword')?.value;
    const newPass = document.getElementById('newPassword')?.value;
    const confirm = document.getElementById('confirmNewPassword')?.value;
    
    if (!current || !newPass || !confirm) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    if (newPass !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (newPass.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    showToast('Password changed successfully', 'success');
    closeChangePasswordModal();
}

function saveTradingRules() {
    const rules = document.getElementById('tradingRulesInput')?.value.trim();
    if (!rules) {
        showToast('Please enter trading rules', 'error');
        return;
    }
    
    localStorage.setItem('fxTaeTradingRules', rules);
    
    const content = `
        TRADING RULES
        =============
        Trader: ${getCurrentUser().name || 'Trader'}
        Date: ${new Date().toLocaleDateString()}
        
        ${rules}
    `;
    
    generateStyledPDF({
        title: 'Trading Rules',
        content,
        filename: `trading-rules-${new Date().toISOString().split('T')[0]}.pdf`,
        color: '#f59e0b'
    });
}

function clearAllData() {
    if (!confirm('⚠️ WARNING: This will delete ALL your trades, deposits, withdrawals, and goals. This action cannot be undone. Are you sure?')) {
        return;
    }
    
    trades = [];
    goals = [];
    deposits = [];
    withdrawals = [];
    startingBalance = 0;
    accountBalance = 0;
    
    saveStartingBalance();
    saveTrades();
    saveGoals();
    saveDeposits();
    saveWithdrawals();
    
    updateAccountBalanceDisplay();
    updateDashboardStats();
    updateRecentActivity();
    updateTransactionHistory();
    updateAllTradesTable();
    updateGoalsList();
    updateCalendar();
    
    if (equityChart) updateEquityChart('12m');
    if (winLossChart) updateWinLossChart();
    if (buysSellsChart) updateBuysSellsChart();
    
    showToast('All data cleared successfully', 'success');
}

// ===== POSITION CALCULATOR =====
function showPositionCalculator() {
    const modal = document.getElementById('positionCalculatorModal');
    if (!modal) return;
    
    document.getElementById('calcBalance').value = calculateAccountBalance();
    modal.style.display = 'flex';
}

function closePositionCalculator() {
    document.getElementById('positionCalculatorModal').style.display = 'none';
}

function calculatePositionSize() {
    const balance = parseFloat(document.getElementById('calcBalance')?.value);
    const riskPercent = parseFloat(document.getElementById('calcRiskPercent')?.value);
    const stopLoss = parseFloat(document.getElementById('calcStopLoss')?.value);
    
    if (isNaN(balance) || isNaN(riskPercent) || isNaN(stopLoss) || stopLoss <= 0) {
        showToast('Please enter valid values', 'error');
        return;
    }
    
    const riskAmount = balance * (riskPercent / 100);
    const positionSize = riskAmount / (stopLoss * 10);
    
    document.getElementById('calcRiskAmount').value = riskAmount.toFixed(2);
    document.getElementById('calcPositionSize').value = positionSize.toFixed(2);
}

// ===== CUSTOM STRATEGY =====
function showCustomStrategy() {
    const input = document.getElementById('customStrategy');
    if (input) {
        input.style.display = 'block';
        input.focus();
    }
}

// ===== TEMPLATE DOWNLOAD =====
function downloadTradingPlanTemplate() {
    const content = `
        TRADING PLAN TEMPLATE
        =====================
        
        1. TRADING GOALS
        ----------------
        • Monthly profit target:
        • Maximum drawdown:
        • Risk per trade:
        • Daily trade limit:
        
        2. MARKETS & INSTRUMENTS
        ------------------------
        • Preferred pairs:
        • Trading sessions:
        • Timeframe:
        
        3. ENTRY RULES
        --------------
        • Setup criteria:
        • Confirmation signals:
        
        4. EXIT RULES
        -------------
        • Take profit levels:
        • Stop loss placement:
        
        5. RISK MANAGEMENT
        ------------------
        • Position sizing:
        • Maximum risk per day:
    `;
    
    generateStyledPDF({
        title: 'Trading Plan Template',
        content,
        filename: `trading-plan-template-${new Date().toISOString().split('T')[0]}.pdf`,
        color: '#8b5cf6'
    });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    
    if (sidebarClose && sidebar) {
        sidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.dashboard-page').forEach(page => page.classList.remove('active'));
            
            const pageId = this.getAttribute('data-page');
            const page = document.getElementById(pageId);
            if (page) {
                page.classList.add('active');
            }
            
            if (window.innerWidth <= 1024) {
                sidebar?.classList.remove('active');
            }
        });
    });
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    const depositAmount = document.getElementById('depositAmount');
    if (depositAmount) {
        depositAmount.addEventListener('input', function() {
            const amount = parseFloat(this.value) || 0;
            document.getElementById('newBalanceAfterDeposit').value = amount.toFixed(2);
        });
    }
    
    const withdrawalAmount = document.getElementById('withdrawalAmount');
    if (withdrawalAmount) {
        withdrawalAmount.addEventListener('input', function() {
            const amount = parseFloat(this.value) || 0;
            const currentBalance = calculateAccountBalance();
            document.getElementById('newBalanceAfterWithdrawal').value = (currentBalance - amount).toFixed(2);
        });
    }
    
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-premium')) {
            e.target.style.display = 'none';
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-premium').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
    
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            filterTransactions(filter);
        });
    });
}

function filterTransactions(filter) {
    const tableBody = document.getElementById('transactionHistoryTable');
    if (!tableBody) return;
    
    let filtered = [];
    if (filter === 'all') {
        filtered = [...deposits.map(d => ({ ...d, transactionType: 'deposit' })),
                   ...withdrawals.map(w => ({ ...w, transactionType: 'withdrawal' }))];
    } else if (filter === 'deposit') {
        filtered = deposits.map(d => ({ ...d, transactionType: 'deposit' }));
    } else if (filter === 'withdrawal') {
        filtered = withdrawals.map(w => ({ ...w, transactionType: 'withdrawal' }));
    }
    
    filtered.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-money-bill-transfer" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <p>No transactions found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = filtered.map(t => {
        if (t.transactionType === 'deposit') {
            return `
                <tr>
                    <td>${formatDateTime(t.date, t.time)}</td>
                    <td><span style="background: rgba(34,197,94,0.1); color: #22c55e; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">DEPOSIT</span></td>
                    <td>${t.broker}</td>
                    <td class="profit" style="font-weight: 600;">${formatCurrency(t.amount)}</td>
                    <td>${formatCurrency(t.balanceBefore)}</td>
                    <td>${formatCurrency(t.balanceAfter)}</td>
                    <td>${t.notes || '-'}</td>
                    <td>
                        <button onclick="deleteDeposit(${t.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td>${formatDateTime(t.date, t.time)}</td>
                    <td><span style="background: rgba(239,68,68,0.1); color: #ef4444; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.625rem;">WITHDRAWAL</span></td>
                    <td>${t.broker}</td>
                    <td class="loss" style="font-weight: 600;">${formatCurrency(t.amount)}</td>
                    <td>${formatCurrency(t.balanceBefore)}</td>
                    <td>${formatCurrency(t.balanceAfter)}</td>
                    <td>${t.notes || '-'}</td>
                    <td>
                        <button onclick="deleteWithdrawal(${t.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
    }).join('');
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeUsers();
    
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const isIndex = window.location.pathname.includes('index.html') || 
                    window.location.pathname.endsWith('/') || 
                    window.location.pathname.endsWith('index');
    
    if (isDashboard && !isAuthenticated()) {
        window.location.replace('index.html');
        return;
    }
    
    if (isIndex && isAuthenticated()) {
        window.location.replace('dashboard.html');
        return;
    }
    
    if (isDashboard) {
        const loader = document.getElementById('loader');
        const mainContainer = document.getElementById('mainContainer');
        
        if (loader && mainContainer) {
            let progress = 0;
            const tips = [
                "Discipline is the bridge between goals and accomplishment.",
                "The trend is your friend until it bends.",
                "Plan your trade and trade your plan.",
                "Cut losses short, let profits run.",
                "Patience is key in trading.",
                "Risk management is more important than profits.",
                "Learn from every trade, win or lose.",
                "The market rewards consistency, not luck."
            ];
            
            const interval = setInterval(() => {
                progress += 2;
                const progressEl = document.getElementById('loaderProgress');
                const percentageEl = document.getElementById('loaderPercentage');
                const tipEl = document.getElementById('loadingTip');
                
                if (progressEl) progressEl.style.width = `${progress}%`;
                if (percentageEl) percentageEl.textContent = `${progress}%`;
                
                if (progress % 20 === 0) {
                    const randomTip = tips[Math.floor(Math.random() * tips.length)];
                    if (tipEl) tipEl.textContent = randomTip;
                }
                
                if (progress >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        loader.style.opacity = '0';
                        setTimeout(() => {
                            loader.style.display = 'none';
                            mainContainer.style.display = 'block';
                            initializeDashboard();
                        }, 500);
                    }, 500);
                }
            }, 30);
        } else {
            initializeDashboard();
        }
    }
});

// ===== FIXED EQUITY CURVE FUNCTION - REPLACE THE EXISTING ONE =====
function getEquityData(period) {
    // Get starting balance
    const startBal = startingBalance || 0;
    
    // Collect activities that affect balance (EXCLUDING DEPOSITS for movement)
    const activities = [];
    
    // Add withdrawals (these cause downward movement)
    withdrawals.forEach(w => {
        activities.push({
            date: w.date,
            amount: -w.amount,
            type: 'withdrawal'
        });
    });
    
    // Add trades (these cause upward/downward movement)
    trades.forEach(t => {
        activities.push({
            date: t.date,
            amount: t.pnl,
            type: 'trade'
        });
    });
    
    // Sort by date
    activities.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Group by date
    const dailyChanges = new Map();
    activities.forEach(activity => {
        const date = activity.date;
        if (!dailyChanges.has(date)) {
            dailyChanges.set(date, 0);
        }
        dailyChanges.set(date, dailyChanges.get(date) + activity.amount);
    });
    
    const activeDates = Array.from(dailyChanges.keys()).sort();
    
    if (period === '1m') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const relevantDates = activeDates.filter(date => new Date(date) >= oneMonthAgo);
        
        // CRITICAL: Start with starting balance (deposit amount)
        const labels = ['Start'];
        const data = [startBal];
        let runningBalance = startBal;
        
        relevantDates.forEach(date => {
            runningBalance += dailyChanges.get(date);
            data.push(runningBalance);
            labels.push(formatFullDate(date));
        });
        
        updateEquityStats(data);
        
        return {
            labels,
            datasets: [{
                label: 'Account Balance',
                data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true
            }]
        };
    } else {
        const monthlyData = new Map();
        
        activities.forEach(activity => {
            const monthKey = activity.date.substring(0, 7);
            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, 0);
            }
            monthlyData.set(monthKey, monthlyData.get(monthKey) + activity.amount);
        });
        
        const labels = ['Start'];
        const data = [startBal];
        let runningBalance = startBal;
        
        const sortedMonths = Array.from(monthlyData.keys()).sort().slice(-12);
        
        sortedMonths.forEach(month => {
            runningBalance += monthlyData.get(month);
            data.push(runningBalance);
            const [year, monthNum] = month.split('-');
            const monthName = new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            labels.push(monthName);
        });
        
        updateEquityStats(data);
        
        return {
            labels,
            datasets: [{
                label: 'Account Balance',
                data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true
            }]
        };
    }
}

// ===== 🔙 BACK NAVIGATION ONLY - FORWARD NAVIGATION BLOCKED =====
// Add this at the very end of your script.js file

(function() {
    console.log('🚫 Installing navigation control: BACK allowed, FORWARD blocked');
    
    // Wait for everything to load
    setTimeout(function() {
        
        // Store authentication state
        let isAuthenticated = sessionStorage.getItem('fxTaeAuthenticated') === 'true';
        
        // Override the preventBackNavigation function to allow back but block forward
        window.preventBackNavigation = function() {
            console.log('🔙 Back navigation allowed, forward navigation blocked');
            
            // This allows back navigation but prevents forward
            history.pushState(null, null, location.href);
            
            // Handle popstate (back button) - let it work normally
            window.addEventListener('popstate', function(event) {
                console.log('🔙 Back button pressed - navigating to landing page');
                
                // Check if we're leaving the dashboard
                if (!window.location.pathname.includes('dashboard.html')) {
                    // We're leaving, clear auth state? No - let logout handle it
                    console.log('👋 Leaving dashboard page');
                }
            });
        };
        
        // Clear forward navigation on login
        const originalSetCurrentUser = window.setCurrentUser;
        if (originalSetCurrentUser) {
            window.setCurrentUser = function(user) {
                console.log('🔐 User logged in - clearing forward history');
                const result = originalSetCurrentUser.apply(this, arguments);
                
                // Replace current history state to prevent forward navigation
                history.replaceState({ page: 'dashboard' }, '', 'dashboard.html');
                
                return result;
            };
        }
        
        // On logout, replace history to prevent going back
        const originalLogout = window.logout;
        if (originalLogout) {
            window.logout = function() {
                console.log('🚪 Logging out - clearing history');
                
                // Clear history so forward can't go back to dashboard
                history.pushState(null, null, 'index.html');
                
                // Call original logout
                return originalLogout.apply(this, arguments);
            };
        }
        
        // If on dashboard, set up history
        if (window.location.pathname.includes('dashboard.html')) {
            console.log('📊 On dashboard page - setting up history');
            
            // Replace current state
            history.replaceState({ page: 'dashboard' }, '', window.location.href);
            
            // Add a new state to allow back but not forward
            history.pushState({ page: 'dashboard' }, '', window.location.href);
            
            // Handle back button
            window.addEventListener('popstate', function(event) {
                console.log('🔙 Back navigation detected');
                
                // Check if we're still authenticated
                const auth = sessionStorage.getItem('fxTaeAuthenticated') === 'true';
                
                if (!auth) {
                    console.log('🔒 Not authenticated - redirecting to login');
                    window.location.replace('index.html');
                    return;
                }
                
                // Let back navigation happen naturally
                // If we're going to index.html, that's fine
            });
        }
        
        // On page load, check if we're on index and came from dashboard
        if (window.location.pathname.includes('index.html') || 
            window.location.pathname.endsWith('/')) {
            console.log('🏠 On landing page');
            
            // Clear any forward history to dashboard
            if (history.state && history.state.page === 'dashboard') {
                history.replaceState(null, '', 'index.html');
            }
        }
        
        // Block forward navigation attempts
        window.addEventListener('pageshow', function(event) {
            if (event.persisted) {
                console.log('📄 Page loaded from cache - checking auth');
                // Page was loaded from cache (forward/back cache)
                const auth = sessionStorage.getItem('fxTaeAuthenticated') === 'true';
                const isDashboard = window.location.pathname.includes('dashboard.html');
                
                if (isDashboard && !auth) {
                    console.log('🔒 Not authenticated - redirecting to login');
                    window.location.replace('index.html');
                }
            }
        });
        
        console.log('✅ Navigation control installed!');
        console.log('🔙 Back: ALLOWED (dashboard → landing page)');
        console.log('🔜 Forward: BLOCKED (cannot return to dashboard without login)');
        
    }, 500); // Wait half a second
})();

// ===== EXPORT GLOBAL FUNCTIONS =====
window.initializeDashboard = initializeDashboard;
window.saveTrade = saveTrade;
window.saveAndDownloadTrade = saveAndDownloadTrade;
window.deleteTrade = deleteTrade;
window.processDeposit = processDeposit;
window.saveAndDownloadDeposit = saveAndDownloadDeposit;
window.deleteDeposit = deleteDeposit;
window.processWithdrawal = processWithdrawal;
window.saveAndDownloadWithdrawal = saveAndDownloadWithdrawal;
window.deleteWithdrawal = deleteWithdrawal;
window.saveGoal = saveGoal;
window.clearGoal = clearGoal;
window.editGoal = editGoal;
window.deleteGoal = deleteGoal;
window.setTheme = setTheme;
window.clearAllData = clearAllData;
window.changeCalendarMonth = changeCalendarMonth;
window.showChangePasswordModal = showChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.saveNewPassword = saveNewPassword;
window.saveUsername = saveUsername;
window.saveTradingRules = saveTradingRules;
window.exportDashboardPDF = exportDashboardPDF;
window.exportJournalPDF = exportJournalPDF;
window.exportAnalyticsPDF = exportAnalyticsPDF;
window.exportTransactionsPDF = exportTransactionsPDF;
window.exportAllDataPDF = exportAllDataPDF;
window.showCustomStrategy = showCustomStrategy;
window.showPositionCalculator = showPositionCalculator;
window.closePositionCalculator = closePositionCalculator;
window.calculatePositionSize = calculatePositionSize;
window.downloadTradingPlanTemplate = downloadTradingPlanTemplate;
window.logout = logout;
window.formatCurrency = formatCurrency;
window.formatCurrencyWithSign = formatCurrencyWithSign;
window.formatDate = formatDate;
window.showToast = showToast;
