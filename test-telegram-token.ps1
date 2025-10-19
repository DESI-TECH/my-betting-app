# PowerShell script to test Telegram bot token
$token = "8221041221:AAENjXjweqFZEXP0vl-1bYVGmRKcSWUviR0"

Write-Host "Testing Telegram bot token: $token"
Write-Host "Sending request to Telegram API..."

try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getMe" -Method Get
    
    if ($response.ok) {
        Write-Host "✅ Connection successful!" -ForegroundColor Green
        Write-Host "Bot information:" -ForegroundColor Green
        Write-Host "  Username: @$($response.result.username)" -ForegroundColor Green
        Write-Host "  Name: $($response.result.first_name)" -ForegroundColor Green
        Write-Host "  Bot ID: $($response.result.id)" -ForegroundColor Green
        
        # Now test if the bot can receive updates
        Write-Host "`nChecking for updates (messages sent to bot)..."
        $updatesResponse = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getUpdates" -Method Get
        
        if ($updatesResponse.ok) {
            if ($updatesResponse.result.Count -gt 0) {
                Write-Host "✅ Bot is receiving messages!" -ForegroundColor Green
                Write-Host "Latest messages:"
                foreach ($update in $updatesResponse.result | Select-Object -Last 5) {
                    if ($update.message) {
                        Write-Host "  From: $($update.message.from.first_name) ($($update.message.from.id))" -ForegroundColor Cyan
                        Write-Host "  Message: $($update.message.text)" -ForegroundColor Cyan
                        Write-Host "  Time: $([DateTimeOffset]::FromUnixTimeSeconds($update.message.date).LocalDateTime)" -ForegroundColor Cyan
                        Write-Host ""
                    }
                }
            } else {
                Write-Host "ℹ️ No messages received yet. Try sending a message to your bot and run this script again." -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "❌ Connection failed: $($response.description)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error connecting to Telegram API: $_" -ForegroundColor Red
    Write-Host "Please check if your token is correct and try again." -ForegroundColor Red
}

Write-Host "`nIf the connection was successful, your bot is properly configured."
Write-Host "If you're still having issues with your bot not responding, please check:"
Write-Host "1. Make sure your bot is running (node bot.js)"
Write-Host "2. Verify you've started a conversation with your bot on Telegram"
Write-Host "3. Check if your bot has the necessary permissions"