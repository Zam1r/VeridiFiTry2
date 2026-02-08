# Developer Green Treasury - Agent Architecture

## Overview

The Developer Green Treasury system consists of 4 specialized agents that work together to make environmentally-conscious trading decisions. Each agent has its own terminal interface and connects to specific data feeds.

## Agent Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DEVELOPER GREEN TREASURY SYSTEM                       │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   SCOUT AGENT    │         │  AUDITOR AGENT   │
│  (FTSO Node)    │         │   (FDC Node)     │
├──────────────────┤         ├──────────────────┤
│ Terminal:        │         │ Terminal:        │
│ scout_terminal.py│         │ auditor_terminal.│
│                  │         │       py         │
│                  │         │                  │
│ Feed:            │         │ Feed:            │
│ ┌──────────────┐ │         │ ┌──────────────┐ │
│ │ PriceOracle  │ │         │ │ VeridiFiCore │ │
│ │  Contract    │ │         │ │  Contract    │ │
│ └──────┬───────┘ │         │ └──────┬───────┘ │
│        │         │         │        │         │
│        │ FTSO    │         │        │ FDC     │
│        │ Query   │         │        │ Proof   │
│        │         │         │        │ Check   │
│        ▼         │         │        ▼         │
│ ┌──────────────┐ │         │ ┌──────────────┐ │
│ │ FTSO Oracle  │ │         │ │ FDC Verifier │ │
│ │ (On-Chain)   │ │         │ │ (On-Chain)   │ │
│ └──────────────┘ │         │ └──────────────┘ │
│                  │         │                  │
│ Output:          │         │ Output:          │
│ • XRP/USD Price │         │ • Carbon Intensity│
│ • Timestamp     │         │ • FDC Verified   │
│ • Data Freshness│         │ • Round ID       │
└────────┬─────────┘         └────────┬─────────┘
         │                           │
         │ Price Data                │ Carbon Data
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   MANAGER AGENT       │
         │  (Decision Node)     │
         ├───────────────────────┤
         │ Terminal:             │
         │ manager_terminal.py   │
         │                       │
         │ Decision Logic:      │
         │ ┌───────────────────┐ │
         │ │ IF price < $1.10  │ │
         │ │ AND carbon < 50   │ │
         │ │ THEN EXECUTE_BUY  │ │
         │ └───────────────────┘ │
         │                       │
         │ Output:               │
         │ • EXECUTE_BUY        │
         │ • WAIT               │
         │ • HALT_ACTIVITY      │
         └───────────┬───────────┘
                     │
                     │ EXECUTE_BUY Signal
                     │
                     ▼
         ┌───────────────────────┐
         │  SETTLEMENT AGENT     │
         │   (Plasma Node)       │
         ├───────────────────────┤
         │ Terminal:             │
         │ settlement_terminal.py│
         │                       │
         │ Feed:                 │
         │ ┌───────────────────┐ │
         │ │ plasma_settlement │ │
         │ │      .ts          │ │
         │ └─────────┬─────────┘ │
         │           │            │
         │           │ Plasma    │
         │           │ Paymaster  │
         │           ▼            │
         │ ┌───────────────────┐ │
         │ │ Plasma Network   │ │
         │ │ (Gasless USDT)    │ │
         │ └───────────────────┘ │
         │                       │
         │ Output:               │
         │ • Transaction Hash   │
         │ • Payout Status    │
         │ • Gas Fee: $0.00     │
         └───────────────────────┘
```

## Agent Details

### 1. Scout Agent (FTSO Node)

**Terminal Interface:** `scout_terminal.py`

**Purpose:** Queries FTSO for real-time XRP prices

**Feed Connection:**
- **Contract:** `PriceOracle` (configured via `PRICE_ORACLE_ADDRESS`)
- **Method:** `getLatestPrices()`
- **Data Source:** FTSO Oracle (On-Chain)
- **Feed ID:** XRP/USD (`0x015852502f55534400000000000000000000000000`)

**Output:**
- XRP/USD price (float)
- Timestamp (uint64)
- Data freshness (seconds)

**Usage:**
```bash
# Interactive mode
python agents/scout_terminal.py

# Single query
python agents/scout_terminal.py --single
```

**Commands:**
- `r` / `refresh` - Query FTSO for latest price
- `s` / `status` - Show feed status
- `c` / `continuous` - Continuous polling (every 5 seconds)
- `q` / `quit` - Exit terminal

---

### 2. Auditor Agent (FDC Node)

**Terminal Interface:** `auditor_terminal.py`

**Purpose:** Validates FDC proofs and checks if carbon intensity is below 50 gCO2/kWh

**Feed Connection:**
- **Contract:** `VeridiFiCore` (configured via `VERIDIFI_CORE_ADDRESS`)
- **Methods:** 
  - `latestRoundId()` - Get latest voting round ID
  - `getCarbonIntensity(roundId)` - Get carbon intensity for a round
  - `getLatestCarbonIntensity()` - Get latest carbon intensity
- **Data Source:** FDC Verification (Flare Consensus)
- **Verification:** On-chain FDC proof validation

**Output:**
- Carbon intensity (gCO2/kWh)
- FDC verification status (VERIFIED/UNVERIFIED)
- Voting round ID
- Is low carbon (< 50 gCO2/kWh)

**Usage:**
```bash
# Interactive mode
python agents/auditor_terminal.py

# Single check
python agents/auditor_terminal.py --single
```

**Commands:**
- `r` / `refresh` - Check FDC proof validation
- `v` / `validate` - Validate carbon threshold (< 50 gCO2/kWh)
- `s` / `status` - Show feed status
- `c` / `continuous` - Continuous monitoring (every 10 seconds)
- `q` / `quit` - Exit terminal

---

### 3. Manager Agent (Decision Node)

**Terminal Interface:** `manager_terminal.py`

**Purpose:** Makes the decision—only executes trades when price < $1.10 AND carbon is verified green

**Feed Connections:**
- **Scout Agent Feed:** XRP price data
- **Auditor Agent Feed:** Carbon intensity and FDC verification

**Decision Logic:**
```
IF (XRP Price < $1.10) AND (Carbon < 50 gCO2/kWh AND FDC Verified):
    DECISION = EXECUTE_BUY
ELSE IF (Carbon >= 150 gCO2/kWh):
    DECISION = HALT_ACTIVITY
ELSE:
    DECISION = WAIT
```

**Output:**
- Decision (EXECUTE_BUY / WAIT / HALT_ACTIVITY)
- Reason for decision
- Price evaluation
- Carbon evaluation

**Usage:**
```bash
# Interactive mode
python agents/manager_terminal.py

# Single decision
python agents/manager_terminal.py --single
```

**Commands:**
- `d` / `decide` - Make trading decision
- `s` / `status` - Show last decision
- `c` / `continuous` - Continuous decision making (every 5 seconds)
- `q` / `quit` - Exit terminal

---

### 4. Settlement Agent (Plasma Node)

**Terminal Interface:** `settlement_terminal.py`

**Purpose:** Executes the payout via Plasma when EXECUTE_BUY signal is received

**Feed Connection:**
- **Script:** `scripts/plasma/plasma_settlement.ts`
- **Network:** Plasma Testnet
- **Paymaster:** Plasma Paymaster (covers gas fees)

**Output:**
- Transaction hash
- Payout status (COMPLETED / FAILED)
- Amount (USDT)
- Recipient address
- Gas fee: $0.00

**Usage:**
```bash
# Interactive mode
python agents/settlement_terminal.py

# Single payout
python agents/settlement_terminal.py <recipient> <amount>
```

**Commands:**
- `e` / `execute` - Execute Plasma payout
- `s` / `status` - Show payout status
- `q` / `quit` - Exit terminal

---

## Agent Interaction Flow

### Sequential Flow

```
1. START
   │
   ├─→ Scout Agent queries FTSO
   │   └─→ Returns: XRP/USD price
   │
   ├─→ Auditor Agent checks FDC
   │   └─→ Returns: Carbon intensity + verification
   │
   ├─→ Manager Agent evaluates
   │   ├─→ IF conditions met → EXECUTE_BUY
   │   ├─→ IF carbon too high → HALT_ACTIVITY
   │   └─→ ELSE → WAIT
   │
   └─→ IF EXECUTE_BUY:
       └─→ Settlement Agent executes Plasma payout
           └─→ Returns: Transaction hash
```

### Data Flow

```
┌─────────────┐
│ Scout Agent │──[XRP Price]──┐
└─────────────┘               │
                               ▼
┌─────────────┐         ┌──────────────┐
│Auditor Agent│──[Carbon]──→│Manager Agent│
└─────────────┘         └──────┬───────┘
                                │
                                │[EXECUTE_BUY]
                                ▼
                         ┌──────────────┐
                         │Settlement    │
                         │   Agent      │
                         └──────┬───────┘
                                │
                                │[Plasma Payout]
                                ▼
                         ┌──────────────┐
                         │   Plasma     │
                         │   Network    │
                         └──────────────┘
```

## Integration with Main Application

### LangGraph StateGraph Integration

The agents are integrated into a LangGraph `StateGraph` in `green_treasury_swarm.py`:

```python
# Graph structure
workflow = StateGraph(TreasuryState)
workflow.add_node("scout", scout_agent)
workflow.add_node("auditor", auditor_agent)
workflow.add_node("manager", manager_agent)
workflow.add_node("settlement", settlement_agent)

# Flow
workflow.set_entry_point("scout")
workflow.add_edge("scout", "auditor")
workflow.add_edge("auditor", "manager")
workflow.add_conditional_edges("manager", should_route_to_settlement, {...})
workflow.add_edge("settlement", END)
```

### Shared State (TreasuryState)

All agents share a `TreasuryState` TypedDict:

```python
class TreasuryState(TypedDict):
    ftso_price: Optional[float]              # From Scout Agent
    fdc_proof_valid: Optional[bool]        # From Auditor Agent
    treasury_decision: Optional[str]        # From Manager Agent
    payout_status: Optional[dict]            # From Settlement Agent
    market_report: Optional[dict]           # Detailed price data
    carbon_audit: Optional[dict]            # Detailed carbon data
    errors: list                            # Error tracking
    agent_history: list                     # Action history
```

## Feed Connections Summary

| Agent | Feed Type | Contract/Script | Data Retrieved |
|-------|-----------|-----------------|----------------|
| **Scout** | FTSO Oracle | `PriceOracle.getLatestPrices()` | XRP/USD price, timestamp |
| **Auditor** | FDC Verification | `VeridiFiCore.check_fdc_verification()` | Carbon intensity, FDC status, round ID |
| **Manager** | Internal | Combines Scout + Auditor data | Decision (EXECUTE_BUY/WAIT/HALT) |
| **Settlement** | Plasma Network | `plasma_settlement.ts` | Transaction hash, payout status |

## Running the System

### Individual Agent Terminals

Each agent can be run independently for testing:

```bash
# Test Scout Agent
python agents/scout_terminal.py

# Test Auditor Agent
python agents/auditor_terminal.py

# Test Manager Agent
python agents/manager_terminal.py

# Test Settlement Agent
python agents/settlement_terminal.py
```

### Full System (LangGraph)

Run the complete orchestrated system:

```bash
# VeridiFi Swarm (simplified flow)
python agents/green_treasury_swarm.py

# Or use the run function
from agents.green_treasury_swarm import run_veridifi_swarm
run_veridifi_swarm()
```

## Configuration

All agents require configuration in `.env`:

```env
# Contract Addresses
PRICE_ORACLE_ADDRESS=0x...    # For Scout Agent
VERIDIFI_CORE_ADDRESS=0x...   # For Auditor Agent

# RPC Endpoint
RPC_URL=https://coston2-api.flare.network/ext/C/rpc

# Plasma Configuration
PLASMA_RECIPIENT_ADDRESS=0x...  # For Settlement Agent

# Thresholds
GREEN_ENERGY_THRESHOLD=50       # gCO2/kWh (for Auditor/Manager)
```

## Error Handling

Each agent handles errors gracefully:

- **Scout Agent:** Returns `None` if FTSO query fails, checks for oracle timeout (>180s)
- **Auditor Agent:** Returns `UNVERIFIED` if FDC proof not available
- **Manager Agent:** Returns `HALT_ACTIVITY` if data unavailable or conditions unsafe
- **Settlement Agent:** Returns `FAILED` status if Plasma payout fails

## Monitoring

All agents log their actions to:
- Terminal output (real-time)
- `agent_history` in shared state
- Error tracking in `errors` list

## Security Considerations

1. **FDC Verification:** Manager Agent only trusts FDC-verified carbon data
2. **Oracle Timeout:** Scout Agent halts if data is >3 minutes old
3. **Carbon Threshold:** Manager Agent halts trading if carbon >150 gCO2/kWh
4. **Plasma Security:** Settlement Agent uses on-chain Plasma Paymaster for gasless transactions


