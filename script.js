// Game State
const gameState = {
    balance: 10000,
    demoMode: true,
    currentPeriod: 123456,
    timer: 60,
    betStatus: 'open',
    lastResults: [],
    myBets: [],
    globalRecords: [],
    telegramUserId: null,
    telegramToken: null
};

// Check for Telegram parameters
function checkTelegramParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userId = urlParams.get('userId');
    
    if (token && userId) {
        gameState.telegramUserId = userId;
        gameState.telegramToken = token;
        gameState.demoMode = false;
        gameState.balance = 1000; // Use the balance from Telegram or a default
        
        console.log('Connected via Telegram Bot:', userId);
        
        // Show a notification
        showNotification('Connected via Telegram Bot', 'success');
    }
}

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Check for Telegram parameters
    checkTelegramParams();
    
    // Initialize the game
    initializeGame();
    
    // Event Listeners
    setupEventListeners();
    
    // Start the game timer
    startGameTimer();
    
    // Generate mock data for testing
    generateMockData();
});

// Initialize Game
function initializeGame() {
    updateBalanceDisplay();
    updateDemoModeDisplay();
    populateLastResults();
    updateHistoryTables();
}

// Setup Event Listeners
function setupEventListeners() {
    // How to Play Button
    const howToPlayBtn = document.querySelector('.how-to-play-btn');
    howToPlayBtn.addEventListener('click', () => {
        openModal('howToPlayModal');
    });
    
    // Profile Button
    const profileBtn = document.querySelector('.profile-btn');
    profileBtn.addEventListener('click', () => {
        openModal('profileModal');
    });
    
    // Demo Mode Toggle
    const demoToggle = document.getElementById('demoToggle');
    demoToggle.addEventListener('change', toggleDemoMode);
    
    // Add Funds Button (only visible in demo mode)
    const addFundsBtn = document.querySelector('.add-funds-btn');
    addFundsBtn.addEventListener('click', addDemoFunds);
    
    // Betting Buttons
    const betButtons = document.querySelectorAll('.bet-btn');
    betButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (gameState.betStatus === 'open') {
                openBetAmountModal(btn.textContent);
            } else {
                showNotification('Betting is closed for this round!', 'red');
            }
        });
    });
    
    // Color Balls
    const colorBalls = document.querySelectorAll('.color-ball');
    colorBalls.forEach(ball => {
        ball.addEventListener('click', () => {
            if (gameState.betStatus === 'open') {
                let betType = '';
                if (ball.classList.contains('red')) betType = 'Red';
                else if (ball.classList.contains('violet')) betType = 'Violet';
                else if (ball.classList.contains('green')) betType = 'Green';
                
                openBetAmountModal(betType);
            } else {
                showNotification('Betting is closed for this round!', 'red');
            }
        });
    });
    
    // Number Balls
    const numberBalls = document.querySelectorAll('.number-ball');
    numberBalls.forEach(ball => {
        ball.addEventListener('click', () => {
            if (gameState.betStatus === 'open') {
                openBetAmountModal(ball.textContent);
            } else {
                showNotification('Betting is closed for this round!', 'red');
            }
        });
    });
    
    // Tab Buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabType = btn.getAttribute('data-tab');
            switchTab(tabType);
        });
    });
    
    // Modal Tabs
    const modalTabs = document.querySelectorAll('.modal-tab');
    modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabType = tab.getAttribute('data-tab');
            switchModalTab(tabType);
        });
    });
    
    // Profile Tabs
    const profileTabs = document.querySelectorAll('.profile-tab');
    profileTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabType = tab.getAttribute('data-tab');
            switchProfileTab(tabType);
        });
    });
    
    // Close Buttons
    const closeButtons = document.querySelectorAll('.close-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });
    
    // Multiplier Buttons
    const multiplierButtons = document.querySelectorAll('.multiplier-btn');
    multiplierButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const value = parseInt(btn.getAttribute('data-value'));
            updateBetAmount(value);
        });
    });
    
    // Confirm Bet Button
    const confirmBetBtn = document.querySelector('.confirm-bet-btn');
    confirmBetBtn.addEventListener('click', placeBet);
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Timer Functions
function startGameTimer() {
    const timerElement = document.querySelector('.timer');
    const betStatusElement = document.querySelector('.bet-status');
    
    const timerInterval = setInterval(() => {
        gameState.timer--;
        timerElement.textContent = gameState.timer;
        
        if (gameState.timer <= 0) {
            clearInterval(timerInterval);
            gameState.betStatus = 'closed';
            betStatusElement.textContent = 'Bet is Closed';
            betStatusElement.style.color = 'var(--red-color)';
            
            // Show result after a short delay
            setTimeout(() => {
                generateResult();
                resetGame();
                startGameTimer();
            }, 2000);
        } else if (gameState.timer <= 10) {
            betStatusElement.style.color = 'var(--red-color)';
        }
    }, 1000);
}

function resetGame() {
    gameState.timer = 60;
    gameState.betStatus = 'open';
    gameState.currentPeriod++;
    
    const timerElement = document.querySelector('.timer');
    const betStatusElement = document.querySelector('.bet-status');
    const periodElement = document.querySelector('.period-id');
    
    timerElement.textContent = gameState.timer;
    betStatusElement.textContent = 'Bet is Open';
    betStatusElement.style.color = 'var(--green-color)';
    periodElement.textContent = `Period: #${gameState.currentPeriod}`;
}

// Game Functions
function generateResult() {
    const number = Math.floor(Math.random() * 10);
    let color;
    
    if (number === 0 || number === 5) {
        color = 'violet';
    } else if (number === 1 || number === 3 || number === 7 || number === 9) {
        color = 'red';
    } else {
        color = 'green';
    }
    
    const result = {
        period: gameState.currentPeriod,
        number,
        color,
        time: new Date().toLocaleTimeString()
    };
    
    gameState.lastResults.unshift(result);
    if (gameState.lastResults.length > 50) {
        gameState.lastResults.pop();
    }
    
    gameState.globalRecords.unshift(result);
    
    // Check if user has won any bets
    checkWinningBets(result);
    
    // Update UI
    populateLastResults();
    updateHistoryTables();
    
    // Show result popup
    showResultPopup(result);
}

function checkWinningBets(result) {
    const currentBets = gameState.myBets.filter(bet => bet.period === gameState.currentPeriod);
    
    currentBets.forEach(bet => {
        let won = false;
        let winAmount = 0;
        
        if (bet.selection === result.color) {
            if (result.color === 'red' || result.color === 'green') {
                winAmount = bet.amount * 1.8; // Updated from 2x to 1.8x
                won = true;
            } else if (result.color === 'violet') {
                winAmount = bet.amount * 4.5; // Kept at 4.5x
                won = true;
            }
        } else if (bet.selection === result.number.toString()) {
            winAmount = bet.amount * 9; // Added 9x payout for number bets
            won = true;
        } else if (bet.selection === 'big' && result.number > 4) {
            winAmount = bet.amount * 1.8; // Updated from 2x to 1.8x
            won = true;
        } else if (bet.selection === 'small' && result.number <= 4) {
            winAmount = bet.amount * 1.8; // Updated from 2x to 1.8x
            won = true;
        }
        
        bet.result = won ? 'win' : 'lose';
        bet.winAmount = won ? winAmount : 0;
        
        if (won) {
            gameState.balance += winAmount;
            updateBalanceDisplay();
        }
    });
}

function placeBet() {
    const betSelection = document.getElementById('betSelection').textContent;
    const betAmount = parseInt(document.getElementById('betAmount').value);
    
    if (betAmount <= 0) {
        showNotification('Please enter a valid amount', 'red');
        return;
    }
    
    if (betAmount > gameState.balance) {
        showNotification('Insufficient balance', 'red');
        return;
    }
    
    const bet = {
        period: gameState.currentPeriod,
        selection: betSelection.toLowerCase(),
        amount: betAmount,
        time: new Date().toLocaleTimeString(),
        result: 'pending'
    };
    
    gameState.myBets.unshift(bet);
    gameState.balance -= betAmount;
    
    updateBalanceDisplay();
    updateHistoryTables();
    closeAllModals();
    
    showNotification(`Bet placed: ${betSelection} for ₹${betAmount}`, 'green');
}

// UI Functions
function updateBalanceDisplay() {
    const balanceElements = document.querySelectorAll('.balance');
    const realBalanceElement = document.querySelector('.real-balance');
    
    balanceElements.forEach(el => {
        el.textContent = `₹ ${gameState.balance.toFixed(2)}`;
    });
    
    if (realBalanceElement) {
        realBalanceElement.textContent = `₹ ${gameState.balance.toFixed(2)}`;
    }
}

function updateDemoModeDisplay() {
    const demoLabel = document.querySelector('.demo-label');
    const addFundsBtn = document.querySelector('.add-funds-btn');
    const demoToggle = document.getElementById('demoToggle');
    
    demoLabel.style.color = gameState.demoMode ? '#3498db' : 'var(--green-color)';
    demoLabel.textContent = gameState.demoMode ? 'DEMO' : 'LIVE';
    addFundsBtn.style.display = gameState.demoMode ? 'flex' : 'none';
    demoToggle.checked = gameState.demoMode;
}

function toggleDemoMode() {
    gameState.demoMode = !gameState.demoMode;
    updateDemoModeDisplay();
}

function addDemoFunds() {
    if (gameState.demoMode) {
        gameState.balance += 1000;
        updateBalanceDisplay();
        showNotification('1000 demo credits added to your balance', 'green');
    }
}

function populateLastResults() {
    const lastResultsContainer = document.querySelector('.last-results');
    lastResultsContainer.innerHTML = '';
    
    gameState.lastResults.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = `result-item result-${result.color}`;
        resultItem.textContent = result.number;
        lastResultsContainer.appendChild(resultItem);
    });
}

function updateHistoryTables() {
    // Update Global Records
    const globalHistoryTable = document.getElementById('global-history');
    globalHistoryTable.innerHTML = '';
    
    gameState.globalRecords.slice(0, 20).forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${record.period}</td>
            <td><span class="result-item result-${record.color}" style="display: inline-block; margin: 0 auto;">${record.number}</span></td>
            <td>${record.time}</td>
        `;
        globalHistoryTable.appendChild(row);
    });
    
    // Update My Bets
    const myBetsTable = document.getElementById('my-bets-history');
    myBetsTable.innerHTML = '';
    
    gameState.myBets.slice(0, 20).forEach(bet => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${bet.period}</td>
            <td>${bet.selection.charAt(0).toUpperCase() + bet.selection.slice(1)}</td>
            <td>₹${bet.amount}</td>
            <td>${bet.result === 'pending' ? 'Pending' : bet.result === 'win' ? `Win ₹${bet.winAmount}` : 'Lose'}</td>
        `;
        myBetsTable.appendChild(row);
    });
    
    // Update Transaction History
    const transactionTable = document.getElementById('transaction-history');
    transactionTable.innerHTML = '';
    
    // Combine bets and results for transaction history
    const transactions = [];
    
    gameState.myBets.forEach(bet => {
        transactions.push({
            date: new Date().toLocaleDateString(),
            type: 'Bet Placed',
            amount: `-₹${bet.amount}`,
            status: 'Completed'
        });
        
        if (bet.result === 'win') {
            transactions.push({
                date: new Date().toLocaleDateString(),
                type: 'Win',
                amount: `+₹${bet.winAmount}`,
                status: 'Completed'
            });
        }
    });
    
    transactions.slice(0, 20).forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.date}</td>
            <td>${transaction.type}</td>
            <td>${transaction.amount}</td>
            <td>${transaction.status}</td>
        `;
        transactionTable.appendChild(row);
    });
}

function switchTab(tabType) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabType) {
            btn.classList.add('active');
        }
    });
    
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${tabType}-content`).classList.add('active');
}

function switchModalTab(tabType) {
    const modalTabs = document.querySelectorAll('.modal-tab');
    const modalContents = document.querySelectorAll('.modal-tab-content');
    
    modalTabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabType) {
            tab.classList.add('active');
        }
    });
    
    modalContents.forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${tabType}-content`).classList.add('active');
}

function switchProfileTab(tabType) {
    const profileTabs = document.querySelectorAll('.profile-tab');
    const profileContents = document.querySelectorAll('.profile-tab-content');
    
    profileTabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabType) {
            tab.classList.add('active');
        }
    });
    
    profileContents.forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${tabType}-content`).classList.add('active');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

function openBetAmountModal(selection) {
    const betSelectionElement = document.getElementById('betSelection');
    betSelectionElement.textContent = selection;
    
    // Reset bet amount
    const betAmountInput = document.getElementById('betAmount');
    betAmountInput.value = 10;
    
    // Reset multiplier buttons
    const multiplierButtons = document.querySelectorAll('.multiplier-btn');
    multiplierButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    openModal('betAmountModal');
}

function updateBetAmount(multiplier) {
    const betAmountInput = document.getElementById('betAmount');
    betAmountInput.value = multiplier * 10;
    
    // Update active multiplier button
    const multiplierButtons = document.querySelectorAll('.multiplier-btn');
    multiplierButtons.forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.getAttribute('data-value')) === multiplier) {
            btn.classList.add('active');
        }
    });
}

function showResultPopup(result) {
    const resultPopup = document.getElementById('resultPopup');
    const resultNumber = document.querySelector('.result-number');
    const resultPeriod = document.querySelector('.result-period');
    const resultMessage = document.querySelector('.result-message');
    
    resultNumber.textContent = result.number;
    resultNumber.style.color = `var(--${result.color}-color)`;
    resultPeriod.textContent = `Period: #${result.period}`;
    
    // Check if user won any bets for this period
    const userBets = gameState.myBets.filter(bet => bet.period === result.period);
    
    if (userBets.length === 0) {
        resultMessage.textContent = '😊 No bet placed this round';
    } else {
        const wonBets = userBets.filter(bet => bet.result === 'win');
        
        if (wonBets.length > 0) {
            const totalWin = wonBets.reduce((sum, bet) => sum + bet.winAmount, 0);
            resultMessage.textContent = `🎉 You won ₹${totalWin}!`;
            resultMessage.style.color = 'var(--green-color)';
        } else {
            resultMessage.textContent = '😔 Better luck next time';
            resultMessage.style.color = 'var(--red-color)';
        }
    }
    
    resultPopup.style.display = 'block';
    
    // Hide popup after 2.5 seconds
    setTimeout(() => {
        resultPopup.style.display = 'none';
    }, 2500);
}

function showNotification(message, color) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.backgroundColor = color === 'red' ? 'var(--red-color)' : 'var(--green-color)';
    notification.style.color = 'white';
    notification.style.zIndex = '1000';
    notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    
    document.body.appendChild(notification);
    
    // Remove notification after 2.5 seconds
    setTimeout(() => {
        notification.remove();
    }, 2500);
}

// Generate Mock Data for Testing
function generateMockData() {
    // Generate last results
    for (let i = 0; i < 50; i++) {
        const number = Math.floor(Math.random() * 10);
        let color;
        
        if (number === 0 || number === 5) {
            color = 'violet';
        } else if (number === 1 || number === 3 || number === 7 || number === 9) {
            color = 'red';
        } else {
            color = 'green';
        }
        
        gameState.lastResults.push({
            period: gameState.currentPeriod - i - 1,
            number,
            color,
            time: new Date().toLocaleTimeString()
        });
    }
    
    // Generate global records
    gameState.globalRecords = [...gameState.lastResults];
    
    // Update UI
    populateLastResults();
    updateHistoryTables();
}