# Green Treasury Multi-Agent Orchestration System

An autonomous "Green Treasury" management system on Flare Coston2 network using LangGraph and web3.py.

## Overview

This system orchestrates 4 specialized agents to make environmentally-conscious trading decisions:

1. **Oracle Scout (FTSO Node)** - Polls BTC/USD and XRP/USD prices from FTSO
2. **Environmental Auditor (FDC Node)** - Fetches carbon intensity for Oxford region
3. **Treasury Manager (Supervisor Node)** - Makes trading decisions based on logic gates
4. **Settlement Agent (Plasma Node)** - Executes mock Plasma Payments

## Architecture

The system uses LangGraph's `StateGraph` to manage agent transitions and shared state:

```
Oracle Scout → Environmental Auditor → Treasury Manager → [Conditional] → Settlement Agent
```

### Shared State (TypedDict)

- `market_report`: Market data with prices and timestamps
- `carbon_audit`: Carbon intensity audit with status (Green/Amber/Red)
- `treasury_decision`: Decision (EXECUTE_BUY, HALT_ACTIVITY, WAIT)
- `settlement_status`: Plasma Payment execution status
- `errors`: List of errors encountered
- `agent_history`: History of agent actions

## Logic Gates

### Treasury Manager Decision Logic

1. **HALT_ACTIVITY** if:
   - Energy status is 'Red' (>150 gCO2/kWh)
   - Oracle timeout (>3 minutes old data)
   - Missing required data

2. **EXECUTE_BUY** if:
   - Energy is 'Green' (<50 gCO2/kWh) **AND**
   - XRP Price < $1.10

3. **WAIT** otherwise

## Fail-Safes

1. **Oracle Timeout**: If FTSO data is >3 minutes old, system halts trading
2. **FDC Unavailable**: If FDC data is unavailable, defaults to 'Red' (Safety First)

## Energy Status Classification

- **Green**: < 50 gCO2/kWh 🟢
- **Amber**: 50-150 gCO2/kWh 🟡
- **Red**: > 150 gCO2/kWh 🔴

## Setup

### 1. Install Dependencies

```bash
cd agents
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Contract Addresses
PRICE_ORACLE_ADDRESS=0x...  # Address of PriceOracle contract with getLatestPrices()
VERIDIFI_CORE_ADDRESS=0x...  # Address of VeridiFiCore contract

# Network
RPC_URL=https://coston2-api.flare.network/ext/C/rpc

# Optional: OpenAI API Key (if using LLM features)
OPENAI_API_KEY=sk-...

# Optional: Thresholds
GREEN_ENERGY_THRESHOLD=100
```

### 3. Run the System

```bash
cd agents
python green_treasury_swarm.py
```

## Output Format

The system uses terminal-style logging:

```
[HH:MM:SS] [Scout] -> Polling FTSO for BTC/USD and XRP/USD prices...
[HH:MM:SS] [Scout] -> BTC/USD: $65,432.10 (age: 45s)
[HH:MM:SS] [Scout] -> XRP/USD: $0.6234 (age: 45s)
[HH:MM:SS] [Scout] -> Market Report generated. Sending to Manager...
[HH:MM:SS] [Auditor] -> Fetching carbon intensity for Oxford region...
[HH:MM:SS] [Auditor] -> Carbon Intensity: 42 gCO2/kWh - Status: 🟢 Green
[HH:MM:SS] [Manager] -> XRP Price: $0.6234 | Energy Status: Green (42 gCO2/kWh)
[HH:MM:SS] [Manager] -> DECISION: EXECUTE_BUY - Energy is Green...
[HH:MM:SS] [Settlement] -> EXECUTE_BUY signal received. Initiating mock Plasma Payment...
[HH:MM:SS] [Settlement] -> ✅ Plasma Payment executed successfully!
```

## Contract Requirements

### PriceOracle Contract

The Oracle Scout expects a contract with `getLatestPrices()` function:

```solidity
function getLatestPrices() external view returns (
    uint256 btcPrice,
    uint256 xrpPrice,
    uint64 btcTimestamp,
    uint64 xrpTimestamp
);
```

**Note**: The prompt mentions VeridiFiCore, but the standard PriceOracle contract has `getLatestPrices()`. If your VeridiFiCore has this function, you can set `PRICE_ORACLE_ADDRESS` to your VeridiFiCore address.

### VeridiFiCore Contract

The Environmental Auditor expects a contract with `getLatestCarbonIntensity()` function:

```solidity
function getLatestCarbonIntensity() external view returns (uint256);
```

## Mock Plasma Payment

The Settlement Agent simulates a Plasma Payment:
- Amount: 1 USDT
- Fee: $0.00 (Zero-fee Paymaster logic)
- Type: "Green Reward"

In production, this would interact with actual Plasma contracts.

## Error Handling

- Oracle timeout errors halt trading
- FDC unavailable defaults to 'Red' status
- All errors are logged and included in final report

## Customization

### Adjust Thresholds

Edit constants in `green_treasury_swarm.py`:

```python
ORACLE_TIMEOUT_SECONDS = 180  # 3 minutes
XRP_TARGET_PRICE = 1.10  # USD
GREEN_THRESHOLD = 50  # gCO2/kWh
AMBER_THRESHOLD = 150  # gCO2/kWh
```

### Change Region

Modify the `environmental_auditor_agent` function to use a different postcode or region.

## Example Output

```
================================================================================
🌱 GREEN TREASURY - Autonomous Multi-Agent Orchestration System
================================================================================

[14:23:15] [Scout] -> Polling FTSO for BTC/USD and XRP/USD prices...
[14:23:16] [Scout] -> BTC/USD: $65,432.10 (age: 45s)
[14:23:16] [Scout] -> XRP/USD: $0.6234 (age: 45s)
[14:23:16] [Scout] -> Market Report generated. Sending to Manager...
[14:23:16] [Auditor] -> Fetching carbon intensity for Oxford region...
[14:23:17] [Auditor] -> Carbon Intensity: 42 gCO2/kWh - Status: 🟢 Green
[14:23:17] [Manager] -> DECISION: EXECUTE_BUY - Energy is Green (42 gCO2/kWh < 50) AND XRP Price ($0.6234) is below target ($1.10)
[14:23:17] [Settlement] -> EXECUTE_BUY signal received. Initiating mock Plasma Payment...
[14:23:18] [Settlement] -> ✅ Plasma Payment executed successfully!

================================================================================
📊 FINAL TREASURY REPORT
================================================================================

📈 Market Report:
   BTC/USD: $65,432.10
   XRP/USD: $0.6234
   Data Freshness: BTC 45s, XRP 45s

🌍 Carbon Audit:
   Intensity: 42 gCO2/kWh
   Status: 🟢 Green
   Region: Oxford
   Source: FDC (On-Chain via VeridiFiCore)

💼 Treasury Decision: EXECUTE_BUY
   Reason: Energy is Green (42 gCO2/kWh < 50) AND XRP Price ($0.6234) is below target ($1.10). Executing buy signal.

💸 Settlement Status: COMPLETED
   Amount: 1.0 USDT
   Recipient: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
   TX Hash: 0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f

================================================================================
```

## Troubleshooting

### "Failed to fetch prices from contract"
- Check `PRICE_ORACLE_ADDRESS` is set correctly
- Verify contract is deployed and has `getLatestPrices()` function
- Check RPC connection

### "Oracle Timeout"
- FTSO data is >3 minutes old
- This is a safety feature - trading is halted

### "FDC Unavailable"
- System defaults to 'Red' status (Safety First)
- Check `VERIDIFI_CORE_ADDRESS` is set correctly
- System will try National Grid API as fallback

## License

MIT

