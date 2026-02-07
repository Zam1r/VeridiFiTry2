# Complete Setup & Run Guide - VeridiFi Green Treasury System

This guide provides all commands needed to run the entire application from start to finish.

## Prerequisites

- Node.js (v18+)
- Python 3.8+
- Yarn package manager
- Git

---

## Step 1: Initial Setup

### 1.1 Install Node.js Dependencies

```bash
# From project root
yarn install
```

### 1.2 Install Python Dependencies

```bash
# From project root
cd agents
pip3 install -r requirements.txt
cd ..
```

### 1.3 Configure Environment Variables

Create/update `.env` file in project root with:

```env
# Flare Coston2 Network
RPC_URL=https://coston2-api.flare.network/ext/C/rpc
PRICE_ORACLE_ADDRESS=0x...  # Your PriceOracle contract address
VERIDIFI_CORE_ADDRESS=0x...  # Your VeridiFiCore contract address

# Plasma Network
PLASMA_RPC_URL=https://testnet-rpc.plasmadlt.com
PLASMA_USDT_ADDRESS=0x...  # USDT token address on Plasma testnet
GREEN_REWARD_CONTRACT_ADDRESS=0x0Be6A0F8f0943FEA1D55b249104CcDeef1915a08
PLASMA_RECIPIENT_ADDRESS=0x...  # Recipient wallet address

# Private Keys
PRIVATE_KEY=0x...  # Your private key with funds

# Optional
GREEN_ENERGY_THRESHOLD=50
```

---

## Step 2: Verify Contracts & Configuration

### 2.1 Check Contract Configuration

```bash
cd agents
python3 diagnose_contracts.py
```

This will verify:
- RPC connection
- Contract addresses
- Contract deployment status

### 2.2 Verify Plasma Setup (Optional)

```bash
# Test Plasma RPC connection
yarn hardhat run scripts/plasma/testRpc.ts --network plasmaTestnet

# Verify full Plasma setup
yarn hardhat run scripts/plasma/verifySetup.ts --network plasmaTestnet
```

---

## Step 3: Start the Dashboard (Web Interface)

### 3.1 Start Dashboard Server

**Option A: Using the shell script (Recommended)**

```bash
cd agents
chmod +x start_dashboard.sh
./start_dashboard.sh
```

**Option B: Manual start**

```bash
cd agents
python3 dashboard_server.py
```

The dashboard will be available at: **http://localhost:3000**

### 3.2 Verify Dashboard is Running

Open your browser and navigate to:
```
http://localhost:3000
```

You should see:
- Live Truth Feed (FTSO prices)
- Carbon Dial (FDC carbon intensity)
- AI Log (agent communications)
- Start/Stop Agents buttons
- FDC Verification badge

---

## Step 4: Run the VeridiFi Swarm Agents

### 4.1 Run Agents with Live Monitoring

**In a new terminal window:**

```bash
cd agents
python3 green_treasury_swarm.py
```

This will:
- Start the LangGraph StateGraph
- Execute: Scout → Auditor → Manager → Settlement
- Print live output for each node
- Show decision-making process in real-time

### 4.2 Expected Output

```
🌱 VERIDIFI SWARM - Multi-Agent Decision System
================================================================================

Swarm Flow:
  START -> Scout (Price) -> Auditor (Carbon) -> Manager (Decision) -> Settlement (Plasma)

🚀 Starting VeridiFi Swarm Execution...

--------------------------------------------------------------------------------
📊 [SCOUT] Node Output:
--------------------------------------------------------------------------------
  💰 FTSO Price: $1.0850
--------------------------------------------------------------------------------

📊 [AUDITOR] Node Output:
--------------------------------------------------------------------------------
  🌍 FDC Proof Valid: ✅ VALID
  📋 Voting Round ID: 12345
--------------------------------------------------------------------------------

📊 [MANAGER] Node Output:
--------------------------------------------------------------------------------
  🎯 Decision: EXECUTE_BUY
  📝 Reason: Price $1.0850 < $1.10 AND FDC proof valid
--------------------------------------------------------------------------------

📊 [SETTLEMENT] Node Output:
--------------------------------------------------------------------------------
  💚 Payout Status: ✅ EXECUTED
  📦 Amount: 1.0 USDT
  🔗 TX Hash: 0x...
--------------------------------------------------------------------------------
```

---

## Step 5: Control Agents from Dashboard

### 5.1 Start Agents from Dashboard

1. Open dashboard: http://localhost:3000
2. Click **"Start Agents"** button
3. Agents will begin fetching data and making decisions
4. Watch live updates in:
   - Live Truth Feed (pulsing green every 1.8 seconds)
   - Carbon Dial (shows current grid health)
   - AI Log (scrolling agent communications)

### 5.2 Stop Agents from Dashboard

1. Click **"Stop Agents"** button
2. Agents will pause data fetching
3. Dashboard will continue showing last known state

---

## Step 6: Test Individual Components

### 6.1 Test FTSO Price Fetching

```bash
cd agents
python3 -c "from contract_interface import ContractInterface; ci = ContractInterface(); print(ci.get_latest_prices())"
```

### 6.2 Test FDC Verification

```bash
cd agents
python3 -c "from contract_interface import ContractInterface; ci = ContractInterface(); print(ci.check_fdc_verification())"
```

### 6.3 Test Plasma Payout (Manual)

```bash
# From project root
npx ts-node scripts/plasma/plasma_settlement.ts 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 1.0
```

Replace `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` with your recipient address.

---

## Step 7: Monitor System Status

### 7.1 Check Dashboard API

```bash
# Get current system state
curl http://localhost:3000/api/data

# Check agent status
curl http://localhost:3000/api/agents/status

# Start agents via API
curl -X POST http://localhost:3000/api/agents/start

# Stop agents via API
curl -X POST http://localhost:3000/api/agents/stop
```

### 7.2 View Agent Logs

Agent logs are displayed in:
- **Terminal**: When running `green_treasury_swarm.py`
- **Dashboard**: AI Log section (scrolling text box)
- **Dashboard API**: `/api/data` endpoint includes `agent_logs`

---

## Step 8: Full System Workflow

### Complete Startup Sequence

**Terminal 1: Dashboard**
```bash
cd agents
python3 dashboard_server.py
```

**Terminal 2: Agents (Optional - Dashboard can control agents)**
```bash
cd agents
python3 green_treasury_swarm.py
```

**Browser:**
```
http://localhost:3000
```

### What Happens:

1. **Dashboard starts** on port 3000
2. **Agents can be started** from dashboard or terminal
3. **Scout Agent** fetches XRP/USD price every 1.8 seconds
4. **Auditor Agent** checks FDC verification every 10 seconds
5. **Manager Agent** evaluates conditions:
   - Price < $1.10?
   - FDC proof valid AND carbon < 50 gCO2/kWh?
6. **If conditions met**: Settlement Agent executes Plasma payout
7. **Dashboard updates** in real-time showing all activity

---

## Step 9: Troubleshooting Commands

### 9.1 Check Python Dependencies

```bash
cd agents
pip3 list | grep -E "langgraph|web3|flask|requests"
```

### 9.2 Check Node.js Dependencies

```bash
yarn list --depth=0 | grep -E "ethers|hardhat|typescript"
```

### 9.3 Test RPC Connection

```bash
# Flare Coston2
curl -X POST https://coston2-api.flare.network/ext/C/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Plasma Testnet
curl -X POST https://testnet-rpc.plasmadlt.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### 9.4 Check Contract Deployment

```bash
# Verify PriceOracle
yarn hardhat run scripts/deployPriceOracle.ts --network coston2

# Verify VeridiFiCore
yarn hardhat run scripts/veridiFi/deployVeridiFiCore.ts --network coston2

# Verify GreenReward (Plasma)
yarn hardhat run scripts/plasma/deployGreenReward.ts --network plasmaTestnet
```

---

## Step 10: Quick Reference - All Commands

### Setup
```bash
yarn install                    # Install Node.js deps
cd agents && pip3 install -r requirements.txt && cd ..  # Install Python deps
```

### Verification
```bash
cd agents && python3 diagnose_contracts.py  # Check contracts
yarn hardhat run scripts/plasma/verifySetup.ts --network plasmaTestnet  # Check Plasma
```

### Start Dashboard
```bash
cd agents && python3 dashboard_server.py
# Or: cd agents && ./start_dashboard.sh
```

### Run Agents
```bash
cd agents && python3 green_treasury_swarm.py
```

### Test Components
```bash
# Test Plasma payout
npx ts-node scripts/plasma/plasma_settlement.ts <address> 1.0

# Test FTSO
cd agents && python3 -c "from contract_interface import ContractInterface; ci = ContractInterface(); print(ci.get_latest_prices())"
```

### API Endpoints
```bash
curl http://localhost:3000/api/data              # Get system state
curl http://localhost:3000/api/agents/status     # Agent status
curl -X POST http://localhost:3000/api/agents/start  # Start agents
curl -X POST http://localhost:3000/api/agents/stop   # Stop agents
```

---

## Complete Startup Checklist

- [ ] Node.js dependencies installed (`yarn install`)
- [ ] Python dependencies installed (`pip3 install -r requirements.txt`)
- [ ] `.env` file configured with all addresses
- [ ] Contracts deployed and verified
- [ ] Dashboard server running (port 3000)
- [ ] Browser open to http://localhost:3000
- [ ] Agents started (from dashboard or terminal)
- [ ] Live data flowing (check dashboard)
- [ ] FDC verification working (check badge on dashboard)
- [ ] Plasma payout tested (optional)

---

## Expected Behavior

### Dashboard Shows:
- ✅ FTSO prices updating every 1.8 seconds (pulsing green)
- ✅ Carbon intensity from FDC (updated every 10 seconds)
- ✅ FDC verification badge (STATE_GREEN_VERIFIED / VERIFIED / Waiting)
- ✅ AI Log with agent communications
- ✅ Treasury decision (EXECUTE_BUY / WAIT / HALT_ACTIVITY)
- ✅ Settlement status when payout executes

### Terminal Shows:
- ✅ Agent execution flow: Scout → Auditor → Manager → Settlement
- ✅ Real-time state updates for each node
- ✅ Decision logic and reasoning
- ✅ Transaction hashes for payouts
- ✅ Voting Round IDs for FDC auditability

---

## Stopping the System

1. **Stop Agents: Click "Stop Agents" in dashboard
2. **Stop Dashboard**: Press `Ctrl+C` in dashboard terminal
3. **Stop Agents Terminal**: Press `Ctrl+C` in agents terminal

---

## Support

If you encounter issues:

1. Check `.env` file has all required variables
2. Verify contracts are deployed: `python3 diagnose_contracts.py`
3. Check RPC connections are working
4. Review error logs in terminal output
5. Check dashboard console (F12 in browser) for JavaScript errors

---

**You're all set! The VeridiFi Green Treasury System is now running! 🚀💚**

