#!/bin/bash

# VeridiFi Green Treasury - Quick Start Script
# This script helps you start the entire application

set -e

echo "============================================================"
echo "🌱 VeridiFi Green Treasury - Quick Start"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Step 1: Check dependencies
echo -e "${YELLOW}📦 Step 1: Checking dependencies...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

# Check Yarn
if ! command -v yarn &> /dev/null; then
    echo -e "${RED}❌ Yarn is not installed. Install it: npm install -g yarn${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies check passed${NC}"
echo ""

# Step 2: Install Node.js dependencies
echo -e "${YELLOW}📦 Step 2: Installing Node.js dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    yarn install
    echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Node.js dependencies already installed${NC}"
fi
echo ""

# Step 3: Install Python dependencies
echo -e "${YELLOW}📦 Step 3: Installing Python dependencies...${NC}"
cd agents
if ! python3 -c "import flask" 2>/dev/null; then
    pip3 install -r requirements.txt
    echo -e "${GREEN}✅ Python dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Python dependencies already installed${NC}"
fi
cd ..
echo ""

# Step 4: Check .env file
echo -e "${YELLOW}📋 Step 4: Checking configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}⚠️  Warning: .env file not found${NC}"
    echo "   Please create a .env file with required configuration"
    echo "   See COMPLETE_SETUP_GUIDE.md for details"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi
echo ""

# Step 5: Verify contracts (optional)
echo -e "${YELLOW}🔍 Step 5: Verifying contracts (optional)...${NC}"
read -p "Run contract diagnostics? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd agents
    python3 diagnose_contracts.py
    cd ..
fi
echo ""

# Step 6: Start services
echo -e "${YELLOW}🚀 Step 6: Starting services...${NC}"
echo ""
echo "Choose what to start:"
echo "  1) Dashboard only (http://localhost:3000)"
echo "  2) Agents only (terminal output)"
echo "  3) Both Dashboard and Agents"
echo "  4) Exit"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}🚀 Starting Dashboard...${NC}"
        echo "   Dashboard will be available at: http://localhost:3000"
        echo "   Press Ctrl+C to stop"
        echo ""
        cd agents
        python3 dashboard_server.py
        ;;
    2)
        echo ""
        echo -e "${GREEN}🚀 Starting Agents...${NC}"
        echo "   Watch the terminal for live agent output"
        echo "   Press Ctrl+C to stop"
        echo ""
        cd agents
        python3 green_treasury_swarm.py
        ;;
    3)
        echo ""
        echo -e "${GREEN}🚀 Starting Dashboard and Agents...${NC}"
        echo ""
        echo "   Opening Dashboard in background..."
        cd agents
        python3 dashboard_server.py &
        DASHBOARD_PID=$!
        echo "   Dashboard PID: $DASHBOARD_PID"
        echo "   Dashboard available at: http://localhost:3000"
        echo ""
        sleep 2
        echo "   Starting Agents..."
        echo "   Press Ctrl+C to stop both"
        echo ""
        python3 green_treasury_swarm.py
        kill $DASHBOARD_PID 2>/dev/null || true
        ;;
    4)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

