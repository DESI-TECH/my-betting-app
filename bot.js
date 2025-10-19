// Telegram Bot Integration for Betting App
const TelegramBot = require('node-telegram-bot-api');

// Load environment variables from .env file
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv package not found, loading environment variables manually');
  // Simple fallback for reading .env file if dotenv package is not available
  const fs = require('fs');
  if (fs.existsSync('.env')) {
    const envConfig = fs.readFileSync('.env', 'utf8')
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .reduce((acc, line) => {
        const [key, value] = line.split('=');
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
        return acc;
      }, {});
  }
}

// Get token from environment variables
const token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';

// Create a bot instance based on environment
let bot;
if (process.env.NODE_ENV === 'production') {
  // In production, the bot is initialized in server.js with webhook
  bot = global.bot;
  console.log('Bot using webhook mode from server.js');
} else {
  // In development, use polling
  bot = new TelegramBot(token, { polling: true });
  console.log('Bot started in polling mode');
}

// Owner ID for admin access from environment variables
const OWNER_ID = process.env.OWNER_ID || '123456789'; 

// Database simulation (in a real app, this would be a database connection)
const userDatabase = {
    users: {},
    transactions: [],
    referrals: {},
    pendingWithdrawals: []
};

// Bank details for deposits
const bankDetails = {
    accountName: 'Betting App Ltd',
    accountNumber: '1234567890',
    bankName: 'Example Bank',
    ifscCode: 'EXMP0001234'
};

// UPI details for deposits
const upiDetails = {
    upiId: 'bettingapp@example',
    qrCodeUrl: 'https://example.com/qr-code.png'
};

// Crypto wallet details
const cryptoWallet = {
    btcAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
};

// Generate a unique transaction code
function generateTransactionCode() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TX${timestamp}${random}`;
}

// Admin command handler
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Check if the user is the owner
    if (userId === OWNER_ID) {
        showAdminPanel(chatId);
    } else {
        bot.sendMessage(chatId, "You don't have permission to access the admin panel.");
    }
});

// Function to show admin panel
function showAdminPanel(chatId) {
    const message = '🔐 *Admin Panel*\nSelect an option:';
    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '✅ Approve Withdrawals', callback_data: 'admin_withdrawals' }],
                [{ text: '📊 Today\'s Deposits Report', callback_data: 'admin_deposits' }],
                [{ text: '👥 Manage Users', callback_data: 'admin_users' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'back_to_main' }]
            ]
        }
    };
    
    bot.sendMessage(chatId, message, options);
}

// Function to handle pending withdrawals
function handlePendingWithdrawals(chatId) {
    if (userDatabase.pendingWithdrawals.length === 0) {
        bot.sendMessage(chatId, "No pending withdrawals to approve.", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]
                ]
            }
        });
        return;
    }
    
    // Display each pending withdrawal with approve button
    userDatabase.pendingWithdrawals.forEach(withdrawal => {
        if (withdrawal.status === 'pending') {
            const user = userDatabase.users[withdrawal.userId] || { username: 'Unknown' };
            const message = `*Withdrawal Request*\n` +
                `ID: ${withdrawal.id}\n` +
                `User: ${user.username} (${withdrawal.userId})\n` +
                `Amount: ₹${withdrawal.amount}\n` +
                `Method: ${withdrawal.method}\n` +
                `Account: ${JSON.stringify(withdrawal.accountDetails)}\n` +
                `Date: ${new Date(withdrawal.timestamp).toLocaleString()}`;
                
            bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Approve', callback_data: `approve_withdrawal_${withdrawal.id}` }]
                    ]
                }
            });
        }
    });
    
    // Add back button after listing all withdrawals
    bot.sendMessage(chatId, "End of withdrawal requests", {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]
            ]
        }
    });
}

// Function to approve withdrawal
function approveWithdrawal(chatId, withdrawalId) {
    const withdrawalIndex = userDatabase.pendingWithdrawals.findIndex(w => w.id === withdrawalId);
    
    if (withdrawalIndex === -1) {
        bot.sendMessage(chatId, "Withdrawal request not found.");
        return;
    }
    
    const withdrawal = userDatabase.pendingWithdrawals[withdrawalIndex];
    const user = userDatabase.users[withdrawal.userId];
    
    if (!user) {
        bot.sendMessage(chatId, "User not found.");
        return;
    }
    
    // Update withdrawal status
    withdrawal.status = 'approved';
    withdrawal.approvedAt = new Date().toISOString();
    
    // Deduct from user balance
    user.inrBalance -= withdrawal.amount;
    
    // Add to transactions
    userDatabase.transactions.push({
        userId: withdrawal.userId,
        type: 'withdrawal',
        amount: withdrawal.amount,
        method: withdrawal.method,
        timestamp: new Date().toISOString(),
        status: 'completed'
    });
    
    // Notify admin
    bot.sendMessage(chatId, `Withdrawal #${withdrawalId} approved successfully.`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]
            ]
        }
    });
    
    // Notify user
    bot.sendMessage(withdrawal.userId, 
        `Your withdrawal request of ₹${withdrawal.amount} has been approved and processed. The funds should reach your account shortly.`);
}

// Function to handle today's deposits report
function handleTodayDeposits(chatId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter transactions for today's deposits
    const todayDeposits = userDatabase.transactions.filter(tx => 
        tx.type === 'deposit' && 
        new Date(tx.timestamp) >= today
    );
    
    if (todayDeposits.length === 0) {
        bot.sendMessage(chatId, "No deposits made today.", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]
                ]
            }
        });
        return;
    }
    
    // Calculate total amount
    const totalAmount = todayDeposits.reduce((sum, tx) => sum + tx.amount, 0);
    
    // Group by method
    const byMethod = {};
    todayDeposits.forEach(tx => {
        byMethod[tx.method] = (byMethod[tx.method] || 0) + tx.amount;
    });
    
    // Create report message
    let message = `*Today's Deposits Report*\n\n`;
    message += `Total Deposits: ${todayDeposits.length}\n`;
    message += `Total Amount: ₹${totalAmount}\n\n`;
    message += `*Breakdown by Method:*\n`;
    
    for (const [method, amount] of Object.entries(byMethod)) {
        message += `${method}: ₹${amount}\n`;
    }
    
    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]
            ]
        }
    });
}

// Function to handle user management
function handleUserManagement(chatId) {
    // Get all users
    const userIds = Object.keys(userDatabase.users);
    
    if (userIds.length === 0) {
        bot.sendMessage(chatId, "No users registered yet.", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]
                ]
            }
        });
        return;
    }
    
    // Send user list with pagination if needed
    const message = `*User Management*\nTotal Users: ${userIds.length}`;
    
    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                ...userIds.slice(0, 5).map(userId => {
                    const user = userDatabase.users[userId];
                    return [{ 
                        text: `${user.username || 'User'} (₹${user.inrBalance || 0})`, 
                        callback_data: `manage_user_${userId}` 
                    }];
                }),
                [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]
            ]
        }
    });
}

// Function to show user details
function showUserDetails(chatId, userId) {
    const user = userDatabase.users[userId];
    
    if (!user) {
        bot.sendMessage(chatId, "User not found.", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Back to User List', callback_data: 'admin_users' }]
                ]
            }
        });
        return;
    }
    
    // Get user transactions
    const userTransactions = userDatabase.transactions.filter(tx => tx.userId === userId);
    const depositTotal = userTransactions
        .filter(tx => tx.type === 'deposit')
        .reduce((sum, tx) => sum + tx.amount, 0);
    const withdrawalTotal = userTransactions
        .filter(tx => tx.type === 'withdrawal')
        .reduce((sum, tx) => sum + tx.amount, 0);
    
    // Create user details message
    let message = `*User Details*\n\n`;
    message += `User ID: ${userId}\n`;
    message += `Username: ${user.username || 'Not set'}\n`;
    message += `Balance: ₹${user.inrBalance || 0}\n`;
    message += `Crypto Balance: ${user.cryptoBalance || 0} BTC\n`;
    message += `Total Deposits: ₹${depositTotal}\n`;
    message += `Total Withdrawals: ₹${withdrawalTotal}\n`;
    message += `Referrals: ${userDatabase.referrals[userId]?.length || 0}\n`;
    message += `Joined: ${new Date(user.joinedAt || Date.now()).toLocaleString()}\n`;
    
    // Admin actions for this user
    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '💰 Adjust Balance', callback_data: `adjust_balance_${userId}` }],
                [{ text: '🔙 Back to User List', callback_data: 'admin_users' }],
                [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_panel' }]
            ]
        }
    });
}
    
    // Check if the user is the owner
    if (userId === OWNER_ID) {
        showAdminPanel(chatId);
    } else {
        bot.sendMessage(chatId, "⛔ You don't have permission to access admin controls.");
    }
});

// Show admin panel with owner-only buttons
function showAdminPanel(chatId) {
    bot.sendMessage(chatId, 
        `🔐 *ADMIN PANEL*\n\nWelcome, Owner. What would you like to manage today?`, 
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ Approve Withdrawals', callback_data: 'admin_withdrawals' }],
                    [{ text: '📊 Today\'s Deposits Report', callback_data: 'admin_deposits' }],
                    [{ text: '👥 Manage Users', callback_data: 'admin_users' }],
                    [{ text: '◀️ Back to Main Menu', callback_data: 'back_to_main' }]
                ]
            }
        }
    );
}

// Start command handler
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name;
    
    // Register user if not exists
    if (!userDatabase.users[userId]) {
        userDatabase.users[userId] = {
            id: userId,
            name: firstName,
            telegramId: `@${msg.from.username || userId}`,
            inrBalance: 1000, // Demo balance
            cryptoBalance: 0.001, // Demo balance
            transactions: []
        };
    }
    
    // Check if user is owner to show admin button
    const isOwner = userId.toString() === OWNER_ID;
    
    // Welcome message with main menu
    bot.sendMessage(chatId, 
        `Welcome ${firstName} to the Betting App! 🎮\n\nWhat would you like to do today?`, 
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🎮 Play Game', callback_data: 'play_game' }],
                    [{ text: '💰 Deposit', callback_data: 'deposit' }, { text: '💸 Withdraw', callback_data: 'withdraw' }],
                    [{ text: '👤 Profile', callback_data: 'profile' }, { text: '🔄 Share & Earn', callback_data: 'share' }],
                    ...(isOwner ? [[{ text: '🔐 Admin Panel', callback_data: 'admin_panel' }]] : [])
                ]
            }
        }
    );
});

// Callback query handler for main menu buttons
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    // Acknowledge the callback query
    bot.answerCallbackQuery(callbackQuery.id);
    
    // Handle different button actions
    switch (data) {
        case 'play_game':
            handlePlayGame(chatId, userId);
            break;
        case 'deposit':
            handleDeposit(chatId, userId);
            break;
        case 'withdraw':
            handleWithdraw(chatId, userId);
            break;
        case 'profile':
            handleProfile(chatId, userId);
            break;
        case 'share':
            handleShareAndEarn(chatId, userId);
            break;
        // Deposit method selection
        case 'deposit_bank':
            startBankDeposit(chatId, userId);
            break;
        case 'deposit_upi':
            startUpiDeposit(chatId, userId);
            break;
        case 'deposit_crypto':
            startCryptoDeposit(chatId, userId);
            break;
        // Withdrawal method selection
        case 'withdraw_bank':
            startBankWithdrawal(chatId, userId);
            break;
        case 'withdraw_upi':
            startUpiWithdrawal(chatId, userId);
            break;
        case 'withdraw_crypto':
            startCryptoWithdrawal(chatId, userId);
            break;
        // Profile options
        case 'inr_wallet':
            showInrWallet(chatId, userId);
            break;
        case 'crypto_wallet':
            showCryptoWallet(chatId, userId);
            break;
        case 'transaction_history':
            showTransactionHistory(chatId, userId);
            break;
        // Admin panel options
        case 'admin_panel':
            if (userId.toString() === OWNER_ID) {
                showAdminPanel(chatId);
            }
            break;
        case 'admin_withdrawals':
            if (userId.toString() === OWNER_ID) {
                handlePendingWithdrawals(chatId);
            }
            break;
        case 'admin_deposits':
            if (userId.toString() === OWNER_ID) {
                handleTodayDeposits(chatId);
            }
            break;
        case 'admin_users':
            if (userId.toString() === OWNER_ID) {
                handleUserManagement(chatId);
            }
            break;
        // Back to main menu
        case 'back_to_main':
            showMainMenu(chatId, userId);
            break;
        default:
            // Handle withdrawal approval
            if (data.startsWith('approve_withdrawal_')) {
                if (userId.toString() === OWNER_ID) {
                    const withdrawalId = data.replace('approve_withdrawal_', '');
                    approveWithdrawal(chatId, withdrawalId);
                }
            }
            // Handle user management
            else if (data.startsWith('manage_user_')) {
                if (userId.toString() === OWNER_ID) {
                    const targetUserId = data.replace('manage_user_', '');
                    showUserDetails(chatId, targetUserId);
                }
            }
            break;
    }
});

// Show main menu
function showMainMenu(chatId, userId) {
    const user = userDatabase.users[userId];
    
    // Check if user is owner to show admin button
    const isOwner = userId.toString() === OWNER_ID;
    
    bot.sendMessage(chatId, 
        `Hello ${user.name}! What would you like to do today?`, 
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🎮 Play Game', callback_data: 'play_game' }],
                    [{ text: '💰 Deposit', callback_data: 'deposit' }, { text: '💸 Withdraw', callback_data: 'withdraw' }],
                    [{ text: '👤 Profile', callback_data: 'profile' }, { text: '🔄 Share & Earn', callback_data: 'share' }],
                    ...(isOwner ? [[{ text: '🔐 Admin Panel', callback_data: 'admin_panel' }]] : [])
                ]
            }
        }
    );
}

// Play Game Handler
function handlePlayGame(chatId, userId) {
    // Get the user data to pass to the game
    const user = userDatabase.users[userId] || { inrBalance: 0, cryptoBalance: 0 };
    
    // Create a unique session token for this user
    const sessionToken = Buffer.from(`${userId}-${Date.now()}`).toString('base64');
    
    // The actual URL of your deployed betting app
    const gameUrl = 'https://my-betting-app.vercel.app';
    
    bot.sendMessage(chatId, 
        `🎮 Opening the game... Get ready to play and win big!
        
Your current balance:
INR: ₹${user.inrBalance.toFixed(2)}
Crypto: ${user.cryptoBalance.toFixed(6)} BTC`, 
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🎲 Launch Game', web_app: { url: `${gameUrl}?token=${sessionToken}&userId=${userId}` } }],
                    [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
                ]
            }
        }
    );
}

// Deposit Handler
function handleDeposit(chatId, userId) {
    bot.sendMessage(chatId, 
        `💰 *Deposit Funds*\n\nChoose your preferred deposit method:`, 
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🏦 Bank & UPI', callback_data: 'deposit_bank_upi' }],
                    [{ text: '💎 Crypto', callback_data: 'deposit_crypto' }],
                    [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
                ]
            }
        }
    );
}

// Bank & UPI Deposit Selection
bot.on('callback_query', async (callbackQuery) => {
    if (callbackQuery.data === 'deposit_bank_upi') {
        const chatId = callbackQuery.message.chat.id;
        
        bot.answerCallbackQuery(callbackQuery.id);
        bot.sendMessage(chatId, 
            `Choose your deposit method:`, 
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🏦 Bank Transfer', callback_data: 'deposit_bank' }],
                        [{ text: '📱 UPI', callback_data: 'deposit_upi' }],
                        [{ text: '◀️ Back', callback_data: 'deposit' }]
                    ]
                }
            }
        );
    }
});

// Bank Deposit Process
function startBankDeposit(chatId, userId) {
    // Set user state for conversation flow
    userDatabase.users[userId].state = 'waiting_bank_deposit_amount';
    
    bot.sendMessage(chatId, 
        `🏦 *Bank Deposit*\n\nPlease enter the amount you wish to deposit:`, 
        { parse_mode: 'Markdown' }
    );
}

// UPI Deposit Process
function startUpiDeposit(chatId, userId) {
    // Set user state for conversation flow
    userDatabase.users[userId].state = 'waiting_upi_deposit_amount';
    
    bot.sendMessage(chatId, 
        `📱 *UPI Deposit*\n\nPlease enter the amount you wish to deposit:`, 
        { parse_mode: 'Markdown' }
    );
}

// Crypto Deposit Process
function startCryptoDeposit(chatId, userId) {
    // Set user state for conversation flow
    userDatabase.users[userId].state = 'waiting_crypto_deposit_amount';
    
    bot.sendMessage(chatId, 
        `💎 *Crypto Deposit*\n\nPlease enter the amount you wish to deposit (in USD):`, 
        { parse_mode: 'Markdown' }
    );
}

// Withdraw Handler
function handleWithdraw(chatId, userId) {
    bot.sendMessage(chatId, 
        `💸 *Withdraw Funds*\n\nChoose your preferred withdrawal method:`, 
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🏦 Bank & UPI', callback_data: 'withdraw_bank_upi' }],
                    [{ text: '💎 Crypto', callback_data: 'withdraw_crypto' }],
                    [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
                ]
            }
        }
    );
}

// Function to process withdrawal request (to be called after user enters withdrawal details)
function processWithdrawalRequest(chatId, userId, method, amount, accountDetails) {
    const user = userDatabase.users[userId];
    
    // Check if user has sufficient balance
    if (user.inrBalance < amount) {
        bot.sendMessage(chatId, "Insufficient balance for withdrawal.");
        return;
    }
    
    // Create a pending withdrawal request
    const withdrawalId = Date.now().toString();
    const withdrawal = {
        id: withdrawalId,
        userId: userId,
        method: method,
        amount: amount,
        accountDetails: accountDetails,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    
    // Add to pending withdrawals
    userDatabase.pendingWithdrawals.push(withdrawal);
    
    // Notify user
    bot.sendMessage(chatId, `Your withdrawal request of ₹${amount} via ${method} has been submitted and is pending approval.`);
    
    // Notify owner
    if (OWNER_ID) {
        const ownerMessage = `New withdrawal request:\nUser ID: ${userId}\nAmount: ₹${amount}\nMethod: ${method}\nAccount: ${JSON.stringify(accountDetails)}`;
        bot.sendMessage(OWNER_ID, ownerMessage, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ Approve', callback_data: `approve_withdrawal_${withdrawalId}` }],
                    [{ text: '🔐 Admin Panel', callback_data: 'admin_panel' }]
                ]
            }
        });
    }
}

// Bank & UPI Withdrawal Selection
bot.on('callback_query', async (callbackQuery) => {
    if (callbackQuery.data === 'withdraw_bank_upi') {
        const chatId = callbackQuery.message.chat.id;
        
        bot.answerCallbackQuery(callbackQuery.id);
        bot.sendMessage(chatId, 
            `Choose your withdrawal method:`, 
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🏦 Bank Transfer', callback_data: 'withdraw_bank' }],
                        [{ text: '📱 UPI', callback_data: 'withdraw_upi' }],
                        [{ text: '◀️ Back', callback_data: 'withdraw' }]
                    ]
                }
            }
        );
    }
});

// Bank Withdrawal Process
function startBankWithdrawal(chatId, userId) {
    // Set user state for conversation flow
    userDatabase.users[userId].state = 'waiting_bank_mobile';
    
    bot.sendMessage(chatId, 
        `🏦 *Bank Withdrawal*\n\nPlease enter your mobile number:`, 
        { parse_mode: 'Markdown' }
    );
}

// UPI Withdrawal Process
function startUpiWithdrawal(chatId, userId) {
    // Set user state for conversation flow
    userDatabase.users[userId].state = 'waiting_upi_mobile';
    
    bot.sendMessage(chatId, 
        `📱 *UPI Withdrawal*\n\nPlease enter your mobile number:`, 
        { parse_mode: 'Markdown' }
    );
}

// Crypto Withdrawal Process
function startCryptoWithdrawal(chatId, userId) {
    // Set user state for conversation flow
    userDatabase.users[userId].state = 'waiting_crypto_address';
    
    bot.sendMessage(chatId, 
        `💎 *Crypto Withdrawal*\n\nPlease enter your wallet address:`, 
        { parse_mode: 'Markdown' }
    );
}

// Profile Handler
function handleProfile(chatId, userId) {
    const user = userDatabase.users[userId];
    
    bot.sendMessage(chatId, 
        `👤 *Your Profile*\n\nName: ${user.name}\nTelegram ID: ${user.telegramId}\n\nSelect an option to view more details:`, 
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💵 INR/USD Wallet', callback_data: 'inr_wallet' }],
                    [{ text: '💎 Crypto Wallet', callback_data: 'crypto_wallet' }],
                    [{ text: '📜 Transaction History', callback_data: 'transaction_history' }],
                    [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
                ]
            }
        }
    );
}

// Show INR Wallet
function showInrWallet(chatId, userId) {
    const user = userDatabase.users[userId];
    
    bot.sendMessage(chatId, 
        `💵 *INR/USD Wallet*\n\nCurrent Balance: ₹${user.inrBalance.toFixed(2)}\n\nYou can deposit or withdraw funds from the main menu.`, 
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💰 Deposit', callback_data: 'deposit' }, { text: '💸 Withdraw', callback_data: 'withdraw' }],
                    [{ text: '◀️ Back to Profile', callback_data: 'profile' }]
                ]
            }
        }
    );
}

// Show Crypto Wallet
function showCryptoWallet(chatId, userId) {
    const user = userDatabase.users[userId];
    
    bot.sendMessage(chatId, 
        `💎 *Crypto Wallet*\n\nCurrent Balance: ${user.cryptoBalance.toFixed(8)} BTC\n\nYou can deposit or withdraw crypto from the main menu.`, 
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💰 Deposit', callback_data: 'deposit' }, { text: '💸 Withdraw', callback_data: 'withdraw' }],
                    [{ text: '◀️ Back to Profile', callback_data: 'profile' }]
                ]
            }
        }
    );
}

// Show Transaction History
function showTransactionHistory(chatId, userId) {
    const user = userDatabase.users[userId];
    
    // Get user's transactions (in a real app, this would be fetched from a database)
    const transactions = userDatabase.transactions.filter(tx => tx.userId === userId);
    
    let message = `📜 *Transaction History*\n\n`;
    
    if (transactions.length === 0) {
        message += `No transactions found.`;
    } else {
        transactions.slice(0, 5).forEach((tx, index) => {
            message += `${index + 1}. ${tx.type} - ${tx.amount} ${tx.currency} - ${tx.status}\n   Date: ${tx.date}\n   ID: ${tx.code}\n\n`;
        });
    }
    
    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '◀️ Back to Profile', callback_data: 'profile' }]
            ]
        }
    });
}

// Share and Earn Handler
function handleShareAndEarn(chatId, userId) {
    const user = userDatabase.users[userId];
    const referralCode = `REF${userId}`;
    
    // Store referral code
    userDatabase.referrals[referralCode] = userId;
    
    const shareMessage = `🎮 *Join me on Betting App!*\n\nPlay exciting games and win real money! Use my referral code: ${referralCode}\n\nhttps://t.me/your_betting_bot?start=${referralCode}`;
    
    bot.sendMessage(chatId, 
        `🔄 *Share & Earn*\n\nShare the app with your friends and earn rewards!\n\nYour unique referral code: ${referralCode}\n\nForward the message below to your friends:`, 
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📤 Share with Friends', switch_inline_query: shareMessage }],
                    [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
                ]
            }
        }
    );
    
    // Send the shareable message
    bot.sendMessage(chatId, shareMessage, { parse_mode: 'Markdown' });
}

// Message handler for user inputs
bot.on('message', (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text;
        
        // Get user from database
        const user = userDatabase.users[userId];
        
        if (!user) {
            bot.sendMessage(chatId, 'Please start the bot with /start command first.');
            return;
        }
        
        // Handle different conversation states
        switch (user.state) {
            // Bank Deposit Flow
            case 'waiting_bank_deposit_amount':
                handleBankDepositAmount(chatId, userId, text);
                break;
                
            // UPI Deposit Flow
            case 'waiting_upi_deposit_amount':
                handleUpiDepositAmount(chatId, userId, text);
                break;
                
            // Crypto Deposit Flow
            case 'waiting_crypto_deposit_amount':
                handleCryptoDepositAmount(chatId, userId, text);
                break;
                
            // Bank Withdrawal Flow
            case 'waiting_bank_mobile':
                user.withdrawalData = { mobile: text };
                user.state = 'waiting_bank_holder_name';
                bot.sendMessage(chatId, 'Please enter the bank account holder name:');
                break;
                
            case 'waiting_bank_holder_name':
                user.withdrawalData.holderName = text;
                user.state = 'waiting_bank_name';
                bot.sendMessage(chatId, 'Please enter the bank name:');
                break;
                
            case 'waiting_bank_name':
                user.withdrawalData.bankName = text;
                user.state = 'waiting_bank_account';
                bot.sendMessage(chatId, 'Please enter the bank account number:');
                break;
                
            case 'waiting_bank_account':
                user.withdrawalData.accountNumber = text;
                user.state = 'waiting_bank_ifsc';
                bot.sendMessage(chatId, 'Please enter the IFSC code:');
                break;
                
            case 'waiting_bank_ifsc':
                user.withdrawalData.ifscCode = text;
                user.state = 'waiting_bank_amount';
                bot.sendMessage(chatId, 'Please enter the amount to withdraw:');
                break;
                
            case 'waiting_bank_amount':
                handleBankWithdrawalAmount(chatId, userId, text);
                break;
                
            // UPI Withdrawal Flow
            case 'waiting_upi_mobile':
                user.withdrawalData = { mobile: text };
                user.state = 'waiting_upi_id';
                bot.sendMessage(chatId, 'Please enter your UPI ID:');
                break;
                
            case 'waiting_upi_id':
                user.withdrawalData.upiId = text;
                user.state = 'waiting_upi_amount';
                bot.sendMessage(chatId, 'Please enter the amount to withdraw:');
                break;
                
            case 'waiting_upi_amount':
                handleUpiWithdrawalAmount(chatId, userId, text);
                break;
                
            // Crypto Withdrawal Flow
            case 'waiting_crypto_address':
                user.withdrawalData = { address: text };
                user.state = 'waiting_crypto_amount';
                bot.sendMessage(chatId, 'Please enter the amount to withdraw (in BTC):');
                break;
                
            case 'waiting_crypto_amount':
                handleCryptoWithdrawalAmount(chatId, userId, text);
                break;
                
            default:
                // If no active conversation, just show a generic message
                bot.sendMessage(chatId, 'Please use the buttons to navigate through the bot.');
                break;
        }
    }
});

// Handle Bank Deposit Amount
function handleBankDepositAmount(chatId, userId, amountText) {
    const amount = parseFloat(amountText);
    
    if (isNaN(amount) || amount <= 0) {
        bot.sendMessage(chatId, 'Please enter a valid amount.');
        return;
    }
    
    const user = userDatabase.users[userId];
    const transactionCode = generateTransactionCode();
    
    // Create transaction record
    const transaction = {
        userId: userId,
        code: transactionCode,
        type: 'Bank Deposit',
        amount: amount,
        currency: 'INR',
        status: 'Pending',
        date: new Date().toLocaleString()
    };
    
    userDatabase.transactions.push(transaction);
    
    // Reset user state
    user.state = null;
    
    // Send confirmation with bank details
    const message = `
🏦 *Bank Deposit Initiated*

Amount: ₹${amount.toFixed(2)}
Transaction Code: \`${transactionCode}\`

Please transfer the amount to the following bank account within 10 minutes:

Account Name: ${bankDetails.accountName}
Account Number: ${bankDetails.accountNumber}
Bank Name: ${bankDetails.bankName}
IFSC Code: ${bankDetails.ifscCode}

⚠️ *Important*:
- This transaction code is valid for 10 minutes only
- Include the transaction code in the payment reference
- After payment, save your transaction code to track your deposit

Once we verify your payment, the amount will be credited to your wallet.
    `;
    
    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
            ]
        }
    });
}

// Handle UPI Deposit Amount
function handleUpiDepositAmount(chatId, userId, amountText) {
    const amount = parseFloat(amountText);
    
    if (isNaN(amount) || amount <= 0) {
        bot.sendMessage(chatId, 'Please enter a valid amount.');
        return;
    }
    
    const user = userDatabase.users[userId];
    const transactionCode = generateTransactionCode();
    
    // Create transaction record
    const transaction = {
        userId: userId,
        code: transactionCode,
        type: 'UPI Deposit',
        amount: amount,
        currency: 'INR',
        status: 'Pending',
        date: new Date().toLocaleString()
    };
    
    userDatabase.transactions.push(transaction);
    
    // Reset user state
    user.state = null;
    
    // Send confirmation with UPI details
    const message = `
📱 *UPI Deposit Initiated*

Amount: ₹${amount.toFixed(2)}
Transaction Code: \`${transactionCode}\`

Please transfer the amount to the following UPI ID within 10 minutes:

UPI ID: ${upiDetails.upiId}

⚠️ *Important*:
- This transaction code is valid for 10 minutes only
- Include the transaction code in the payment reference
- After payment, save your transaction code to track your deposit

Once we verify your payment, the amount will be credited to your wallet.
    `;
    
    // Send UPI QR code
    bot.sendPhoto(chatId, upiDetails.qrCodeUrl, {
        caption: message,
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
            ]
        }
    });
}

// Handle Crypto Deposit Amount
function handleCryptoDepositAmount(chatId, userId, amountText) {
    const amount = parseFloat(amountText);
    
    if (isNaN(amount) || amount <= 0) {
        bot.sendMessage(chatId, 'Please enter a valid amount.');
        return;
    }
    
    const user = userDatabase.users[userId];
    const transactionCode = generateTransactionCode();
    
    // Create transaction record
    const transaction = {
        userId: userId,
        code: transactionCode,
        type: 'Crypto Deposit',
        amount: amount,
        currency: 'USD',
        status: 'Pending',
        date: new Date().toLocaleString()
    };
    
    userDatabase.transactions.push(transaction);
    
    // Reset user state
    user.state = null;
    
    // Send confirmation with crypto wallet details
    const message = `
💎 *Crypto Deposit Initiated*

Amount: $${amount.toFixed(2)}
Transaction Code: \`${transactionCode}\`

Please transfer the equivalent amount in BTC to the following wallet address within 10 minutes:

BTC Address: \`${cryptoWallet.btcAddress}\`

⚠️ *Important*:
- This transaction code is valid for 10 minutes only
- Save your transaction code to track your deposit
- After payment, you can use this code to verify your transaction

Once we verify your payment, the amount will be credited to your wallet.
    `;
    
    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
            ]
        }
    });
}

// Handle Bank Withdrawal Amount
function handleBankWithdrawalAmount(chatId, userId, amountText) {
    const amount = parseFloat(amountText);
    
    if (isNaN(amount) || amount <= 0) {
        bot.sendMessage(chatId, 'Please enter a valid amount.');
        return;
    }
    
    const user = userDatabase.users[userId];
    
    // Check if user has sufficient balance
    if (amount > user.inrBalance) {
        bot.sendMessage(chatId, 
            `❌ *Insufficient Balance*\n\nYour current balance is ₹${user.inrBalance.toFixed(2)}, which is less than the requested withdrawal amount.`, 
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
                    ]
                }
            }
        );
        return;
    }
    
    // Process withdrawal
    const transactionCode = generateTransactionCode();
    
    // Create transaction record
    const transaction = {
        userId: userId,
        code: transactionCode,
        type: 'Bank Withdrawal',
        amount: amount,
        currency: 'INR',
        status: 'Processing',
        date: new Date().toLocaleString()
    };
    
    userDatabase.transactions.push(transaction);
    
    // Deduct from user balance
    user.inrBalance -= amount;
    
    // Reset user state
    user.state = null;
    
    // Send confirmation
    const message = `
🏦 *Bank Withdrawal Initiated*

Amount: ₹${amount.toFixed(2)}
Transaction Code: \`${transactionCode}\`

Your withdrawal request has been received and is being processed. The funds will be transferred to:

Account Holder: ${user.withdrawalData.holderName}
Bank Name: ${user.withdrawalData.bankName}
Account Number: ${user.withdrawalData.accountNumber}
IFSC Code: ${user.withdrawalData.ifscCode}
Mobile: ${user.withdrawalData.mobile}

You can track the status of your withdrawal using the transaction code.
    `;
    
    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
            ]
        }
    });
}

// Handle UPI Withdrawal Amount
function handleUpiWithdrawalAmount(chatId, userId, amountText) {
    const amount = parseFloat(amountText);
    
    if (isNaN(amount) || amount <= 0) {
        bot.sendMessage(chatId, 'Please enter a valid amount.');
        return;
    }
    
    const user = userDatabase.users[userId];
    
    // Check if user has sufficient balance
    if (amount > user.inrBalance) {
        bot.sendMessage(chatId, 
            `❌ *Insufficient Balance*\n\nYour current balance is ₹${user.inrBalance.toFixed(2)}, which is less than the requested withdrawal amount.`, 
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
                    ]
                }
            }
        );
        return;
    }
    
    // Process withdrawal
    const transactionCode = generateTransactionCode();
    
    // Create transaction record
    const transaction = {
        userId: userId,
        code: transactionCode,
        type: 'UPI Withdrawal',
        amount: amount,
        currency: 'INR',
        status: 'Processing',
        date: new Date().toLocaleString()
    };
    
    userDatabase.transactions.push(transaction);
    
    // Deduct from user balance
    user.inrBalance -= amount;
    
    // Reset user state
    user.state = null;
    
    // Send confirmation
    const message = `
📱 *UPI Withdrawal Initiated*

Amount: ₹${amount.toFixed(2)}
Transaction Code: \`${transactionCode}\`

Your withdrawal request has been received and is being processed. The funds will be transferred to:

UPI ID: ${user.withdrawalData.upiId}
Mobile: ${user.withdrawalData.mobile}

You can track the status of your withdrawal using the transaction code.
    `;
    
    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
            ]
        }
    });
}

// Handle Crypto Withdrawal Amount
function handleCryptoWithdrawalAmount(chatId, userId, amountText) {
    const amount = parseFloat(amountText);
    
    if (isNaN(amount) || amount <= 0) {
        bot.sendMessage(chatId, 'Please enter a valid amount.');
        return;
    }
    
    const user = userDatabase.users[userId];
    
    // Check if user has sufficient balance
    if (amount > user.cryptoBalance) {
        bot.sendMessage(chatId, 
            `❌ *Insufficient Balance*\n\nYour current balance is ${user.cryptoBalance.toFixed(8)} BTC, which is less than the requested withdrawal amount.`, 
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
                    ]
                }
            }
        );
        return;
    }
    
    // Process withdrawal
    const transactionCode = generateTransactionCode();
    
    // Create transaction record
    const transaction = {
        userId: userId,
        code: transactionCode,
        type: 'Crypto Withdrawal',
        amount: amount,
        currency: 'BTC',
        status: 'Processing',
        date: new Date().toLocaleString()
    };
    
    userDatabase.transactions.push(transaction);
    
    // Deduct from user balance
    user.cryptoBalance -= amount;
    
    // Reset user state
    user.state = null;
    
    // Send confirmation
    const message = `
💎 *Crypto Withdrawal Initiated*

Amount: ${amount.toFixed(8)} BTC
Transaction Code: \`${transactionCode}\`

Your withdrawal request has been received and is being processed. The funds will be transferred to:

Wallet Address: ${user.withdrawalData.address}

You can track the status of your withdrawal using the transaction code.
    `;
    
    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '◀️ Back to Menu', callback_data: 'back_to_main' }]
            ]
        }
    });
}

// Export the bot for use in other files
module.exports = bot;