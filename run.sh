#!/bin/bash

# Ather AI Intelligence System - Unified Master Startup Script
# This script starts the Dashboard, Proactive Agent, Telegram Bot and ensures Voice Agent is ready.

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "🚀 Starting Ather AI Intelligence System..."
echo "   Directory: $PROJECT_DIR"

# 1. Ensure required directories exist
mkdir -p "$PROJECT_DIR/leads" "$PROJECT_DIR/calls" "$PROJECT_DIR/users" "$PROJECT_DIR/service"

# 2. Check for dependencies
if [ ! -d "$PROJECT_DIR/venv" ]; then
    echo "❌ Error: Virtual environment (venv) not found. Please run environment setup first."
    exit 1
fi

# 3. Sync Voice Agent to Asterisk (Best effort)
echo "📞 Syncing Voice Agent to Asterisk (Attempting)..."
sudo cp "$PROJECT_DIR/voice_agent.py" /usr/share/asterisk/agi-bin/ 2>/dev/null || echo "   ⚠️ Skip sudo deploy (Voice Agent)"
sudo cp "$PROJECT_DIR/retail_agent_utils.py" /usr/share/asterisk/agi-bin/ 2>/dev/null || true
sudo chmod +x /usr/share/asterisk/agi-bin/voice_agent.py 2>/dev/null || true
echo "   ✅ Sync check complete"

# 4. Kill any existing instances to avoid port conflicts
echo "🔄 Cleaning up existing processes..."
fuser -k 8001/tcp &> /dev/null || true
pkill -f "server.py" &> /dev/null || true
pkill -f "proactive_agent.py" &> /dev/null || true
pkill -f "telegram_bot.py" &> /dev/null || true
sleep 1

# 5. Start the Components
echo "🌐 Starting Dashboard & API Server on port 8001..."
nohup "$PROJECT_DIR/venv/bin/python3" -u "$PROJECT_DIR/server.py" > "$PROJECT_DIR/dashboard.log" 2>&1 &

echo "🤖 Starting Proactive Outreach Agent..."
nohup "$PROJECT_DIR/venv/bin/python3" -u "$PROJECT_DIR/proactive_agent.py" > "$PROJECT_DIR/proactive.log" 2>&1 &

echo "💬 Starting Telegram Bot..."
nohup "$PROJECT_DIR/venv/bin/python3" -u "$PROJECT_DIR/telegram_bot.py" > "$PROJECT_DIR/bot.log" 2>&1 &

# 6. Wait for server to initialize
sleep 2

# 7. Display Status
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "✅ System is LIVE!"
echo "------------------------------------------------"
echo "🖥️  Dashboard URL: http://localhost:8001"
echo "📱 Network URL:   http://$LOCAL_IP:8001"
echo "🤖 API Endpoints: http://$LOCAL_IP:8001/api/leads"
echo "------------------------------------------------"
echo "Monitoring logs (Press Ctrl+C to stop the system)..."
echo ""

# Function to stop everything on exit
cleanup() {
    echo ""
    echo "🛑 Stopping Ather Intelligence Services..."
    pkill -f "server.py"
    pkill -f "proactive_agent.py"
    pkill -f "telegram_bot.py"
    echo "✅ All services stopped."
    exit
}

trap cleanup SIGINT SIGTERM

# Follow the logs to keep the script foregrounded
tail -f "$PROJECT_DIR/dashboard.log" "$PROJECT_DIR/proactive.log" "$PROJECT_DIR/bot.log"
