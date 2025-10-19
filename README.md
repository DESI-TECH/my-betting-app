# Betting App Telegram Bot

A Telegram bot for a betting application with admin features.

## Setup Instructions

1. Clone this repository
2. Create a `.env` file with the following variables:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token
   OWNER_ID=your_telegram_id
   NODE_ENV=development
   APP_URL=your_app_url (for production)
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the application:
   ```
   npm start
   ```

## Deployment Options

### Heroku Deployment
1. Create a Heroku account
2. Install Heroku CLI
3. Login to Heroku: `heroku login`
4. Create a new app: `heroku create your-app-name`
5. Set environment variables:
   ```
   heroku config:set TELEGRAM_BOT_TOKEN=your_bot_token
   heroku config:set OWNER_ID=your_telegram_id
   heroku config:set NODE_ENV=production
   heroku config:set APP_URL=https://your-app-name.herokuapp.com
   ```
6. Deploy: `git push heroku main`

### Railway Deployment
1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Deploy automatically from your repository

### DigitalOcean Deployment
1. Create a Droplet
2. Clone repository to the server
3. Install dependencies: `npm install`
4. Use PM2 to manage the process: `pm2 start server.js`

## Features
- User authentication
- Game playing
- Deposits and withdrawals
- User profiles
- Referral system
- Admin panel (owner-only)
  - Withdrawal approvals
  - Daily deposits report
  - User management