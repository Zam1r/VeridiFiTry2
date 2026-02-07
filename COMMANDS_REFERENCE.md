# Quick Commands Reference - VeridiFi Green Treasury

## 🚀 Quick Start (All-in-One)

```bash
# Run the quick start script
./QUICK_START.sh
```

---

## 📋 Setup Commands

### Install Dependencies

```bash
# Node.js dependencies
yarn install

# Python dependencies
cd agents
pip3 install -r requirements.txt
cd ..
```

### Verify Setup

```bash
# Check contracts and configuration
cd agents
python3 diagnose_contracts.py
cd ..

# Verify Plasma setup
yarn hardhat run scripts/plasma/verifySetup.ts --network plasmaTestnet
```

---

## 🖥️ Start Dashboard

### Option 1: Using Script (Recommended)

```bash
cd agents
chmod +x start_dashboard.sh
./start_dashboard.sh
```

### Option 2: Direct Python

```bash
cd agents
python3 dashboard_server.py
```

**Dashboard URL:** http://localhost:3000

---

## 🤖 Run Agents

### Option 1: From Dashboard
1. Open http://localhost:3000
2. Click **"Start Agents"** button

### Option 2: From Terminal

```bash
cd agents
python3 green_treasury_swarm.py
```

---

## 🧪 Test Individual Components

### Test FTSO Price Fetching

```bash
cd agents
python3 -c "from contract_interface import ContractInterface; ci = ContractInterface(); print(ci.get_latest_prices())"
```

### Test FDC Verification

```bash
cd agents
python3 -c "from contract_interface import ContractInterface; ci = ContractInterface(); print(ci.check_fdc_verification())"
```

### Test Plasma Payout

```bash
# Manual payout test
npx ts-node scripts/plasma/plasma_settlement.ts <recipient_address> 1.0

# Example
npx ts-node scripts/plasma/plasma_settlement.ts 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 1.0
```

---

## 🔧 Deployment Commands

### Deploy PriceOracle

```bash
yarn hardhat run scripts/deployPriceOracle.ts --network coston2
```

### Deploy VeridiFiCore

```bash
yarn hardhat run scripts/veridiFi/deployVeridiFiCore.ts --network coston2
```

### Deploy GreenReward (Plasma)

```bash
yarn hardhat run scripts/plasma/deployGreenReward.ts --network plasmaTestnet
```

### Fund GreenReward Contract

```bash
yarn hardhat run scripts/plasma/fundContract.ts --network plasmaTestnet
```

---

## 📊 API Commands

### Get System State

```bash
curl http://localhost:3000/api/data
```

### Check Agent Status

```bash
curl http://localhost:3000/api/agents/status
```

### Start Agents via API

```bash
curl -X POST http://localhost:3000/api/agents/start
```

### Stop Agents via API

```bash
curl -X POST http://localhost:3000/api/agents/stop
```

---

## 🔍 Diagnostic Commands

### Check RPC Connections

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

### Check Python Dependencies

```bash
pip3 list | grep -E "langgraph|web3|flask|requests"
```

### Check Node.js Dependencies

```bash
yarn list --depth=0 | grep -E "ethers|hardhat|typescript"
```

---

## 🎯 Complete Workflow Commands

### Full Startup Sequence

**Terminal 1: Dashboard**
```bash
cd agents
python3 dashboard_server.py
```

**Terminal 2: Agents (Optional)**
```bash
cd agents
python3 green_treasury_swarm.py
```

**Browser:**
```
http://localhost:3000
```

---

## 🛑 Stop Commands

### Stop Dashboard
- Press `Ctrl+C` in dashboard terminal

### Stop Agents
- Click "Stop Agents" in dashboard, OR
- Press `Ctrl+C` in agents terminal

---

## 📝 Environment Variables Checklist

Make sure your `.env` file has:

```env
# Required
RPC_URL=https://coston2-api.flare.network/ext/C/rpc
PRICE_ORACLE_ADDRESS=0x...
VERIDIFI_CORE_ADDRESS=0x...
PRIVATE_KEY=0x...

# Plasma (for payouts)
PLASMA_RPC_URL=https://testnet-rpc.plasmadlt.com
PLASMA_USDT_ADDRESS=0x...
GREEN_REWARD_CONTRACT_ADDRESS=0x...
PLASMA_RECIPIENT_ADDRESS=0x...
```

---

## 🐛 Troubleshooting Commands

### Reset Everything

```bash
# Stop all processes
pkill -f dashboard_server.py
pkill -f green_treasury_swarm.py

# Clear Python cache
find . -type d -name __pycache__ -exec rm -r {} +
find . -type f -name "*.pyc" -delete
```

### Check Port Usage

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process on port 3000
kill -9 $(lsof -t -i:3000)
```

### View Logs

```bash
# Dashboard logs (in terminal where it's running)
# Agent logs (in terminal where agents are running)
# Browser console (F12 in browser)
```

---

## 📚 Documentation Files

- `COMPLETE_SETUP_GUIDE.md` - Full setup instructions
- `agents/VERIDIFI_SWARM_README.md` - Agent system details
- `scripts/plasma/README.md` - Plasma integration guide
- `PLASMA_SETUP.md` - Plasma network setup

---

## ✅ Quick Verification Checklist

Run these to verify everything works:

```bash
# 1. Check contracts
cd agents && python3 diagnose_contracts.py

# 2. Test FTSO
cd agents && python3 -c "from contract_interface import ContractInterface; ci = ContractInterface(); print(ci.get_latest_prices())"

# 3. Test FDC
cd agents && python3 -c "from contract_interface import ContractInterface; ci = ContractInterface(); print(ci.check_fdc_verification())"

# 4. Start dashboard
cd agents && python3 dashboard_server.py
# Then open http://localhost:3000 in browser

# 5. Test agents
cd agents && python3 green_treasury_swarm.py
```

---

**For detailed instructions, see `COMPLETE_SETUP_GUIDE.md`**

