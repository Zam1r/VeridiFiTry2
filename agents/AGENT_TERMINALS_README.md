# Developer Green Treasury - Agent Terminals

## Overview

This directory contains terminal interfaces for each of the 4 agents in the Developer Green Treasury system. Each agent has its own dedicated terminal that connects to specific data feeds and can be run independently for testing or monitoring.

## Agents

### 1. 🔍 Scout Agent (`scout_terminal.py`)
**Purpose:** Queries FTSO for real-time XRP prices

**Feed:** FTSO Oracle via `PriceOracle` contract
- Contract: `PRICE_ORACLE_ADDRESS`
- Method: `getLatestPrices()`
- Data: XRP/USD price, timestamp, freshness

**Usage:**
```bash
python agents/scout_terminal.py
```

---

### 2. 🔍 Auditor Agent (`auditor_terminal.py`)
**Purpose:** Validates FDC proofs and checks if carbon intensity is below 50 gCO2/kWh

**Feed:** FDC Verification via `VeridiFiCore` contract
- Contract: `VERIDIFI_CORE_ADDRESS`
- Method: `check_fdc_verification()`
- Data: Carbon intensity, FDC status, voting round ID

**Usage:**
```bash
python agents/auditor_terminal.py
```

---

### 3. 🎯 Manager Agent (`manager_terminal.py`)
**Purpose:** Makes trading decisions—only executes trades when price < $1.10 AND carbon is verified green

**Feeds:** 
- Scout Agent (XRP price)
- Auditor Agent (Carbon intensity)

**Decision Logic:**
- ✅ **EXECUTE_BUY:** price < $1.10 AND carbon < 50 gCO2/kWh (FDC verified)
- ⏸️ **WAIT:** Conditions not met
- 🛑 **HALT_ACTIVITY:** Carbon >= 150 gCO2/kWh or data unavailable

**Usage:**
```bash
python agents/manager_terminal.py
```

---

### 4. 💸 Settlement Agent (`settlement_terminal.py`)
**Purpose:** Executes the payout via Plasma when EXECUTE_BUY signal is received

**Feed:** Plasma Network via `plasma_settlement.ts` script
- Script: `scripts/plasma/plasma_settlement.ts`
- Network: Plasma Testnet
- Paymaster: Gasless USDT transfers

**Usage:**
```bash
python agents/settlement_terminal.py
```

---

## Documentation

- **[AGENT_ARCHITECTURE.md](./AGENT_ARCHITECTURE.md)** - Complete architecture documentation
- **[AGENT_DIAGRAM.md](./AGENT_DIAGRAM.md)** - Visual diagrams and flow charts
- **[TERMINAL_QUICKSTART.md](./TERMINAL_QUICKSTART.md)** - Quick reference guide

## Quick Start

1. **Configure `.env` file:**
   ```env
   PRICE_ORACLE_ADDRESS=0x...
   VERIDIFI_CORE_ADDRESS=0x...
   RPC_URL=https://coston2-api.flare.network/ext/C/rpc
   PLASMA_RECIPIENT_ADDRESS=0x...
   GREEN_ENERGY_THRESHOLD=50
   ```

2. **Test individual agents:**
   ```bash
   # Scout Agent
   python agents/scout_terminal.py --single
   
   # Auditor Agent
   python agents/auditor_terminal.py --single
   
   # Manager Agent
   python agents/manager_terminal.py --single
   
   # Settlement Agent
   python agents/settlement_terminal.py <recipient> <amount>
   ```

3. **Run full system:**
   ```bash
   python agents/green_treasury_swarm.py
   ```

## Agent Interaction Flow

```
Scout Agent (FTSO) → Manager Agent
                         ↓
Auditor Agent (FDC) → Manager Agent → Settlement Agent (Plasma)
```

## Feed Connections

| Agent | Feed Type | Connection | Data Retrieved |
|-------|-----------|------------|----------------|
| Scout | FTSO Oracle | `PriceOracle.getLatestPrices()` | XRP/USD price |
| Auditor | FDC Verification | `VeridiFiCore.check_fdc_verification()` | Carbon intensity, FDC status |
| Manager | Internal | Combines Scout + Auditor data | Trading decision |
| Settlement | Plasma Network | `plasma_settlement.ts` | Transaction hash, payout status |

## Features

- ✅ **Interactive terminals** for each agent
- ✅ **Single query mode** for testing (`--single` flag)
- ✅ **Continuous monitoring** mode
- ✅ **Real-time status** updates
- ✅ **Error handling** and graceful degradation
- ✅ **Feed connection** validation
- ✅ **Color-coded** output for status

## Integration

The terminals are standalone but integrate with the main LangGraph workflow in `green_treasury_swarm.py`. The agent functions (`scout_agent`, `auditor_agent`, `manager_agent`, `settlement_agent`) are used by both the terminals and the orchestrated system.

## Support

For issues or questions:
1. Check `TERMINAL_QUICKSTART.md` for troubleshooting
2. Review `AGENT_ARCHITECTURE.md` for system details
3. Check `.env` configuration
4. Verify contract addresses and RPC connection


