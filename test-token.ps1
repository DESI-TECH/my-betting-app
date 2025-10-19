# Simple script to test Telegram bot token
$token = "8221041221:AAENjXjweqFZEXP0vl-1bYVGmRKcSWUviR0"

Write-Host "Testing Telegram bot token..."

try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getMe" -Method Get
    
    if ($response.ok) {
        Write-Host "SUCCESS: Bot is connected to Telegram!"
        Write-Host "Bot name: $($response.result.first_name)"
        Write-Host "Bot username: @$($response.result.username)"
        
        # Send a test message to activate the bot
        Write-Host "Sending a test message to activate the bot..."
        $sendMessageResponse = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method Post -Body @{
            chat_id = "6206420660"  # OWNER_ID from .env
            text = "Bot activation test: Your bot is now active and ready to receive commands!"
        }
        
        if ($sendMessageResponse.ok) {
            Write-Host "SUCCESS: Test message sent! Check your Telegram app."
        }
    } else {
        Write-Host "ERROR: Bot connection failed. Invalid token."
    }
} catch {
    Write-Host "ERROR: Failed to connect to Telegram API. Check your internet connection and token."
}