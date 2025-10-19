# PowerShell Telegram Bot Simulator
# This script simulates the functionality of the Telegram bot without requiring Node.js

Write-Host "Starting Telegram Bot Simulator..." -ForegroundColor Cyan

# Load token from .env file if it exists
$token = "5555555555:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" # Default token
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "TELEGRAM_BOT_TOKEN=(.*)") {
            $token = $matches[1]
        }
    }
}

# Initialize simulated database
$users = @{}
$transactions = @()

Write-Host "Bot initialized with token: $token" -ForegroundColor Green
Write-Host "Bot started successfully!" -ForegroundColor Green
Write-Host "Listening for commands..." -ForegroundColor Green

# Simulate user commands
function Simulate-Commands {
    Write-Host "`n--- Simulated Commands ---" -ForegroundColor Yellow
    
    # Simulate /start command
    Handle-Command "/start" @{id = 123456; username = "user123"}
    
    # Simulate /bet command
    Handle-Command "/bet 100 red" @{id = 123456; username = "user123"}
    
    # Simulate random bet
    Handle-Command "/random 50" @{id = 123456; username = "user123"}
    
    # Simulate /balance command
    Handle-Command "/balance" @{id = 123456; username = "user123"}
    
    # Simulate admin command
    Handle-Command "/admin" @{id = 123456; username = "user123"}
}

# Handle simulated commands
function Handle-Command($text, $user) {
    Write-Host "`nReceived command: $text from user: $($user.username)" -ForegroundColor Magenta
    
    if ($text -eq "/start") {
        Handle-Start $user
    } 
    elseif ($text -match "^/bet (\d+) (.+)$") {
        $amount = [int]$matches[1]
        $option = $matches[2]
        Handle-Bet $amount $option $user
    }
    elseif ($text -match "^/random (\d+)$") {
        $amount = [int]$matches[1]
        Handle-RandomBet $amount $user
    }
    elseif ($text -eq "/balance") {
        Handle-Balance $user
    }
    elseif ($text -eq "/admin") {
        Handle-Admin $user
    }
}

# Handle /start command
function Handle-Start($user) {
    if (-not $users.ContainsKey($user.id)) {
        $users[$user.id] = @{
            id = $user.id
            username = $user.username
            balance = 1000 # Demo balance
            bets = @()
        }
        Write-Host "Response: Welcome to the Betting Bot! Your account has been created with 1000 demo credits." -ForegroundColor Green
    } 
    else {
        Write-Host "Response: Welcome back $($user.username)! Your current balance is $($users[$user.id].balance) credits." -ForegroundColor Green
    }
}

# Handle /bet command
function Handle-Bet($amount, $option, $user) {
    if (-not $users.ContainsKey($user.id)) {
        Write-Host "Response: Please use /start to create an account first." -ForegroundColor Red
        return
    }

    if ($users[$user.id].balance -lt $amount) {
        Write-Host "Response: Insufficient balance. Your current balance is $($users[$user.id].balance) credits." -ForegroundColor Red
        return
    }

    # Process bet
    $users[$user.id].balance -= $amount
    
    # Simulate game result
    $win = (Get-Random -Minimum 0 -Maximum 100) -gt 50
    $winAmount = 0
    
    if ($win) {
        if ($option -eq "red" -or $option -eq "green") {
            $winAmount = $amount * 2
        } 
        elseif ($option -eq "violet") {
            $winAmount = $amount * 3
        } 
        else {
            $winAmount = $amount * 10
        }
        
        $users[$user.id].balance += $winAmount
        Write-Host "Response: 🎉 You won $winAmount credits! Your new balance is $($users[$user.id].balance) credits." -ForegroundColor Green
    } 
    else {
        Write-Host "Response: Better luck next time! Your new balance is $($users[$user.id].balance) credits." -ForegroundColor Yellow
    }
    
    # Record transaction
    $transactions += @{
        userId = $user.id
        type = "bet"
        amount = $amount
        option = $option
        result = if ($win) { "win" } else { "lose" }
        winAmount = $winAmount
        timestamp = Get-Date
    }
}

# Handle random bet command
function Handle-RandomBet($amount, $user) {
    if (-not $users.ContainsKey($user.id)) {
        Write-Host "Response: Please use /start to create an account first." -ForegroundColor Red
        return
    }

    # Generate random bet option
    $options = @("red", "green", "violet", "big", "small", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9")
    $randomOption = $options | Get-Random
    
    Write-Host "Response: 🎲 Random bet selected: $randomOption" -ForegroundColor Cyan
    
    # Process the bet
    Handle-Bet $amount $randomOption $user
}

# Handle /balance command
function Handle-Balance($user) {
    if (-not $users.ContainsKey($user.id)) {
        Write-Host "Response: Please use /start to create an account first." -ForegroundColor Red
        return
    }
    
    Write-Host "Response: Your current balance is $($users[$user.id].balance) credits." -ForegroundColor Green
}

# Handle /admin command
function Handle-Admin($user) {
    # In a real bot, we would check if the user is an admin
    Write-Host "Response: Admin Panel" -ForegroundColor Cyan
    Write-Host "Total Users: $($users.Count)" -ForegroundColor Cyan
    Write-Host "Total Transactions: $($transactions.Count)" -ForegroundColor Cyan
    
    # Show recent transactions
    if ($transactions.Count -gt 0) {
        Write-Host "`nRecent Transactions:" -ForegroundColor Cyan
        $transactions | Select-Object -Last 3 | ForEach-Object {
            Write-Host "- User $($_.userId): $($_.type) $($_.amount) on $($_.option), Result: $($_.result)" -ForegroundColor Cyan
        }
    }
}

# Run the simulation
Simulate-Commands

Write-Host "`n--- Bot Simulation Complete ---" -ForegroundColor Yellow
Write-Host "In a real environment, the bot would connect to the Telegram API and respond to actual messages." -ForegroundColor Yellow
Write-Host "The random betting feature has been integrated with the bot." -ForegroundColor Green