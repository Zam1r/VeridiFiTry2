# Fixing Application Failures

## Issues Identified

### 1. ❌ PriceOracle Contract Not Deployed

**Error:**
```
❌ No contract code at address 0x0Be6A0F8f0943FEA1D55b249104CcDeef1915a08
Error fetching prices (BadFunctionCallOutput): Could not transact with/call contract function
```

**Problem:** The `PRICE_ORACLE_ADDRESS` in your `.env` points to an address with no deployed contract.

**Solution:** Deploy the PriceOracle contract:

```bash
# Deploy PriceOracle contract
yarn hardhat run scripts/deployPriceOracle.ts --network coston2
```

**Output will show:**
```
✅ PriceOracle deployed!
Contract address: 0x...
```

**Then update `.env`:**
```env
PRICE_ORACLE_ADDRESS=0x...  # Use the address from deployment output
```

---

### 2. ⚠️ FDCVerification Address Lookup Failing

**Warning:**
```
Warning: Could not get FDCVerification address: ('execution reverted', 'no data')
```

**Problem:** The ContractRegistry lookup for FDCVerification is failing. This is non-critical - the system will still work but won't be able to directly verify FDC proofs via the FDCVerification contract.

**Solution Options:**

**Option A: Ignore (Recommended for now)**
- The system uses VeridiFiCore's `latestRoundId()` and `getLatestCarbonIntensity()` which works fine
- The warning is harmless - FDC verification still works through VeridiFiCore

**Option B: Fix ContractRegistry lookup**
- The ContractRegistry address might be incorrect
- Check if the address in `contract_interface.py` is correct for Coston2
- Current: `0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019`

---

## Quick Fix Commands

### Step 1: Deploy PriceOracle

```bash
# Make sure you have PRIVATE_KEY in .env
yarn hardhat run scripts/deployPriceOracle.ts --network coston2
```

### Step 2: Update .env

Copy the contract address from deployment output and update `.env`:

```env
PRICE_ORACLE_ADDRESS=0x...  # New address from deployment
```

### Step 3: Verify Deployment

```bash
cd agents
python3 diagnose_contracts.py
```

You should now see:
```
✅ Contract code found at PRICE_ORACLE_ADDRESS
✅ getLatestPrices() returned valid data
```

### Step 4: Restart Application

```bash
# Stop current processes (Ctrl+C)
# Then restart
./QUICK_START.sh
```

---

## Alternative: Use VeridiFiCore for Prices

If your VeridiFiCore contract has a `getLatestPrices()` function, you can use it instead:

**Update `.env`:**
```env
PRICE_ORACLE_ADDRESS=0x36d1eCfc435Ce8E13402f8e9e4A2BFe2D8C780ef  # Your VeridiFiCore address
```

**Note:** This only works if VeridiFiCore has the `getLatestPrices()` function.

---

## Expected Behavior After Fix

Once PriceOracle is deployed:

✅ **Scout Agent** will successfully fetch XRP/USD price
✅ **Dashboard** will show live FTSO prices (pulsing green)
✅ **Manager Agent** will be able to make decisions based on price
✅ **System** will work end-to-end

---

## Verification Checklist

After deploying PriceOracle, verify:

- [ ] Contract deployed successfully
- [ ] Address added to `.env`
- [ ] `diagnose_contracts.py` shows contract code exists
- [ ] `getLatestPrices()` returns valid data
- [ ] Dashboard shows prices updating
- [ ] Scout agent no longer shows errors

---

## Still Having Issues?

1. **Check RPC connection:**
   ```bash
   curl -X POST https://coston2-api.flare.network/ext/C/rpc \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

2. **Check contract on explorer:**
   - Go to: https://coston2-explorer.flare.network/
   - Search for your contract address
   - Verify it's deployed and has code

3. **Check .env file:**
   ```bash
   cat .env | grep PRICE_ORACLE_ADDRESS
   ```

4. **Verify private key has funds:**
   - Needed for deployment gas fees

---

**The main fix is deploying PriceOracle. Once that's done, the system should work!** 🚀

