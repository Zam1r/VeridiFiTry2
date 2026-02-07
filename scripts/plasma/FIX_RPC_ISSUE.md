# Fix: RPC Connection Failed - Deployment Not Working

## The Problem

Your deployment is failing with:
```
Error: getaddrinfo ENOTFOUND testnet-rpc.plasmadlt.com
```

This means the DNS lookup for `testnet-rpc.plasmadlt.com` is failing - the domain doesn't exist or is incorrect.

## Why It's Failing

The RPC URL in your `hardhat.config.ts` is:
```typescript
plasmaTestnet: {
    url: "https://testnet-rpc.plasmadlt.com",  // ← This domain doesn't resolve
    ...
}
```

**The domain `testnet-rpc.plasmadlt.com` doesn't exist or is incorrect.**

## How to Fix It

### Step 1: Get the Correct RPC URL from Plasma Team

**Ask them:**
> "What is the correct RPC URL for Plasma testnet? The URL `https://testnet-rpc.plasmadlt.com` is not working."

They should provide something like:
- `https://rpc.plasma-testnet.com`
- `https://testnet.plasma.network/rpc`
- Or a different format

### Step 2: Update hardhat.config.ts

Once you have the correct URL, update the config:

```typescript
plasmaTestnet: {
    url: "<correct_url_from_plasma_team>",  // ← Update this
    accounts: [`${PRIVATE_KEY}`],
    chainId: 161221135, // TODO: Verify with Plasma team
    gasPrice: 0,
},
```

### Step 3: Or Use Environment Variable (Better)

Update `hardhat.config.ts` to use an environment variable:

```typescript
const PLASMA_RPC_URL = process.env.PLASMA_RPC_URL || "https://testnet-rpc.plasmadlt.com";

plasmaTestnet: {
    url: PLASMA_RPC_URL,  // ← Use env variable
    accounts: [`${PRIVATE_KEY}`],
    chainId: 161221135,
    gasPrice: 0,
},
```

Then set it in `.env`:
```env
PLASMA_RPC_URL=https://correct-url-from-plasma-team.com
```

### Step 4: Test the Connection

```bash
yarn hardhat run scripts/plasma/testRpc.ts
```

This will test if the RPC URL works.

### Step 5: Deploy Again

Once the RPC is working:

```bash
yarn hardhat run scripts/plasma/deployGreenReward.ts --network plasmaTestnet
```

## Alternative: Ask Plasma Team These Questions

When you meet them, ask:

1. **RPC URL** (URGENT):
   - "What is the correct RPC URL for Plasma testnet?"
   - "Is it `https://testnet-rpc.plasmadlt.com` or something else?"
   - "Do I need an API key?"

2. **Chain ID**:
   - "What is the chain ID for Plasma testnet?"
   - Currently set to `161221135` - is this correct?

3. **USDT Address**:
   - "What is the USDT token contract address on Plasma testnet?"

4. **Block Explorer**:
   - "What is the block explorer URL?"
   - (So you can verify deployments)

## Quick Fix: Update Config to Use Env Variable

I'll update the hardhat config to use an environment variable so you can easily change the RPC URL without editing code.

