# Quick Start Guide: VeridiFi 3-Agent Swarm

## Overview

This system implements a 3-agent LangGraph swarm that makes trading decisions based on on-chain verified data:

1. **Market Analyst**: Fetches BTC/XRP prices from FTSO oracles
2. **Green Guardrail**: Checks carbon intensity from FDC
3. **Supervisor**: Executes trade only if both conditions are met

## Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
cd agents
pip install -r requirements.txt
```

### Step 2: Deploy Contracts

```bash
# Deploy PriceOracle contract
yarn hardhat run scripts/deployPriceOracle.ts --network coston2

# Note the deployed address and add to .env
```

### Step 3: Configure Environment

Create `.env` file in project root:

```env
PRICE_ORACLE_ADDRESS=0x...  # From Step 2
VERIDIFI_CORE_ADDRESS=0x... # Your existing VeridiFiCore address
RPC_URL=https://coston2-api.flare.network/ext/C/rpc
OPENAI_API_KEY=sk-...       # Your OpenAI API key
GREEN_ENERGY_THRESHOLD=100  # Optional, default is 100
```

### Step 4: Run the Swarm

```bash
cd agents
python swarm.py
```

## Expected Output

```
============================================================
VeridiFi 3-Agent Swarm: On-Chain Trading Decision System
============================================================

[Agent 1: Market Analyst] Analyzing market prices...
MARKET ANALYSIS (On-Chain FTSO Data):
=====================================
BTC/USD Price: $65,432.10
XRP/USD Price: $0.5234
...

[Agent 2: Green Guardrail] Checking carbon intensity...
CARBON INTENSITY ANALYSIS (On-Chain FDC Data):
===============================================
Carbon Intensity: 85 gCO2/kWh
Status: ✅ Green
...

[Agent 3: Supervisor] Evaluating trade conditions...
===========================================
SUPERVISOR DECISION: EXECUTE_TRADE
===========================================
✅ TRADE APPROVED
- Market prices verified on-chain
- Energy is Green
...
```

## Troubleshooting

### "Failed to fetch prices from contract"

- Ensure `PRICE_ORACLE_ADDRESS` is set correctly
- Verify contract is deployed on the network
- Check RPC connection

### "Failed to fetch carbon intensity"

- Ensure `VERIDIFI_CORE_ADDRESS` is set correctly
- Verify VeridiFiCore has processed at least one carbon intensity proof
- Check RPC connection

### Import errors

- Make sure you're running from the `agents` directory
- Verify all dependencies are installed: `pip install -r requirements.txt`

## Architecture

```
┌─────────────────┐
│  Market Analyst │───> getLatestPrices() on PriceOracle
└────────┬────────┘         (FTSO Oracle)
         │
         ▼
┌─────────────────┐
│ Green Guardrail │───> getLatestCarbonIntensity() on VeridiFiCore
└────────┬────────┘         (FDC Verified)
         │
         ▼
┌─────────────────┐
│   Supervisor    │───> EXECUTE_TRADE (if both conditions met)
└─────────────────┘
```

All decisions are grounded in on-chain proofs from:

- **FTSO**: Decentralized price oracles
- **FDC**: Verified Web2Json attestations

