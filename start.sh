#!/bin/bash
# ========================================================
#  Ather Intelligence - Unified Master Startup Script
#  Launches: Dashboard, Proactive Outreach, Telegram Bot
# ========================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "🚀 Ather Intelligence Hub - Starting Up..."
echo "   Directory: $PROJECT_DIR"
echo ""

# 1. Check .env
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "❌ ERROR: .env file missing in $PROJECT_DIR"
    exit 1
fi

# 2. Deploy Voice Agent to Asterisk (Optional/Sudo)
echo "📞 Syncing Voice Agent to Asterisk (Attempting)..."
sudo cp "$PROJECT_DIR/voice_agent.py" /usr/share/asterisk/agi-bin/ 2>/dev/null || echo "   ⚠️ Skip sudo deploy"
sudo cp "$PROJECT_DIR/retail_agent_utils.py" /usr/share/asterisk/agi-bin/ 2>/dev/null || true
sudo chmod +x /usr/share/asterisk/agi-bin/voice_agent.py 2>/dev/null || true
echo "   ✅ Sync check complete"

# 3. Kill existing processes to avoid port conflicts
echo "🧹 Cleaning up old processes..."
pkill -f "server.py" 2>/dev/null || true
pkill -f "proactive_agent.py" 2>/dev/null || true
pkill -f "telegram_bot.py" 2>/dev/null || true
sleep 1

# 4. Start Dashboard
echo "🌐 Launching Premium Dashboard (Port 8000)..."
cd "$PROJECT_DIR/dashboard"
nohup python3 server.py > "$PROJECT_DIR/dashboard.log" 2>&1 &
echo "   ✅ Dashboard LIVE"

# 5. Start Proactive Outreach Agent
echo "🤖 Launching Proactive Outreach Agent..."
cd "$PROJECT_DIR"
nohup python3 -u proactive_agent.py > "$PROJECT_DIR/proactive.log" 2>&1 &
echo "   ✅ Outreach Agent LIVE"

# 6. Start Telegram Bot
echo "💬 Launching Customer Support Bot..."
nohup python3 -u telegram_bot.py > "$PROJECT_DIR/bot.log" 2>&1 &
echo "   ✅ Telegram Bot LIVE"

echo ""
echo "========================================================"
echo "  🎉 ATHER INTELLIGENCE SYSTEM IS NOW ONLINE!"
echo "========================================================"
echo ""
echo "  🌐 Dashboard:    http://localhost:8000"
echo "  🤖 Outreach:     Tracking via proactive.log"
echo "  📞 Voice:        Dial extension 3000"
echo "  📁 System Logs:  $PROJECT_DIR/*.log"
echo ""
echo "  Use 'pkill -f python3' to stop all services if needed."
echo "========================================================"
