# VeridiFi 3-Agent Swarm System

A LangGraph-based multi-agent system that makes trading decisions based on on-chain verified data from Flare Network.

## Architecture

The system consists of 3 specialized agents:

1. **Agent 1 (Market Analyst)**: Calls the deployed `PriceOracle` contract to get BTC/XRP prices via FTSO oracles
2. **Agent 2 (Green Guardrail)**: Calls the `VeridiFiCore` contract to check carbon intensity via FDC (Flare Data Connector)
3. **Agent 3 (Supervisor/Executor)**: Only outputs `EXECUTE_TRADE` if both conditions are met:
    - Price data is valid (from Agent 1)
    - Energy is Green (from Agent 2)

## Setup

### 1. Install Dependencies

```bash
cd agents
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the project root with:

```env
# Contract addresses (deploy PriceOracle.sol first)
PRICE_ORACLE_ADDRESS=0x...
VERIDIFI_CORE_ADDRESS=0x...

# RPC endpoint
RPC_URL=https://coston2-api.flare.network/ext/C/rpc

# OpenAI API key for LangGraph agents
OPENAI_API_KEY=sk-...

# Optional: Carbon intensity threshold (default: 100 gCO2/kWh)
GREEN_ENERGY_THRESHOLD=100
```

### 3. Deploy Contracts

First, deploy the `PriceOracle` contract:

```bash
# Deploy PriceOracle
yarn hardhat run scripts/deployPriceOracle.ts --network coston2
```

Make sure `VeridiFiCore` is already deployed (or deploy it if needed).

### 4. Run the Swarm

```bash
cd agents
python swarm.py
```

**Note**: Make sure to run from the `agents` directory so relative imports work correctly.

## How It Works

1. **Market Analyst Agent**:
    - Uses `web3.py` to call `getLatestPrices()` on the `PriceOracle` contract
    - Retrieves BTC/USD and XRP/USD prices from FTSO oracles
    - Returns verified on-chain price data

2. **Green Guardrail Agent**:
    - Uses `web3.py` to call `getLatestCarbonIntensity()` on the `VeridiFiCore` contract
    - Checks if carbon intensity is below the green threshold
    - Returns verified on-chain carbon intensity data

3. **Supervisor Agent**:
    - Receives data from both agents
    - Evaluates conditions:
        - ✅ Prices are valid (non-zero, from FTSO)
        - ✅ Energy is Green (carbon intensity < threshold)
    - Outputs `EXECUTE_TRADE` only if both conditions are met
    - Otherwise outputs `HOLD` with reason

## Output Example

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

## Grounding in On-Chain Proofs

All decisions are grounded in:

- **FTSO Price Feeds**: Decentralized price oracles with cryptographic proofs
- **FDC Carbon Intensity**: Verified Web2Json attestations from UK Carbon Intensity API
- **Smart Contract State**: All data is read directly from deployed contracts

This ensures the AI logic is based on verifiable on-chain proofs rather than model hallucinations.

## Files

- `swarm.py`: Main orchestration script
- `agents.py`: Agent definitions
- `contract_interface.py`: Web3.py interface for on-chain contracts
- `config.py`: Configuration management
- `requirements.txt`: Python dependencies
