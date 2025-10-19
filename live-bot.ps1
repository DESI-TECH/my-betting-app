# Interactive Telegram Bot Simulator
# This script provides an interactive bot that responds to user commands

Write-Host "Starting Interactive Telegram Bot..." -ForegroundColor Cyan
Write-Host "Type commands to interact with the bot (e.g., /start, /bet 100 red, /random 50)" -ForegroundColor Yellow
Write-Host "Type 'exit' to quit the bot" -ForegroundColor Yellow
Write-Host ""

# Initialize simulated database
$users = @{}
$transactions = @()
$currentUser = @{id = 123456; username = "user123"}

# Create user account automatically
$users[$currentUser.id] = @{
    id = $currentUser.id
    username = $currentUser.username
    balance = 1000 # Demo balance
    bets = @()
}

Write-Host "Bot is ready! You are logged in as $($currentUser.username)" -ForegroundColor Green
Write-Host "Your starting balance is 1000 credits" -ForegroundColor Green
Write-Host ""

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

# Handle /help command
function Handle-Help {
    Write-Host "Available commands:" -ForegroundColor Cyan
    Write-Host "/start - Create an account or check your balance" -ForegroundColor Cyan
    Write-Host "/bet [amount] [option] - Place a bet (e.g., /bet 100 red)" -ForegroundColor Cyan
    Write-Host "/random [amount] - Place a random bet (e.g., /random 50)" -ForegroundColor Cyan
    Write-Host "/balance - Check your current balance" -ForegroundColor Cyan
    Write-Host "/admin - Access admin panel" -ForegroundColor Cyan
    Write-Host "/help - Show this help message" -ForegroundColor Cyan
    Write-Host "exit - Quit the bot" -ForegroundColor Cyan
}

# Interactive loop
while ($true) {
    Write-Host "> " -NoNewline -ForegroundColor Yellow
    $input = Read-Host
    
    if ($input -eq "exit") {
        Write-Host "Exiting bot. Goodbye!" -ForegroundColor Cyan
        break
    }
    
    if ($input -eq "/start") {
        Write-Host "Response: Welcome back $($currentUser.username)! Your current balance is $($users[$currentUser.id].balance) credits." -ForegroundColor Green
    }
    elseif ($input -match "^/bet (\d+) (.+)$") {
        $amount = [int]$matches[1]
        $option = $matches[2]
        Handle-Bet $amount $option $currentUser
    }
    elseif ($input -match "^/random (\d+)$") {
        $amount = [int]$matches[1]
        Handle-RandomBet $amount $currentUser
    }
    elseif ($input -eq "/balance") {
        Handle-Balance $currentUser
    }
    elseif ($input -eq "/admin") {
        Handle-Admin $currentUser
    }
    elseif ($input -eq "/help") {
        Handle-Help
    }
    else {
        Write-Host "Response: Unknown command. Type /help for available commands." -ForegroundColor Red
    }
    
    Write-Host ""
}