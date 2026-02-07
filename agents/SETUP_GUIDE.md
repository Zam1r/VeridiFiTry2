# Setup Guide: Finding Contract Addresses

This guide will help you find or deploy the contracts needed for the Green Treasury system.

## Quick Overview

You need 3 values for your `.env` file:
1. **PRICE_ORACLE_ADDRESS** - Contract that provides BTC/XRP prices
2. **VERIDIFI_CORE_ADDRESS** - Your VeridiFiCore contract
3. **RPC_URL** - Already provided (Coston2 network)

---

## 1. PRICE_ORACLE_ADDRESS

### Option A: Deploy PriceOracle Contract (Recommended)

If you haven't deployed it yet:

```bash
# Make sure you're in the project root
yarn hardhat run scripts/deployPriceOracle.ts --network coston2
```

**Output will look like:**
```
✅ PriceOracle deployed!
Contract address: 0x1234567890123456789012345678901234567890

📝 Add this to your .env file:
PRICE_ORACLE_ADDRESS=0x1234567890123456789012345678901234567890
```

**Copy that address** and add it to your `.env` file.

### Option B: Find Existing Deployment

If you've already deployed it, check:
- Your terminal history from when you deployed
- The blockchain explorer: https://coston2-explorer.flare.network/
- Check your deployment transaction receipts

---

## 2. VERIDIFI_CORE_ADDRESS

### Option A: Deploy VeridiFiCore Contract

If you haven't deployed it yet:

```bash
# Make sure you're in the project root
yarn hardhat run scripts/veridiFi/deployVeridiFiCore.ts --network coston2
```

**Output will look like:**
```
VeridiFiCore deployed to: 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd

FDC Hub address: 0x3676742d4508492c026e77a3841C526019a8F1f0

Carbon Intensity API URL: https://api.carbonintensity.org.uk/intensity
```

**Copy the VeridiFiCore address** and add it to your `.env` file.

### Option B: Find Existing Deployment

Use the finder script:

```bash
yarn hardhat run scripts/veridiFi/findDeployment.ts --network coston2
```

This will search the last 100 blocks for your VeridiFiCore deployment.

**Or check:**
- Your terminal history
- The file `scripts/veridiFi/deploys.ts` (if it exists)
- The blockchain explorer: https://coston2-explorer.flare.network/
- Your deployment transaction receipts

### Option C: Check Your .env File

If you've used VeridiFiCore before, check if you already have it in your `.env`:

```bash
grep VERIDIFI_CORE_ADDRESS .env
```

---

## 3. RPC_URL

This is already set correctly! The Coston2 RPC URL is:

```
RPC_URL=https://coston2-api.flare.network/ext/C/rpc
```

You don't need to change this unless you're using a different network.

---

## Complete .env File Example

Create a `.env` file in the **project root** (not in the `agents/` folder):

```env
# Contract Addresses
PRICE_ORACLE_ADDRESS=0x1234567890123456789012345678901234567890
VERIDIFI_CORE_ADDRESS=0xabcdefabcdefabcdefabcdefabcdefabcdefabcd

# Network (already correct for Coston2)
RPC_URL=https://coston2-api.flare.network/ext/C/rpc

# Optional: OpenAI API Key (if using LLM features)
OPENAI_API_KEY=sk-...

# Optional: Carbon intensity threshold (default: 100 gCO2/kWh)
GREEN_ENERGY_THRESHOLD=100
```

---

## Step-by-Step Setup

### Step 1: Deploy PriceOracle

```bash
# From project root
yarn hardhat run scripts/deployPriceOracle.ts --network coston2
```

Copy the address from the output.

### Step 2: Deploy or Find VeridiFiCore

**If deploying:**
```bash
yarn hardhat run scripts/veridiFi/deployVeridiFiCore.ts --network coston2
```

**If finding existing:**
```bash
yarn hardhat run scripts/veridiFi/findDeployment.ts --network coston2
```

Copy the address from the output.

### Step 3: Create .env File

Create `.env` in the project root:

```bash
# In project root
touch .env
```

Add the addresses:

```env
PRICE_ORACLE_ADDRESS=<paste_address_from_step_1>
VERIDIFI_CORE_ADDRESS=<paste_address_from_step_2>
RPC_URL=https://coston2-api.flare.network/ext/C/rpc
```

### Step 4: Verify Setup

Test that your contracts are accessible:

```bash
cd agents
python -c "from contract_interface import ContractInterface; ci = ContractInterface(); print('✅ Contracts loaded successfully!')"
```

---

## Troubleshooting

### "Failed to connect to RPC"

- Check your internet connection
- Verify the RPC URL is correct
- Try the RPC URL in your browser: https://coston2-api.flare.network/ext/C/rpc

### "Contract not configured"

- Make sure `.env` is in the **project root**, not in `agents/`
- Check that addresses are correct (no extra spaces, correct format)
- Verify contracts are deployed on Coston2 network

### "Failed to fetch prices from contract"

- Verify `PRICE_ORACLE_ADDRESS` is correct
- Check the contract is deployed on Coston2
- Ensure you have network connectivity

### "Failed to fetch carbon intensity"

- Verify `VERIDIFI_CORE_ADDRESS` is correct
- Check the contract is deployed on Coston2
- The system will fallback to National Grid API if on-chain fails

---

## Blockchain Explorer

You can verify your contracts on the Coston2 explorer:

- **Main Explorer**: https://coston2-explorer.flare.network/
- **Flare Systems Explorer**: https://coston2-systems-explorer.flare.rocks/

Search for your contract addresses to verify they're deployed correctly.

---

## Quick Check Script

You can verify your setup by running:

```bash
cd agents
python -c "
from config import PRICE_ORACLE_ADDRESS, VERIDIFI_CORE_ADDRESS, RPC_URL
print('PRICE_ORACLE_ADDRESS:', PRICE_ORACLE_ADDRESS or '❌ NOT SET')
print('VERIDIFI_CORE_ADDRESS:', VERIDIFI_CORE_ADDRESS or '❌ NOT SET')
print('RPC_URL:', RPC_URL)
"
```

All addresses should be set (not empty) for the system to work.

---

## Next Steps

Once you have all addresses set in `.env`, you can run the Green Treasury system:

```bash
cd agents
python green_treasury_swarm.py
```

Good luck! 🚀

