#!/bin/bash
echo "🛑 Stopping Ather Intelligence Services..."

pkill -f "server.py"
pkill -f "proactive_agent.py"
pkill -f "telegram_bot.py"

echo "✅ All services stopped."
