# Start Dashboard - Quick Guide

## The Problem

The dashboard process stopped when the agents finished. You need to start it separately.

## Solution: Start Dashboard Manually

### Step 1: Open a Terminal

Make sure you're in the project directory:
```bash
cd /Users/zamirislamaj/Hackathons/ETHOxford2026/VeridiFi2/flare-hardhat-starter
```

### Step 2: Start the Dashboard

```bash
cd agents
python3 dashboard_server.py
```

### Step 3: Keep Terminal Open

**Important:** Keep this terminal window open! The dashboard runs in this terminal.

You should see:
```
============================================================
🌱 Green Treasury Dashboard Server
============================================================
Server running at: http://localhost:3000
Dashboard available at: http://localhost:3000
============================================================

 * Running on http://127.0.0.1:3000
```

### Step 4: Open Dashboard in Browser

Open: **http://localhost:3000**

## Alternative: Use the Start Script

```bash
cd agents
chmod +x start_dashboard.sh
./start_dashboard.sh
```

## What You'll See

Once running, the dashboard will:
- ✅ Show live price updates every 1.8 seconds
- ✅ Display carbon intensity data
- ✅ Show agent logs
- ✅ Have "Start Agents" and "Stop Agents" buttons

## To Stop

Press `Ctrl+C` in the terminal where the dashboard is running.

## Troubleshooting

### Port 3000 already in use?
```bash
# Kill any process using port 3000
kill -9 $(lsof -t -i:3000)
```

### Python errors?
```bash
cd agents
pip3 install -r requirements.txt
```

### Can't connect?
- Make sure the terminal shows "Running on http://127.0.0.1:3000"
- Check that no firewall is blocking port 3000
- Try `http://127.0.0.1:3000` instead of `localhost:3000`


