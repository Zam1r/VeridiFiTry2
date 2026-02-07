# VeridiFi Swarm - Finalized LangGraph StateGraph

## Overview

The VeridiFi Swarm is a finalized multi-agent orchestration system using LangGraph that makes autonomous trading decisions based on FTSO price data and FDC carbon verification.

## State Dictionary

The `TreasuryState` TypedDict includes:

- **`ftso_price`**: XRP/USD price from FTSO Oracle (float)
- **`fdc_proof_valid`**: Whether FDC proof is valid and carbon is below threshold (bool)
- **`payout_status`**: Status of Plasma payout execution (dict)

Additional fields for backward compatibility and detailed logging:
- `market_report`, `carbon_audit`, `fdc_verification_status`
- `treasury_decision`, `decision_reason`, `settlement_status`
- `errors`, `agent_history`

## Node Flow

```
START → Scout (Price) → Auditor (Carbon) → Manager (Decision) → Settlement (Plasma)
```

### 1. Scout Agent (Price Node)
- **Function**: `scout_agent(state)`
- **Purpose**: Fetches XRP/USD price from FTSO Oracle
- **Updates**: `ftso_price` in state
- **Output**: XRP price in USD

### 2. Auditor Agent (Carbon Node)
- **Function**: `auditor_agent(state)`
- **Purpose**: Validates FDC proof for carbon intensity data
- **Updates**: `fdc_proof_valid` in state
- **Output**: Boolean indicating if FDC proof is valid AND carbon < 50 gCO2/kWh
- **Logs**: Voting Round ID for auditability

### 3. Manager Agent (Decision Node)
- **Function**: `manager_agent(state)`
- **Purpose**: Evaluates conditions and makes decision
- **Logic**: 
  - If `price < target` AND `carbon < threshold` (fdc_proof_valid) → Proceed to Settlement
  - Otherwise → END
- **Updates**: `treasury_decision` and `decision_reason`

### 4. Settlement Agent (Plasma Node)
- **Function**: `settlement_agent(state)`
- **Purpose**: Executes gasless USDT payout via Plasma Paymaster
- **Updates**: `payout_status` in state
- **Output**: Transaction hash and payout confirmation

## Conditional Edge

From Manager node:

```python
if price < target AND carbon < threshold (fdc_proof_valid):
    → Settlement
else:
    → END
```

- **Target Price**: $1.10 (XRP_TARGET_PRICE)
- **Carbon Threshold**: 50 gCO2/kWh (GREEN_THRESHOLD)

## Graph Compilation

The graph is compiled using:

```python
app = create_veridifi_swarm_graph()
```

This creates a compiled LangGraph application ready for execution.

## Streaming Loop for Live Monitoring

The `run_veridifi_swarm()` function includes a streaming loop that prints each node's output to the console:

```python
for state in app.stream(initial_state):
    for node_name, node_state in state.items():
        print(f"\n📊 [{node_name.upper()}] Node Output:")
        # Display key state updates
        # - FTSO Price
        # - FDC Proof Valid status
        # - Decision and reason
        # - Payout status
```

### Example Output

```
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

================================================================================
✅ VeridiFi Swarm Execution Complete
================================================================================
```

## Usage

### Run the Swarm

```bash
cd agents
python3 green_treasury_swarm.py
```

### Programmatic Usage

```python
from green_treasury_swarm import create_veridifi_swarm_graph, TreasuryState

# Create graph
app = create_veridifi_swarm_graph()

# Initial state
initial_state: TreasuryState = {
    "ftso_price": None,
    "fdc_proof_valid": None,
    "payout_status": None,
    # ... other fields
}

# Run with streaming
for state in app.stream(initial_state):
    # Process each node's output
    for node_name, node_state in state.items():
        print(f"Node: {node_name}")
        print(f"State: {node_state}")
```

## Configuration

Required environment variables in `.env`:

```env
# FTSO Oracle
PRICE_ORACLE_ADDRESS=0x...
RPC_URL=https://coston2-api.flare.network/ext/C/rpc

# FDC Verification
VERIDIFI_CORE_ADDRESS=0x...

# Plasma Settlement
PLASMA_RPC_URL=https://testnet-rpc.plasmadlt.com
PLASMA_USDT_ADDRESS=0x...
PLASMA_RECIPIENT_ADDRESS=0x...
PRIVATE_KEY=0x...
```

## Decision Logic

The Manager evaluates:

1. **Price Condition**: `ftso_price < XRP_TARGET_PRICE` ($1.10)
2. **Carbon Condition**: `fdc_proof_valid == True` (FDC proof valid AND carbon < 50 gCO2/kWh)

**Both conditions must be true** to proceed to Settlement.

## Error Handling

- **Scout errors**: Sets `ftso_price = None`, continues to Auditor
- **Auditor errors**: Sets `fdc_proof_valid = False`, continues to Manager
- **Manager errors**: Sets decision to "WAIT", goes to END
- **Settlement errors**: Sets `payout_status` with error details

All errors are logged to console and stored in `state["errors"]`.

## Live Monitoring Features

The streaming loop provides:

- ✅ Real-time node execution status
- ✅ Key state updates (price, FDC status, decision, payout)
- ✅ Error reporting
- ✅ Transaction hashes for payout tracking
- ✅ Voting Round ID for FDC auditability

## Next Steps

1. ✅ State dictionary finalized with `ftso_price`, `fdc_proof_valid`, `payout_status`
2. ✅ Node flow: START → Scout → Auditor → Manager → Settlement
3. ✅ Conditional edge from Manager implemented
4. ✅ Graph compiled and ready
5. ✅ Streaming loop for live monitoring added

The VeridiFi Swarm is now fully operational! 🚀

