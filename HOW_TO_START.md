# How to Start the Application

## 🚀 Quick Start (Easiest)

### Option 1: Use the Quick Start Script

```bash
./QUICK_START.sh
```

This will:
- ✅ Check dependencies
- ✅ Install missing packages
- ✅ Verify configuration
- ✅ Let you choose what to start

**Choose option 3** to start both Dashboard and Agents.

---

## 📋 Manual Start

### Step 1: Start the Dashboard

**Terminal 1:**
```bash
cd agents
python3 dashboard_server.py
```

The dashboard will be available at: **http://localhost:3000**

### Step 2: Start the Agents (Optional)

You can start agents in two ways:

**Option A: From Dashboard**
1. Open http://localhost:3000 in your browser
2. Click the **"Start Agents"** button

**Option B: From Terminal**
```bash
# In a new terminal window
cd agents
python3 green_treasury_swarm.py
```

---

## 🎯 Complete Startup Sequence

### Terminal 1: Dashboard
```bash
cd agents
python3 dashboard_server.py
```

### Terminal 2: Agents (Optional)
```bash
cd agents
python3 green_treasury_swarm.py
```

### Browser
Open: **http://localhost:3000**

---

## ✅ Quick Verification

Before starting, make sure:

1. **Dependencies installed:**
   ```bash
   # Node.js
   yarn install
   
   # Python
   cd agents
   pip3 install -r requirements.txt
   ```

2. **Configuration set:**
   - `.env` file exists in project root
   - Contains: `RPC_URL`, `PRICE_ORACLE_ADDRESS`, `VERIDIFI_CORE_ADDRESS`

3. **Contracts deployed:**
   ```bash
   cd agents
   python3 diagnose_contracts.py
   ```

---

## 🛑 How to Stop

- **Dashboard:** Press `Ctrl+C` in the dashboard terminal
- **Agents:** 
  - Click "Stop Agents" in dashboard, OR
  - Press `Ctrl+C` in agents terminal

---

## 📊 What You'll See

### Dashboard (http://localhost:3000)
- Live price feed (FTSO prices)
- Carbon intensity dial
- AI agent log
- Start/Stop buttons

### Agents Terminal
- Real-time agent decisions
- Price updates
- Carbon data
- Trade execution signals

---

## 🐛 Troubleshooting

### Port 3000 already in use?
```bash
# Kill process on port 3000
kill -9 $(lsof -t -i:3000)
```

### Python dependencies missing?
```bash
cd agents
pip3 install -r requirements.txt
```

### Contracts not working?
```bash
cd agents
python3 diagnose_contracts.py
```

---

## 📚 More Information

- **Full Setup Guide:** `COMPLETE_SETUP_GUIDE.md`
- **Commands Reference:** `COMMANDS_REFERENCE.md`
- **Dashboard Docs:** `agents/DASHBOARD_README.md`

