# Plasma Network Integration Setup

Complete guide for setting up gasless USDT rewards via Plasma Network's Protocol-Level Paymaster.

## Quick Start

### 1. Add Environment Variables

Add to your `.env` file:

```env
# Plasma Network
PLASMA_RPC_URL=https://testnet-rpc.plasmadlt.com
PLASMA_USDT_ADDRESS=0x...  # Get from Plasma team
GREEN_REWARD_CONTRACT_ADDRESS=0x...  # After deployment
PLASMA_RECIPIENT_ADDRESS=0x...  # Default recipient (optional)

# Required
PRIVATE_KEY=0x...  # Your private key with funds
```

### 2. Test RPC Connection

**If you're getting connection errors**, first test the RPC URL:

```bash
yarn hardhat run scripts/plasma/testRpc.ts
```

This will test multiple possible RPC URLs to find the correct one.

**Then verify full setup:**

```bash
yarn hardhat run scripts/plasma/verifySetup.ts --network plasmaTestnet
```

This will:
- Test RPC connection
- Show actual chain ID (verify with Plasma team)
- Check contract if deployed
- Verify USDT token address

### 3. Deploy GreenReward Contract

```bash
yarn hardhat run scripts/plasma/deployGreenReward.ts --network plasmaTestnet
```

**Output:**
```
✅ GreenReward contract deployed!
Contract address: 0x...
📝 Add this to your .env file:
GREEN_REWARD_CONTRACT_ADDRESS=0x...
```

### 4. Fund the Contract

Transfer USDT tokens to the contract address. You'll need:
- USDT tokens on Plasma testnet
- Transfer them to the `GREEN_REWARD_CONTRACT_ADDRESS`

### 5. Test Manual Payout

```bash
yarn hardhat run scripts/plasma/plasmaPayout.ts --network plasmaTestnet \
  0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  1.0 \
  "Test payment"
```

### 6. Automatic Payouts

Once configured, the Settlement Agent will automatically send payouts when:
- `EXECUTE_BUY` signal is received
- All conditions are met (Green energy + FDC verified + XRP < $1.10)

## Questions for Plasma Team

When you meet the Plasma team, ask:

1. **RPC URL** ⚠️ **URGENT - Connection failing**:
   - What is the correct RPC URL for Plasma testnet?
   - Current URL `https://testnet-rpc.plasmadlt.com` is not resolving
   - Do you need an API key?
   - Are there alternative endpoints?

2. **Chain ID**: What is the exact chain ID for Plasma testnet?
   - Currently set to `161221135` (needs verification)

3. **USDT Address**: What is the official USDT token contract address on Plasma testnet?

4. **Paymaster**: How does the Protocol-Level Paymaster work?
   - Does the sender need to pay gas, or is it completely gasless?
   - Any special configuration needed?

5. **Explorer**: What is the block explorer URL for Plasma testnet?

6. **Gas Requirements**: 
   - Does the contract deployer need to pay gas?
   - Does the reward sender need to pay gas?
   - Or is everything gasless?

## Architecture

```
AI Agent (EXECUTE_BUY)
    ↓
Settlement Agent
    ↓
plasma_payout.py (Python wrapper)
    ↓
plasmaPayout.ts (TypeScript script)
    ↓
GreenReward Contract (Plasma Testnet)
    ↓
USDT Transfer (Gasless via Paymaster)
    ↓
Recipient receives 1.00 USDT with $0 gas fees
```

## Files Created

1. **`contracts/plasma/GreenReward.sol`** - Smart contract for distributing rewards
2. **`scripts/plasma/deployGreenReward.ts`** - Deployment script
3. **`scripts/plasma/plasmaPayout.ts`** - Payout script (can be called manually or by agent)
4. **`scripts/plasma/verifySetup.ts`** - Setup verification script
5. **`agents/plasma_payout.py`** - Python wrapper for integration with agents
6. **`hardhat.config.ts`** - Updated with Plasma testnet network

## Integration Points

### Settlement Agent
- Automatically triggers when `EXECUTE_BUY` signal is received
- Calls `plasma_payout.py` to send reward
- Falls back to mock payment if Plasma not configured
- Logs all transaction details

### Dashboard
- Shows settlement status when payment is executed
- Displays transaction hash
- Shows amount and recipient
- Indicates gas fee: $0.00

## Troubleshooting

### "GREEN_REWARD_CONTRACT_ADDRESS not set"
- Deploy the contract first
- Add address to `.env`

### "Insufficient contract balance"
- Transfer USDT to contract address
- Check balance with contract's `getContractBalance()` function

### "Only contract owner can send rewards"
- Make sure `PRIVATE_KEY` matches the deployer address
- The deployer becomes the contract owner

### "Plasma payout failed"
- Check network connectivity
- Verify RPC URL is correct
- Check Plasma testnet status
- Verify chain ID with Plasma team

## Next Steps

1. ✅ Ask Plasma team the questions above
2. ✅ Update chain ID in `hardhat.config.ts` if needed
3. ✅ Update USDT address in `.env`
4. ✅ Deploy contract
5. ✅ Fund contract with USDT
6. ✅ Test manual payout
7. ✅ Let AI agent trigger automatic payouts

Enjoy gasless rewards! 🚀💚

