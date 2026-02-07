# Next Steps: After Deploying GreenReward Contract

You have the contract address! Here's what to do next:

## ✅ What You Have Now

- ✅ `GREEN_REWARD_CONTRACT_ADDRESS=0x0Be6A0F8f0943FEA1D55b249104CcDeef1915a08`
- ✅ Contract deployed on Plasma testnet
- ✅ RPC connection working
- ✅ Chain ID fixed (9745)

## Step 1: Fund the Contract with USDT

The contract needs USDT tokens to send rewards. You need to:

1. **Get USDT tokens on Plasma testnet** (ask Plasma team for a faucet or how to get test USDT)
2. **Transfer USDT to the contract address**: `0x0Be6A0F8f0943FEA1D55b249104CcDeef1915a08`

**How to transfer:**
- Use a wallet interface (MetaMask, etc.) connected to Plasma testnet
- Or create a script to transfer USDT to the contract
- Or ask Plasma team how to fund the contract

**Amount needed:** At least 1 USDT (or more if you want to send multiple rewards)

## Step 2: Verify Contract Balance

Check if the contract has USDT:

```bash
yarn hardhat run scripts/plasma/verifySetup.ts --network plasmaTestnet
```

This will show the contract's USDT balance.

## Step 3: Test Manual Payout

Test sending a reward manually:

```bash
yarn hardhat run scripts/plasma/plasmaPayout.ts --network plasmaTestnet \
  0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  1.0 \
  "Test payment"
```

Replace `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` with your recipient address.

## Step 4: Set Default Recipient (Optional)

Add to `.env`:

```env
PLASMA_RECIPIENT_ADDRESS=0x...  # Your wallet address or recipient address
```

This will be used by the AI agent when sending automatic rewards.

## Step 5: Test with AI Agent

Once funded, the Settlement Agent will automatically send rewards when:
- `EXECUTE_BUY` signal is received
- All conditions are met (Green energy + FDC verified + XRP < $1.10)

## Step 6: Monitor on Dashboard

The dashboard will show:
- Settlement status when payment is executed
- Transaction hash
- Amount sent
- Gas fee: $0.00

## Quick Checklist

- [x] Contract deployed
- [x] Address in `.env`
- [ ] Contract funded with USDT
- [ ] Test manual payout
- [ ] Set recipient address
- [ ] Test with AI agent

## If You Need Help Funding

Ask the Plasma team:
- "How do I get test USDT tokens on Plasma testnet?"
- "Is there a faucet for test USDT?"
- "How do I transfer USDT to my contract address?"

## Ready to Test!

Once the contract is funded, you're ready to test the full flow:
1. AI agent detects Green energy + FDC verified + XRP < $1.10
2. Issues EXECUTE_BUY signal
3. Settlement Agent sends 1 USDT via Plasma (gasless!)
4. Recipient receives USDT with $0 gas fees

🎉 You're almost there!

