// ===== FX TAE TRADING JOURNAL - COMPLETE FIXED VERSION =====
// COPY AND PASTE THIS ENTIRE FILE - IT WILL FIX THE DEPOSIT ISSUE

// ===== AUTHENTICATION & USER MANAGEMENT =====
const USERS_KEY = 'fxTaeUsers';
const CURRENT_USER_KEY = 'fxTaeCurrentUser';
const AUTH_KEY = 'fxTaeAuthenticated';
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
    if (!localStorage.getItem(USERS_KEY)) localStorage.setItem(USERS_KEY, JSON.stringify([]));
}

function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }

function getCurrentUser() { return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}'); }

function isAuthenticated() { return sessionStorage.getItem(AUTH_KEY) === 'true'; }

function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.replace('index.html');
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

function formatFullDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateString; }
}

function formatDateTime(dateString, timeString) {
    if (!dateString) return '';
    return `${formatFullDate(dateString)} ${timeString || ''}`.trim();
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
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}

// ===== DATA MANAGEMENT =====
function loadData() {
    try {
        trades = JSON.parse(localStorage.getItem(TRADES_KEY)) || [];
        goals = JSON.parse(localStorage.getItem(GOALS_KEY)) || [];
        deposits = JSON.parse(localStorage.getItem(DEPOSITS_KEY)) || [];
        withdrawals = JSON.parse(localStorage.getItem(WITHDRAWALS_KEY)) || [];
        startingBalance = parseFloat(localStorage.getItem(STARTING_BALANCE_KEY)) || 0;
        
        // FIXED: accountBalance = startingBalance (NOT added)
        accountBalance = startingBalance;
        
        console.log('Data loaded:', { startingBalance, accountBalance, deposits });
    } catch (e) { console.error('Error loading data:', e); }
}

function saveData() {
    localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    localStorage.setItem(DEPOSITS_KEY, JSON.stringify(deposits));
    localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(withdrawals));
    localStorage.setItem(STARTING_BALANCE_KEY, startingBalance.toString());
}

// ===== DASHBOARD INITIALIZATION =====
function initializeDashboard() {
    console.log('Initializing Dashboard...');
    
    if (!isAuthenticated()) {
        window.location.replace('index.html');
        return;
    }
    
    // Prevent back navigation
    history.pushState(null, null, location.href);
    window.addEventListener('popstate', () => history.pushState(null, null, location.href));
    
    // Enable scrolling
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    loadData();
    
    // Update all displays
    updateUserInfo();
    updateAllBalances();
    updateDashboardStats();
    updateRecentActivity();
    updateTransactionHistory();
    updateAllTradesTable();
    updateGoalsList();
    updateCalendar();
    
    setTimeout(() => initializeCharts(), 500);
    setTodayDates();
    setupEventListeners();
    
    const savedTheme = localStorage.getItem('fxTaeTheme') || 'light';
    setTheme(savedTheme);
}

// ===== UI UPDATES =====
function updateUserInfo() {
    const user = getCurrentUser();
    ['userName', 'sidebarUserName', 'dashboardUserName'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = user.name || 'Trader';
    });
    
    const emailEl = document.getElementById('sidebarUserEmail');
    if (emailEl) emailEl.textContent = user.email || 'trader@example.com';
}

function updateAllBalances() {
    // FIXED: accountBalance is startingBalance (NOT added)
    accountBalance = startingBalance;
    
    // Update ALL balance displays
    const balanceIds = [
        'accountBalance', 'sidebarBalance', 'accountBalanceDisplay',
        'startingBalanceDisplay', 'equityTotal'
    ];
    
    balanceIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = formatCurrency(accountBalance);
    });
    
    // Update totals
    const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    
    const totalDepositsEl = document.getElementById('totalDepositsDisplay');
    if (totalDepositsEl) totalDepositsEl.textContent = formatCurrency(totalDeposits);
    
    const totalWithdrawalsEl = document.getElementById('totalWithdrawalsDisplay');
    if (totalWithdrawalsEl) totalWithdrawalsEl.textContent = formatCurrency(totalWithdrawals);
    
    const totalGrowthEl = document.getElementById('totalGrowth');
    if (totalGrowthEl) totalGrowthEl.textContent = formatCurrencyWithSign(accountBalance - startingBalance);
    
    const growthPercent = startingBalance > 0 ? ((accountBalance - startingBalance) / startingBalance * 100).toFixed(1) : 0;
    const growthPercentEl = document.getElementById('growthPercentage');
    if (growthPercentEl) growthPercentEl.textContent = (growthPercent > 0 ? '+' : '') + growthPercent + '%';
    
    console.log('Balances updated:', { startingBalance, accountBalance, totalDeposits });
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
        dailyLimitProgressEl.style.width = `${(todayTrades.length / 4) * 100}%`;
    }
    
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const weeklyTrades = trades.filter(t => t.date >= weekAgo);
    const weeklyPnL = weeklyTrades.reduce((sum, t) => sum + t.pnl, 0);
    
    const weeklyPnlEl = document.getElementById('weeklyPnl');
    if (weeklyPnlEl) weeklyPnlEl.textContent = formatCurrencyWithSign(weeklyPnL);
    
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const monthlyTrades = trades.filter(t => t.date >= monthAgo);
    const monthlyPnL = monthlyTrades.reduce((sum, t) => sum + t.pnl, 0);
    
    const monthlyPnlEl = document.getElementById('monthlyPnl');
    if (monthlyPnlEl) monthlyPnlEl.textContent = formatCurrencyWithSign(monthlyPnL);
}

// ===== DEPOSIT FUNCTION - FIXED =====
function processDeposit() {
    console.log('💰 PROCESSING DEPOSIT - FIXED VERSION');
    
    const date = document.getElementById('depositDate')?.value;
    const time = document.getElementById('depositTime')?.value;
    const broker = document.getElementById('depositBroker')?.value;
    const amount = parseFloat(document.getElementById('depositAmount')?.value);
    const notes = document.getElementById('depositNotes')?.value;
    
    if (!date || !time || !broker || isNaN(amount) || amount <= 0) {
        showToast('Please fill all fields with valid amount', 'error');
        return false;
    }
    
    // FIXED: Starting balance becomes the deposit amount (NOT added)
    const oldBalance = startingBalance;
    startingBalance = amount;
    
    // Create deposit record
    const deposit = {
        id: Date.now(),
        date, time, broker,
        amount: amount,
        notes: notes || 'Deposit',
        balanceBefore: oldBalance,
        balanceAfter: amount,
        type: 'deposit'
    };
    
    // Replace deposits array with this single deposit
    deposits = [deposit];
    
    // Save all data
    saveData();
    
    // FIXED: accountBalance = startingBalance (NOT added)
    accountBalance = startingBalance;
    
    // Update all displays
    updateAllBalances();
    updateRecentActivity();
    updateTransactionHistory();
    
    // Clear form
    document.getElementById('depositAmount').value = '';
    document.getElementById('depositNotes').value = '';
    document.getElementById('newBalanceAfterDeposit').value = amount.toFixed(2);
    
    // Update charts if they exist
    if (equityChart) updateEquityChart('12m');
    
    showToast(`✅ Balance set to $${amount.toFixed(2)}!`, 'success');
    console.log(`✅ DEPOSIT COMPLETE: Starting Balance: $${startingBalance}, Current Balance: $${accountBalance}`);
    return true;
}

// ===== WITHDRAWAL FUNCTION =====
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
    
    if (amount > accountBalance) {
        showToast('Insufficient balance!', 'error');
        return false;
    }
    
    const withdrawal = {
        id: Date.now(),
        date, time, broker,
        amount: amount,
        notes: notes || 'Withdrawal',
        balanceBefore: accountBalance,
        balanceAfter: accountBalance - amount,
        type: 'withdrawal'
    };
    
    withdrawals.unshift(withdrawal);
    accountBalance -= amount;
    saveData();
    
    updateAllBalances();
    updateRecentActivity();
    updateTransactionHistory();
    
    document.getElementById('withdrawalAmount').value = '';
    document.getElementById('withdrawalNotes').value = '';
    
    showToast(`Withdrawal of $${amount.toFixed(2)} processed!`, 'success');
    return true;
}

// ===== TRADE FUNCTION =====
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
        date, time, tradeNumber, pair, direction, strategy, pnl,
        notes: notes || 'No notes',
        type: 'trade'
    };
    
    trades.unshift(trade);
    accountBalance += pnl;
    saveData();
    
    updateAllBalances();
    updateDashboardStats();
    updateRecentActivity();
    updateAllTradesTable();
    
    if (equityChart) updateEquityChart('12m');
    if (winLossChart) updateWinLossChart();
    if (buysSellsChart) updateBuysSellsChart();
    
    updateCalendar();
    
    document.getElementById('pnlAmount').value = '';
    document.getElementById('tradeNotes').value = '';
    document.getElementById('customStrategy').style.display = 'none';
    document.getElementById('customStrategy').value = '';
    
    showToast('Trade saved successfully!', 'success');
    return true;
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
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No activity recorded yet.</td></tr>';
        return;
    }
    
    tableBody.innerHTML = allActivities.map(activity => {
        if (activity.type === 'trade') {
            return `
                <tr>
                    <td>${formatDateTime(activity.date, activity.time)}</td>
                    <td><span style="background: rgba(59,130,246,0.1); color: #3b82f6; padding: 0.25rem 0.5rem; border-radius: 20px;">TRADE</span></td>
                    <td>${activity.pair} (${activity.direction?.toUpperCase()}) - ${activity.strategy}</td>
                    <td class="${activity.pnl >= 0 ? 'profit' : 'loss'}" style="font-weight: 600;">${formatCurrencyWithSign(activity.pnl)}</td>
                    <td><span style="background: ${activity.pnl >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${activity.pnl >= 0 ? '#22c55e' : '#ef4444'}; padding: 0.25rem 0.5rem; border-radius: 20px;">${activity.pnl >= 0 ? 'WIN' : 'LOSS'}</span></td>
                    <td><button onclick="deleteTrade(${activity.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer;"><i class="fas fa-trash"></i></button></td>
                </tr>
            `;
        } else if (activity.type === 'deposit') {
            return `
                <tr>
                    <td>${formatDateTime(activity.date, activity.time)}</td>
                    <td><span style="background: rgba(34,197,94,0.1); color: #22c55e; padding: 0.25rem 0.5rem; border-radius: 20px;">DEPOSIT</span></td>
                    <td>${activity.broker}</td>
                    <td class="profit" style="font-weight: 600;">${formatCurrencyWithSign(activity.amount)}</td>
                    <td><span style="background: rgba(34,197,94,0.1); color: #22c55e; padding: 0.25rem 0.5rem; border-radius: 20px;">COMPLETED</span></td>
                    <td><button onclick="deleteDeposit(${activity.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer;"><i class="fas fa-trash"></i></button></td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td>${formatDateTime(activity.date, activity.time)}</td>
                    <td><span style="background: rgba(239,68,68,0.1); color: #ef4444; padding: 0.25rem 0.5rem; border-radius: 20px;">WITHDRAWAL</span></td>
                    <td>${activity.broker}</td>
                    <td class="loss" style="font-weight: 600;">${formatCurrencyWithSign(-activity.amount)}</td>
                    <td><span style="background: rgba(245,158,11,0.1); color: #f59e0b; padding: 0.25rem 0.5rem; border-radius: 20px;">PROCESSED</span></td>
                    <td><button onclick="deleteWithdrawal(${activity.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer;"><i class="fas fa-trash"></i></button></td>
                </tr>
            `;
        }
    }).join('');
}

function updateTransactionHistory() {
    const tableBody = document.getElementById('transactionHistoryTable');
    if (!tableBody) return;
    
    const allTransactions = [
        ...deposits.map(d => ({ ...d, transactionType: 'deposit' })),
        ...withdrawals.map(w => ({ ...w, transactionType: 'withdrawal' }))
    ].sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    if (allTransactions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No transactions yet</td></tr>';
        return;
    }
    
    tableBody.innerHTML = allTransactions.map(t => {
        if (t.transactionType === 'deposit') {
            return `
                <tr>
                    <td>${formatDateTime(t.date, t.time)}</td>
                    <td><span style="background: rgba(34,197,94,0.1); color: #22c55e; padding: 0.25rem 0.5rem; border-radius: 20px;">DEPOSIT</span></td>
                    <td>${t.broker}</td>
                    <td class="profit" style="font-weight: 600;">${formatCurrency(t.amount)}</td>
                    <td>${formatCurrency(t.balanceBefore)}</td>
                    <td>${formatCurrency(t.balanceAfter)}</td>
                    <td>${t.notes || '-'}</td>
                    <td><button onclick="deleteDeposit(${t.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer;"><i class="fas fa-trash"></i></button></td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td>${formatDateTime(t.date, t.time)}</td>
                    <td><span style="background: rgba(239,68,68,0.1); color: #ef4444; padding: 0.25rem 0.5rem; border-radius: 20px;">WITHDRAWAL</span></td>
                    <td>${t.broker}</td>
                    <td class="loss" style="font-weight: 600;">${formatCurrency(t.amount)}</td>
                    <td>${formatCurrency(t.balanceBefore)}</td>
                    <td>${formatCurrency(t.balanceAfter)}</td>
                    <td>${t.notes || '-'}</td>
                    <td><button onclick="deleteWithdrawal(${t.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer;"><i class="fas fa-trash"></i></button></td>
                </tr>
            `;
        }
    }).join('');
}

function updateAllTradesTable() {
    const tableBody = document.getElementById('allTradesTable');
    if (!tableBody) return;
    
    const sortedTrades = [...trades].sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    if (sortedTrades.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No trades recorded yet</td></tr>';
        return;
    }
    
    tableBody.innerHTML = sortedTrades.map(trade => `
        <tr>
            <td>${formatDateTime(trade.date, trade.time)}</td>
            <td>${trade.tradeNumber}</td>
            <td>${trade.pair}</td>
            <td><span style="background: ${trade.direction === 'buy' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${trade.direction === 'buy' ? '#22c55e' : '#ef4444'}; padding: 0.25rem 0.5rem; border-radius: 20px;">${trade.direction?.toUpperCase() || 'BUY'}</span></td>
            <td>${trade.strategy}</td>
            <td class="${trade.pnl >= 0 ? 'profit' : 'loss'}" style="font-weight: 600;">${formatCurrencyWithSign(trade.pnl)}</td>
            <td><span style="background: ${trade.pnl >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${trade.pnl >= 0 ? '#22c55e' : '#ef4444'}; padding: 0.25rem 0.5rem; border-radius: 20px;">${trade.pnl >= 0 ? 'WIN' : 'LOSS'}</span></td>
            <td><button onclick="deleteTrade(${trade.id})" style="background: transparent; border: none; color: #6b7280; cursor: pointer;"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
    
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const winRate = trades.length > 0 ? (winningTrades / trades.length * 100).toFixed(1) : 0;
    
    document.getElementById('totalTradesCount').textContent = trades.length;
    document.getElementById('winningTradesCount').textContent = winningTrades;
    document.getElementById('losingTradesCount').textContent = losingTrades;
    document.getElementById('winRateDisplay').textContent = `${winRate}%`;
    document.getElementById('netPnlDisplay').textContent = formatCurrencyWithSign(totalPnL);
    
    document.getElementById('winningTradesAnalytics').textContent = winningTrades;
    document.getElementById('losingTradesAnalytics').textContent = losingTrades;
    document.getElementById('totalProfit').textContent = formatCurrency(totalProfit);
    document.getElementById('totalLoss').textContent = formatCurrency(totalLoss);
    
    const buys = trades.filter(t => t.direction === 'buy').length;
    const sells = trades.filter(t => t.direction === 'sell').length;
    
    document.getElementById('totalBuys').textContent = buys;
    document.getElementById('totalSells').textContent = sells;
}

// ===== GOALS FUNCTIONS =====
function saveGoal() {
    const input = document.getElementById('goalInput');
    const content = input?.value.trim();
    if (!content) { showToast('Please write your goal', 'error'); return; }
    
    goals.unshift({ id: Date.now(), date: new Date().toISOString().split('T')[0], content });
    saveData();
    updateGoalsList();
    input.value = '';
    showToast('Goal saved!', 'success');
}

function clearGoal() { document.getElementById('goalInput').value = ''; }

function updateGoalsList() {
    const list = document.getElementById('goalsList');
    if (!list) return;
    
    if (goals.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 2rem;">No goals yet.</div>';
        return;
    }
    
    list.innerHTML = goals.map(goal => `
        <div class="goal-card">
            <div class="goal-header">
                <span class="goal-date">${formatFullDate(goal.date)}</span>
                <div class="goal-actions">
                    <button class="edit-btn" onclick="editGoal(${goal.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="deleteGoal(${goal.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="goal-content">${goal.content}</div>
        </div>
    `).join('');
}

function editGoal(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    document.getElementById('goalInput').value = goal.content;
    goals = goals.filter(g => g.id !== goalId);
    saveData();
    updateGoalsList();
    showToast('Goal loaded for editing', 'info');
}

function deleteGoal(goalId) {
    if (!confirm('Delete this goal?')) return;
    goals = goals.filter(g => g.id !== goalId);
    saveData();
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
    if (winLossChart) winLossChart.destroy();
    
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    
    winLossChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Winning Trades', 'Losing Trades'],
            datasets: [{
                data: [winningTrades, losingTrades],
                backgroundColor: ['#22c55e', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { legend: { display: false } }
        }
    });
}

function initializeBuysSellsChart() {
    const ctx = document.getElementById('buysSellsChart');
    if (!ctx) return;
    if (buysSellsChart) buysSellsChart.destroy();
    
    const buys = trades.filter(t => t.direction === 'buy').length;
    const sells = trades.filter(t => t.direction === 'sell').length;
    
    buysSellsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Buy Trades', 'Sell Trades'],
            datasets: [{
                data: [buys, sells],
                backgroundColor: ['#3b82f6', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            circumference: 180,
            rotation: 270,
            plugins: { legend: { display: false } }
        }
    });
}

function initializeEquityChart() {
    const ctx = document.getElementById('equityChart');
    if (!ctx) return;
    if (equityChart) equityChart.destroy();
    
    equityChart = new Chart(ctx, {
        type: 'line',
        data: getEquityData('12m'),
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: value => formatCurrency(value) }
                }
            }
        }
    });
    
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateEquityChart(this.getAttribute('data-period'));
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
    winLossChart.data.datasets[0].data = [
        trades.filter(t => t.pnl > 0).length,
        trades.filter(t => t.pnl < 0).length
    ];
    winLossChart.update();
}

function updateBuysSellsChart() {
    if (!buysSellsChart) return;
    buysSellsChart.data.datasets[0].data = [
        trades.filter(t => t.direction === 'buy').length,
        trades.filter(t => t.direction === 'sell').length
    ];
    buysSellsChart.update();
}

function getEquityData(period) {
    const labels = ['Start'];
    const data = [startingBalance];
    let runningBalance = startingBalance;
    
    const allActivities = [
        ...deposits.map(d => ({ date: d.date, amount: d.amount })),
        ...withdrawals.map(w => ({ date: w.date, amount: -w.amount })),
        ...trades.map(t => ({ date: t.date, amount: t.pnl }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (period === '1m') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        allActivities.filter(a => new Date(a.date) >= oneMonthAgo).forEach(activity => {
            runningBalance += activity.amount;
            data.push(runningBalance);
            labels.push(formatFullDate(activity.date));
        });
    } else {
        // Group by month for 12m view
        const monthlyMap = new Map();
        allActivities.forEach(activity => {
            const monthKey = activity.date.substring(0, 7);
            monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + activity.amount);
        });
        
        Array.from(monthlyMap.keys()).sort().forEach(month => {
            runningBalance += monthlyMap.get(month);
            data.push(runningBalance);
            const [year, monthNum] = month.split('-');
            labels.push(new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        });
    }
    
    // Update stats
    const peak = Math.max(...data);
    document.getElementById('equityPeak').textContent = formatCurrency(peak);
    document.getElementById('equityDrawdown').textContent = peak > 0 ? ((peak - data[data.length - 1]) / peak * 100).toFixed(1) + '%' : '0%';
    
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

// ===== CALENDAR =====
function updateCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthYear = document.getElementById('calendarMonthYear');
    if (!grid || !monthYear) return;
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    
    monthYear.textContent = `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;
    
    const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1).getDay();
    const daysInMonth = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();
    const today = new Date().toISOString().split('T')[0];
    
    let html = '';
    for (let i = 0; i < firstDay; i++) html += '<div class="calendar-day empty"></div>';
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTrades = trades.filter(t => t.date === dateStr);
        const dayPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
        
        let dayClass = 'calendar-day';
        if (dateStr === today) dayClass += ' current-day';
        if (dayTrades.length > 0) dayClass += dayPnL >= 0 ? ' profit-day' : ' loss-day';
        
        html += `
            <div class="${dayClass}">
                <span class="calendar-date">${day}</span>
                ${dayTrades.length > 0 ? `<span class="day-pnl ${dayPnL >= 0 ? 'profit' : 'loss'}">${dayPnL >= 0 ? '+' : '-'}$${Math.abs(dayPnL).toFixed(0)}</span>` : ''}
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

function changeCalendarMonth(direction) {
    currentCalendarMonth += direction;
    if (currentCalendarMonth < 0) { currentCalendarMonth = 11; currentCalendarYear--; }
    else if (currentCalendarMonth > 11) { currentCalendarMonth = 0; currentCalendarYear++; }
    updateCalendar();
}

// ===== DELETE FUNCTIONS =====
function deleteTrade(id) { trades = trades.filter(t => t.id !== id); saveData(); updateAllTradesTable(); updateRecentActivity(); updateAllBalances(); if (equityChart) updateEquityChart('12m'); showToast('Trade deleted', 'success'); }
function deleteDeposit(id) { deposits = deposits.filter(d => d.id !== id); saveData(); updateTransactionHistory(); updateRecentActivity(); updateAllBalances(); if (equityChart) updateEquityChart('12m'); showToast('Deposit deleted', 'success'); }
function deleteWithdrawal(id) { withdrawals = withdrawals.filter(w => w.id !== id); saveData(); updateTransactionHistory(); updateRecentActivity(); updateAllBalances(); if (equityChart) updateEquityChart('12m'); showToast('Withdrawal deleted', 'success'); }

// ===== SETTINGS FUNCTIONS =====
function setTheme(theme) {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    localStorage.setItem('fxTaeTheme', theme);
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(theme)) btn.classList.add('active');
    });
}

function saveUsername() {
    const newName = document.getElementById('settingsUsername')?.value.trim();
    if (!newName) { showToast('Please enter a username', 'error'); return; }
    const user = getCurrentUser();
    user.name = newName;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    updateUserInfo();
    document.getElementById('settingsUsername').value = '';
    showToast('Username updated', 'success');
}

function showChangePasswordModal() { document.getElementById('changePasswordModal').style.display = 'flex'; }
function closeChangePasswordModal() { document.getElementById('changePasswordModal').style.display = 'none'; }

function saveNewPassword() {
    const newPass = document.getElementById('newPassword')?.value;
    const confirm = document.getElementById('confirmNewPassword')?.value;
    if (!newPass || !confirm) { showToast('Please fill all fields', 'error'); return; }
    if (newPass !== confirm) { showToast('Passwords do not match', 'error'); return; }
    if (newPass.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
    showToast('Password changed successfully', 'success');
    closeChangePasswordModal();
}

function clearAllData() {
    if (!confirm('⚠️ Delete ALL data?')) return;
    trades = []; goals = []; deposits = []; withdrawals = []; startingBalance = 0; accountBalance = 0;
    saveData();
    updateAllBalances();
    updateDashboardStats();
    updateRecentActivity();
    updateTransactionHistory();
    updateAllTradesTable();
    updateGoalsList();
    updateCalendar();
    if (equityChart) updateEquityChart('12m');
    if (winLossChart) updateWinLossChart();
    if (buysSellsChart) updateBuysSellsChart();
    showToast('All data cleared', 'success');
}

function showPositionCalculator() {
    document.getElementById('calcBalance').value = accountBalance;
    document.getElementById('positionCalculatorModal').style.display = 'flex';
}
function closePositionCalculator() { document.getElementById('positionCalculatorModal').style.display = 'none'; }
function calculatePositionSize() {
    const balance = parseFloat(document.getElementById('calcBalance')?.value);
    const riskPercent = parseFloat(document.getElementById('calcRiskPercent')?.value);
    const stopLoss = parseFloat(document.getElementById('calcStopLoss')?.value);
    if (isNaN(balance) || isNaN(riskPercent) || isNaN(stopLoss) || stopLoss <= 0) { showToast('Enter valid values', 'error'); return; }
    const riskAmount = balance * (riskPercent / 100);
    document.getElementById('calcRiskAmount').value = riskAmount.toFixed(2);
    document.getElementById('calcPositionSize').value = (riskAmount / (stopLoss * 10)).toFixed(2);
}

function showCustomStrategy() { document.getElementById('customStrategy').style.display = 'block'; document.getElementById('customStrategy').focus(); }

function setTodayDates() {
    const today = new Date().toISOString().split('T')[0];
    const time = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`;
    if (document.getElementById('tradeDate')) document.getElementById('tradeDate').value = today;
    if (document.getElementById('tradeTime')) document.getElementById('tradeTime').value = time;
    if (document.getElementById('depositDate')) document.getElementById('depositDate').value = today;
    if (document.getElementById('depositTime')) document.getElementById('depositTime').value = time;
    if (document.getElementById('withdrawalDate')) document.getElementById('withdrawalDate').value = today;
    if (document.getElementById('withdrawalTime')) document.getElementById('withdrawalTime').value = time;
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    
    if (menuBtn && sidebar) menuBtn.addEventListener('click', () => sidebar.classList.toggle('active'));
    if (sidebarClose && sidebar) sidebarClose.addEventListener('click', () => sidebar.classList.remove('active'));
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.dashboard-page').forEach(p => p.classList.remove('active'));
            const page = document.getElementById(this.getAttribute('data-page'));
            if (page) page.classList.add('active');
            if (window.innerWidth <= 1024 && sidebar) sidebar.classList.remove('active');
        });
    });
    
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    document.getElementById('depositAmount')?.addEventListener('input', function() {
        document.getElementById('newBalanceAfterDeposit').value = (parseFloat(this.value) || 0).toFixed(2);
    });
    
    document.getElementById('withdrawalAmount')?.addEventListener('input', function() {
        const amount = parseFloat(this.value) || 0;
        document.getElementById('newBalanceAfterWithdrawal').value = (accountBalance - amount).toFixed(2);
    });
    
    window.addEventListener('click', e => { if (e.target.classList.contains('modal-premium')) e.target.style.display = 'none'; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal-premium').forEach(m => m.style.display = 'none'); });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeUsers();
    
    if (window.location.pathname.includes('dashboard.html') && !isAuthenticated()) {
        window.location.replace('index.html');
        return;
    }
    
    if (window.location.pathname.includes('dashboard.html')) {
        const loader = document.getElementById('loader');
        const mainContainer = document.getElementById('mainContainer');
        
        if (loader && mainContainer) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 2;
                document.getElementById('loaderProgress').style.width = progress + '%';
                document.getElementById('loaderPercentage').textContent = progress + '%';
                if (progress >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        loader.style.display = 'none';
                        mainContainer.style.display = 'block';
                        initializeDashboard();
                    }, 500);
                }
            }, 30);
        } else {
            initializeDashboard();
        }
    }
});

// ===== EXPORT FUNCTIONS =====
window.saveTrade = saveTrade;
window.saveAndDownloadTrade = () => { if (saveTrade()) setTimeout(() => downloadTradePDF(trades[0]), 500); };
window.deleteTrade = deleteTrade;
window.processDeposit = processDeposit;
window.saveAndDownloadDeposit = () => { if (processDeposit()) setTimeout(() => downloadDepositPDF(deposits[0]), 500); };
window.deleteDeposit = deleteDeposit;
window.processWithdrawal = processWithdrawal;
window.saveAndDownloadWithdrawal = () => { if (processWithdrawal()) setTimeout(() => downloadWithdrawalPDF(withdrawals[0]), 500); };
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
window.showCustomStrategy = showCustomStrategy;
window.showPositionCalculator = showPositionCalculator;
window.closePositionCalculator = closePositionCalculator;
window.calculatePositionSize = calculatePositionSize;
window.exportDashboardPDF = () => {}; // Add PDF functions if needed
window.exportJournalPDF = () => {};
window.exportAnalyticsPDF = () => {};
window.exportTransactionsPDF = () => {};
window.exportAllDataPDF = () => {};
window.downloadTradingPlanTemplate = () => {};
window.logout = logout;
