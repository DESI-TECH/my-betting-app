// Server for Betting App with Telegram Bot Integration
const express = require('express');
const path = require('path');

// Load environment variables
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv package not found, loading environment variables manually');
}

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const URL = process.env.APP_URL || `https://example.com`;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize bot in webhook or polling mode based on environment
let bot;
if (process.env.NODE_ENV === 'production') {
  // Webhook mode for production
  const TelegramBot = require('node-telegram-bot-api');
  bot = new TelegramBot(BOT_TOKEN);
  
  // Set webhook
  bot.setWebHook(`${URL}/bot${BOT_TOKEN}`);
  
  // Webhook endpoint
  app.post(`/bot${BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
  
  console.log('Bot started in webhook mode');
} else {
  // Polling mode for development
  console.log('Bot started in polling mode');
  // The bot will be initialized in bot.js
}

// Import bot functionality
require('./bot');

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});