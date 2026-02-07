#!/bin/bash

# Green Treasury Dashboard Quick Start Script

echo "============================================================"
echo "🌱 Green Treasury Dashboard - Quick Start"
echo "============================================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check if we're in the agents directory
if [ ! -f "dashboard_server.py" ]; then
    echo "⚠️  Warning: dashboard_server.py not found in current directory"
    echo "   Make sure you're running this from the agents/ directory"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if .env file exists
if [ ! -f "../.env" ] && [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   The dashboard will use mock data if contracts are not configured"
    echo ""
fi

# Check if dependencies are installed
echo "📦 Checking dependencies..."
if ! python3 -c "import flask" 2>/dev/null; then
    echo "❌ Flask not installed. Installing dependencies..."
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies. Please run: pip install -r requirements.txt"
        exit 1
    fi
else
    echo "✅ Dependencies OK"
fi

echo ""
echo "🚀 Starting dashboard server..."
echo ""
echo "   Dashboard will be available at: http://localhost:3000"
echo "   Press Ctrl+C to stop the server"
echo ""
echo "============================================================"
echo ""

# Start the server
python3 dashboard_server.py

