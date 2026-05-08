#!/bin/bash

# Ather AI Intelligence System - Startup Script
# This script starts the Dashboard API server and ensures all directories are ready.

echo "🚀 Starting Ather AI Intelligence System..."

# 1. Ensure required directories exist
mkdir -p leads calls users service

# 2. Check for dependencies
if ! command -v python3 &> /dev/null
then
    echo "❌ Error: python3 is not installed."
    exit 1
fi

# 3. Kill any existing instances on port 8001
echo "🔄 Checking for existing processes on port 8001..."
fuser -k 8001/tcp &> /dev/null || true

# 4. Start the Dashboard Server
echo "🌐 Starting Dashboard & API Server on port 8001..."
python3 server.py &
SERVER_PID=$!

# 5. Wait for server to initialize
sleep 2

# 6. Display Status
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "✅ System is LIVE!"
echo "------------------------------------------------"
echo "🖥️  Dashboard URL: http://localhost:8001"
echo "📱 Network URL:   http://$LOCAL_IP:8001"
echo "🤖 API Endpoints: http://$LOCAL_IP:8001/api/leads"
echo "------------------------------------------------"
echo "Press Ctrl+C to stop the system."

# Keep script running to monitor server
wait $SERVER_PID
