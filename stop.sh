#!/bin/bash
echo "🛑 Stopping Ather Intelligence Services..."

# Kill by filename to be specific
pkill -f "server.py"
pkill -f "proactive_agent.py"
pkill -f "telegram_bot.py"

# Also kill by port just in case
fuser -k 8001/tcp &> /dev/null || true

echo "✅ All services stopped."
