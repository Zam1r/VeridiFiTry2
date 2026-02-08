# Agent Terminal Quick Start Guide

## Quick Reference

### Scout Agent (FTSO Price Feed)

```bash
# Start terminal
python agents/scout_terminal.py

# Commands
r / refresh    - Query FTSO for latest XRP price
s / status    - Show feed status
c / continuous - Continuous polling (5s intervals)
q / quit      - Exit terminal
```

**Feed:** `PriceOracle.getLatestPrices()` → FTSO Oracle

---

### Auditor Agent (FDC Carbon Verification)

```bash
# Start terminal
python agents/auditor_terminal.py

# Commands
r / refresh    - Check FDC proof validation
v / validate  - Validate carbon threshold (< 50 gCO2/kWh)
s / status    - Show feed status
c / continuous - Continuous monitoring (10s intervals)
q / quit      - Exit terminal
```

**Feed:** `VeridiFiCore.check_fdc_verification()` → FDC Verifier

---

### Manager Agent (Decision Engine)

```bash
# Start terminal
python agents/manager_terminal.py

# Commands
d / decide    - Make trading decision
s / status    - Show last decision
c / continuous - Continuous decision making (5s intervals)
q / quit      - Exit terminal
```

**Feeds:** 
- Scout Agent (XRP price)
- Auditor Agent (Carbon intensity)

**Decision Criteria:**
- ✅ EXECUTE_BUY: price < $1.10 AND carbon < 50 gCO2/kWh (FDC verified)
- ⏸️ WAIT: Conditions not met
- 🛑 HALT_ACTIVITY: Carbon >= 150 gCO2/kWh or data unavailable

---

### Settlement Agent (Plasma Payout)

```bash
# Start terminal
python agents/settlement_terminal.py

# Commands
e / execute   - Execute Plasma payout
s / status    - Show payout status
q / quit      - Exit terminal
```

**Feed:** `scripts/plasma/plasma_settlement.ts` → Plasma Network

---

## Testing Individual Agents

### Test Scout Agent
```bash
# Single query
python agents/scout_terminal.py --single

# Interactive mode
python agents/scout_terminal.py
```

### Test Auditor Agent
```bash
# Single check
python agents/auditor_terminal.py --single

# Interactive mode
python agents/auditor_terminal.py
```

### Test Manager Agent
```bash
# Single decision
python agents/manager_terminal.py --single

# Interactive mode
python agents/manager_terminal.py
```

### Test Settlement Agent
```bash
# Single payout
python agents/settlement_terminal.py <recipient> <amount>

# Interactive mode
python agents/settlement_terminal.py
```

---

## Running All Agents Together

### Via LangGraph (Orchestrated)
```bash
# Run the complete system
python agents/green_treasury_swarm.py
```

### Manual Sequence
```bash
# Terminal 1: Scout Agent
python agents/scout_terminal.py

# Terminal 2: Auditor Agent
python agents/auditor_terminal.py

# Terminal 3: Manager Agent
python agents/manager_terminal.py

# Terminal 4: Settlement Agent (when EXECUTE_BUY received)
python agents/settlement_terminal.py
```

---

## Configuration

Ensure `.env` file has:

```env
PRICE_ORACLE_ADDRESS=0x...      # For Scout Agent
VERIDIFI_CORE_ADDRESS=0x...     # For Auditor Agent
RPC_URL=https://coston2-api.flare.network/ext/C/rpc
PLASMA_RECIPIENT_ADDRESS=0x...  # For Settlement Agent
GREEN_ENERGY_THRESHOLD=50       # gCO2/kWh threshold
```

---

## Troubleshooting

### Scout Agent Issues
- **No price data:** Check `PRICE_ORACLE_ADDRESS` in `.env`
- **Stale data:** FTSO may not have updated yet (wait ~60s)
- **Connection error:** Check `RPC_URL` in `.env`

### Auditor Agent Issues
- **UNVERIFIED:** FDC proof not yet processed (wait for Flare consensus)
- **No round ID:** Carbon intensity data not submitted yet
- **Connection error:** Check `VERIDIFI_CORE_ADDRESS` in `.env`

### Manager Agent Issues
- **WAIT decision:** Check price and carbon conditions
- **HALT_ACTIVITY:** Carbon too high or data unavailable
- **No data:** Ensure Scout and Auditor agents are running

### Settlement Agent Issues
- **Script not found:** Check `scripts/plasma/plasma_settlement.ts` exists
- **Plasma error:** Check Plasma network configuration
- **Timeout:** Plasma network may be slow (wait up to 2 minutes)

---

## Example Workflow

1. **Start Scout Agent:**
   ```bash
   python agents/scout_terminal.py
   > r  # Query FTSO
   # Output: XRP/USD: $1.05 (age: 45s)
   ```

2. **Start Auditor Agent:**
   ```bash
   python agents/auditor_terminal.py
   > r  # Check FDC
   # Output: Carbon: 45 gCO2/kWh ✅ VERIFIED
   ```

3. **Start Manager Agent:**
   ```bash
   python agents/manager_terminal.py
   > d  # Make decision
   # Output: Decision: ✅ EXECUTE_BUY
   ```

4. **Start Settlement Agent:**
   ```bash
   python agents/settlement_terminal.py
   > e  # Execute payout
   # Output: ✅ COMPLETED | TX: 0x...
   ```

---

## Integration with Main Application

The terminals can be used independently or integrated into the LangGraph workflow in `green_treasury_swarm.py`. The main application uses the agent functions directly:

- `scout_agent()` - Scout Agent function
- `auditor_agent()` - Auditor Agent function
- `manager_agent()` - Manager Agent function
- `settlement_agent()` - Settlement Agent function

See `AGENT_ARCHITECTURE.md` for full integration details.


