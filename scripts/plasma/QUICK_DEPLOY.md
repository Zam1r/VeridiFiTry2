# Quick Command to Get Green Reward Contract Address

## The Command

```bash
yarn hardhat run scripts/plasma/deployGreenReward.ts --network plasmaTestnet
```

## What You Need First

Before running this command, make sure you have in your `.env` file:

```env
PLASMA_USDT_ADDRESS=0x...  # Get from Plasma team
PRIVATE_KEY=0x...  # Your private key
PLASMA_RPC_URL=https://...  # Correct RPC URL (you already have this)
```

## What Happens

1. The script deploys the GreenReward contract
2. It prints the contract address
3. You copy that address to `.env`

## Expected Output

```
Deploying GreenReward contract on Plasma Testnet...

Deployer address: 0x...
Deployer balance: X.XX ETH

USDT Token Address: 0x...

✅ GreenReward contract deployed!
Contract address: 0x1234567890123456789012345678901234567890

📝 Add this to your .env file:
GREEN_REWARD_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
```

**Copy that address** - that's your `GREEN_REWARD_CONTRACT_ADDRESS`!

## If It Fails

### Error: "PLASMA_USDT_ADDRESS not set"
- Ask Plasma team for USDT address
- Add to `.env`: `PLASMA_USDT_ADDRESS=0x...`

### Error: "Insufficient balance"
- Make sure your account has funds for gas

### Error: Chain ID mismatch
- Already fixed! Should work now.

## After Deployment

1. Copy the address from output
2. Add to `.env`: `GREEN_REWARD_CONTRACT_ADDRESS=0x...`
3. Fund the contract with USDT tokens
4. Ready to use!

