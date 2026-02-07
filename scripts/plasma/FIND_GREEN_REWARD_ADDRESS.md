# How to Find GREEN_REWARD_CONTRACT_ADDRESS

## Quick Answer: You Need to Deploy It First!

The `GREEN_REWARD_CONTRACT_ADDRESS` doesn't exist yet - **you need to deploy the GreenReward contract first**, and then you'll get the address from the deployment.

## Step-by-Step Process

### Step 1: Get USDT Address (Required First)

Before deploying, you need the USDT token address:

1. **Ask Plasma team**: "What is the USDT token contract address on Plasma testnet?"
2. **Add to .env**:
   ```env
   PLASMA_USDT_ADDRESS=0x...  # Get from Plasma team
   ```

### Step 2: Fix RPC URL (If Still Having Issues)

If the RPC connection is still failing:

1. **Ask Plasma team**: "What is the correct RPC URL for Plasma testnet?"
2. **Update .env**:
   ```env
   PLASMA_RPC_URL=https://...  # Correct URL from Plasma team
   ```

### Step 3: Deploy the GreenReward Contract

Once you have the USDT address and working RPC:

```bash
# Make sure you're in the project root
yarn hardhat run scripts/plasma/deployGreenReward.ts --network plasmaTestnet
```

**What happens:**
- Deploys the GreenReward contract to Plasma testnet
- Prints the contract address
- Asks you to add it to `.env`

**Output will look like:**
```
✅ GreenReward contract deployed!
Contract address: 0x1234567890123456789012345678901234567890

📝 Add this to your .env file:
GREEN_REWARD_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
```

### Step 4: Copy the Address to .env

Copy the address from the output and add it to your `.env` file:

```env
GREEN_REWARD_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
```

## If You've Already Deployed It

### Option 1: Check Your Terminal History

Look back in your terminal for the deployment output:
```bash
# Scroll up in your terminal to find:
✅ GreenReward contract deployed!
Contract address: 0x...
```

### Option 2: Check Block Explorer

If Plasma has a block explorer:
1. Go to the explorer
2. Search for your deployer address
3. Look for contract creation transactions
4. Find the GreenReward contract deployment

### Option 3: Use a Finder Script

I can create a script to search for your deployment, but you'd need:
- Your deployer address (from `PRIVATE_KEY`)
- Access to the block explorer or RPC

## Prerequisites Before Deployment

Make sure you have:

1. ✅ **USDT Address**: `PLASMA_USDT_ADDRESS` in `.env`
2. ✅ **Working RPC**: `PLASMA_RPC_URL` working (currently failing)
3. ✅ **Private Key**: `PRIVATE_KEY` in `.env` with funds
4. ✅ **Network Config**: Plasma testnet configured in `hardhat.config.ts`

## Current Status

Based on your error, you currently have:

- ❌ **RPC Connection**: Failing (`testnet-rpc.plasmadlt.com` not resolving)
- ❌ **USDT Address**: Not set (need from Plasma team)
- ❌ **GreenReward Contract**: Not deployed yet (can't deploy until above are fixed)

## What to Do Right Now

1. **Ask Plasma team for:**
   - Correct RPC URL for Plasma testnet
   - USDT token contract address

2. **Update .env:**
   ```env
   PLASMA_RPC_URL=<correct_url_from_plasma>
   PLASMA_USDT_ADDRESS=<usdt_address_from_plasma>
   ```

3. **Test RPC connection:**
   ```bash
   yarn hardhat run scripts/plasma/testRpc.ts
   ```

4. **Deploy contract:**
   ```bash
   yarn hardhat run scripts/plasma/deployGreenReward.ts --network plasmaTestnet
   ```

5. **Copy address to .env:**
   ```env
   GREEN_REWARD_CONTRACT_ADDRESS=<address_from_deployment_output>
   ```

## Summary

**You don't "find" the address - you create it by deploying the contract!**

The process is:
1. Get USDT address from Plasma team
2. Fix RPC URL
3. Deploy GreenReward contract
4. Copy the address from deployment output
5. Add to `.env`

The address is generated when you deploy - it's unique to your deployment!

