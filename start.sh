#!/bin/bash
# ============================================
#  Ather Voice Intelligence - Startup Script
#  Starts all services in one command
# ============================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "🚀 Ather Voice Intelligence - Starting Up..."
echo "   Project: $PROJECT_DIR"
echo ""

# 1. Check .env exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "❌ ERROR: .env file not found!"
    echo "   Create $PROJECT_DIR/.env with:"
    echo "   SARVAM_API_KEY=your_key"
    echo "   TELEGRAM_BOT_TOKEN=your_token"
    exit 1
fi

# 2. Create runtime directories
mkdir -p "$PROJECT_DIR/calls"
chmod 777 "$PROJECT_DIR/calls" 2>/dev/null || true

# 3. Deploy voice agent to Asterisk
echo "📞 Deploying Voice Agent to Asterisk..."
sudo cp "$PROJECT_DIR/voice_agent.py" /usr/share/asterisk/agi-bin/
sudo chmod +x /usr/share/asterisk/agi-bin/voice_agent.py
echo "   ✅ Voice Agent deployed"

# 4. Copy Asterisk configs (if not already configured)
if [ -f "$PROJECT_DIR/extensions.conf" ]; then
    echo "📋 Deploying Asterisk configs..."
    sudo cp "$PROJECT_DIR/extensions.conf" /etc/asterisk/extensions.conf
    sudo cp "$PROJECT_DIR/pjsip.conf" /etc/asterisk/pjsip.conf
    sudo asterisk -rx "dialplan reload" 2>/dev/null || true
    echo "   ✅ Asterisk configs deployed"
fi

# 5. Kill any existing bot instances
pkill -f "telegram_bot.py" 2>/dev/null || true
sleep 1

# 6. Start Telegram Bot in background
echo "🤖 Starting Telegram Bot..."
cd "$PROJECT_DIR"
nohup python3 -u "$PROJECT_DIR/telegram_bot.py" > "$PROJECT_DIR/bot.log" 2>&1 &
TELEGRAM_PID=$!
echo "   ✅ Telegram Bot started (PID: $TELEGRAM_PID)"

# 7. Start Dashboard in background
echo "🌐 Starting Dashboard on port 8000..."
cd "$PROJECT_DIR/dashboard"
nohup python3 -m http.server 8000 > /dev/null 2>&1 &
DASHBOARD_PID=$!
echo "   ✅ Dashboard started (PID: $DASHBOARD_PID)"

echo ""
echo "============================================"
echo "  🎉 All services are running!"
echo "============================================"
echo ""
echo "  📞 Voice Agent:  Dial 3000 from SIP phone"
echo "  🤖 Telegram Bot: t.me/athervoicebot"
echo "  🌐 Dashboard:    http://localhost:8000"
echo "  📁 Call Logs:     $PROJECT_DIR/calls/"
echo "  🧠 Knowledge:    $PROJECT_DIR/knowledge_graph.json"
echo ""
echo "  To stop all services:"
echo "    pkill -f telegram_bot.py"
echo "    pkill -f 'http.server 8000'"
echo ""
