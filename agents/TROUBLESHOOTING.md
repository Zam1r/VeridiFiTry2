# Troubleshooting: Contract Price Fetching Issues

## Common Causes and Solutions

### 1. Contract Address Not Configured

**Symptom**: "PriceOracle contract not configured" or "Failed to fetch prices from contract"

**Solution**:
1. Check if `.env` file exists in the **project root** (not in `agents/` folder)
2. Verify `PRICE_ORACLE_ADDRESS` is set:
   ```bash
   # From project root
   cat .env | grep PRICE_ORACLE_ADDRESS
   ```
3. If not set, deploy the contract:
   ```bash
   yarn hardhat run scripts/deployPriceOracle.ts --network coston2
   ```
4. Copy the address from output and add to `.env`:
   ```env
   PRICE_ORACLE_ADDRESS=0x1234567890123456789012345678901234567890
   ```

### 2. Contract Not Deployed

**Symptom**: "No contract code at address" or "execution reverted"

**Solution**:
1. Verify contract is deployed:
   ```bash
   yarn hardhat run scripts/deployPriceOracle.ts --network coston2
   ```
2. Check on explorer:
   - https://coston2-explorer.flare.network/
   - Search for your contract address
3. If not deployed, deploy it:
   ```bash
   yarn hardhat run scripts/deployPriceOracle.ts --network coston2
   ```

### 3. Wrong Contract Address

**Symptom**: "Invalid contract address" or "execution reverted"

**Solution**:
1. Verify address format (should start with `0x` and be 42 characters)
2. Check address on explorer to confirm it's a contract
3. Make sure it's the PriceOracle contract, not VeridiFiCore

### 4. RPC Connection Issues

**Symptom**: "Failed to connect to RPC" or timeout errors

**Solution**:
1. Test RPC connection:
   ```bash
   curl https://coston2-api.flare.network/ext/C/rpc -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```
2. Check your internet connection
3. Try alternative RPC:
   ```env
   RPC_URL=https://coston2-api.flare.network/ext/C/rpc
   ```

### 5. Contract ABI Mismatch

**Symptom**: "Invalid contract response format" or ValueError

**Solution**:
1. Verify contract has `getLatestPrices()` function
2. Check contract source code matches the ABI in `contract_interface.py`
3. If contract was modified, update the ABI

### 6. FTSO Data Not Available

**Symptom**: Prices are zero or timestamps are zero

**Solution**:
1. FTSO might not have data yet (testnet)
2. Wait a few minutes for FTSO to update
3. Check FTSO status on Flare explorer

## Diagnostic Steps

### Step 1: Run Diagnostic Script

```bash
cd agents
python3 diagnose_contracts.py
```

This will check:
- ✅ .env file exists and has addresses
- ✅ RPC connection works
- ✅ Contract addresses are valid
- ✅ Contract code exists at address
- ✅ Can call contract functions

### Step 2: Check Configuration

```bash
# From project root
cd agents
python3 -c "
from config import PRICE_ORACLE_ADDRESS, VERIDIFI_CORE_ADDRESS, RPC_URL
print('PRICE_ORACLE_ADDRESS:', PRICE_ORACLE_ADDRESS or 'NOT SET')
print('VERIDIFI_CORE_ADDRESS:', VERIDIFI_CORE_ADDRESS or 'NOT SET')
print('RPC_URL:', RPC_URL)
"
```

### Step 3: Test Contract Directly

```bash
cd agents
python3 -c "
from contract_interface import ContractInterface
ci = ContractInterface()
prices = ci.get_latest_prices()
print('Prices:', prices)
"
```

### Step 4: Check Server Logs

When running `dashboard_server.py`, check the console output for:
- `[Scout] -> PriceOracle contract not configured`
- `[Scout] -> Failed to fetch prices from contract`
- `Error fetching prices: ...`

## Quick Fix Checklist

- [ ] `.env` file exists in project root
- [ ] `PRICE_ORACLE_ADDRESS` is set in `.env`
- [ ] Contract is deployed on Coston2 network
- [ ] RPC URL is correct: `https://coston2-api.flare.network/ext/C/rpc`
- [ ] Internet connection is working
- [ ] Contract address is correct (42 characters, starts with `0x`)
- [ ] Contract has code deployed (check on explorer)

## Example Working .env File

```env
# Contract Addresses
PRICE_ORACLE_ADDRESS=0x1234567890123456789012345678901234567890
VERIDIFI_CORE_ADDRESS=0xabcdefabcdefabcdefabcdefabcdefabcdefabcd

# Network
RPC_URL=https://coston2-api.flare.network/ext/C/rpc
```

## Still Not Working?

1. **Check server logs** - Look for specific error messages
2. **Run diagnostic script** - `python3 diagnose_contracts.py`
3. **Test manually** - Try calling the contract function directly
4. **Verify deployment** - Check contract on blockchain explorer
5. **Check network** - Make sure you're on Coston2 testnet

## Mock Data Mode

If contracts aren't configured, the dashboard will use mock data automatically. This is useful for:
- Testing the UI
- Development without deployed contracts
- Demonstrations

The dashboard will show "Disconnected - Using mock data" when in mock mode.

