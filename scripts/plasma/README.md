# Plasma Network Integration

This directory contains scripts for sending gasless USDT rewards via Plasma Network's Protocol-Level Paymaster.

## Overview

When the AI Agent issues an `EXECUTE_BUY` signal, the Settlement Agent triggers a transaction on Plasma Testnet that sends 1.00 USDT to the user's address with **$0 gas fees** (covered by Plasma's Paymaster).

## Setup

### 1. Add Environment Variables

Add these to your `.env` file:

```env
# Plasma Network Configuration
PLASMA_RPC_URL=https://testnet-rpc.plasmadlt.com
PLASMA_USDT_ADDRESS=0x...  # USDT token address on Plasma testnet
GREEN_REWARD_CONTRACT_ADDRESS=0x...  # Deployed GreenReward contract address
PLASMA_RECIPIENT_ADDRESS=0x...  # Default recipient address (optional)

# Required for deployment and transactions
PRIVATE_KEY=0x...  # Your private key with funds
```

### 2. Deploy GreenReward Contract

```bash
# Deploy the contract on Plasma testnet
yarn hardhat run scripts/plasma/deployGreenReward.ts --network plasmaTestnet
```

This will:
- Deploy the `GreenReward` contract
- Print the contract address
- Ask you to add it to `.env` as `GREEN_REWARD_CONTRACT_ADDRESS`

### 3. Fund the Contract

The contract needs USDT tokens to distribute rewards. Transfer USDT to the contract address:

```bash
# Example: Transfer USDT to contract (adjust based on your setup)
# You'll need to use a script or interface to transfer USDT to the contract
```

### 4. Verify Setup

Check if everything is configured:

```bash
cd agents
python3 -c "from plasma_payout import check_plasma_setup; print(check_plasma_setup())"
```

## Usage

### Manual Payout

Send a reward manually:

```bash
yarn hardhat run scripts/plasma/plasmaPayout.ts --network plasmaTestnet \
  <recipient_address> \
  <amount_usdt> \
  "<reason>"
```

Example:
```bash
yarn hardhat run scripts/plasma/plasmaPayout.ts --network plasmaTestnet \
  0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  1.0 \
  "EXECUTE_BUY - Green Energy Verified"
```

### Automatic Payout (via AI Agent)

The Settlement Agent automatically calls the payout when:
1. Treasury Manager issues `EXECUTE_BUY` signal
2. All conditions are met (Green energy + FDC verified + XRP price < $1.10)

The agent will:
- Check Plasma configuration
- Send 1.00 USDT to `PLASMA_RECIPIENT_ADDRESS` (or default)
- Log transaction details
- Fall back to mock payment if Plasma is not configured

## How It Works

1. **GreenReward Contract**: Holds USDT and distributes rewards
2. **Plasma Paymaster**: Covers gas fees at the protocol level
3. **Settlement Agent**: Triggers payout when `EXECUTE_BUY` signal is received
4. **Zero Gas Fees**: Recipient receives USDT with $0 gas fees

## Contract Functions

### `sendGreenReward(address recipient, uint256 amount, string reason)`
- Sends USDT to recipient
- Only callable by contract owner
- Gas fees covered by Plasma Paymaster

### `sendBatchRewards(address[] recipients, uint256[] amounts, string reason)`
- Send rewards to multiple recipients at once
- Useful for batch operations

### `getContractBalance()`
- Returns current USDT balance of the contract

### `getRewardsForAddress(address recipient)`
- Returns total rewards sent to a specific address

## Troubleshooting

### "GREEN_REWARD_CONTRACT_ADDRESS not set"
- Deploy the contract first using `deployGreenReward.ts`
- Add the address to `.env`

### "Insufficient contract balance"
- Transfer USDT tokens to the contract address
- Check balance with `getContractBalance()`

### "Only contract owner can send rewards"
- Make sure `PRIVATE_KEY` in `.env` matches the contract owner
- The deployer becomes the owner

### "Plasma payout failed"
- Check network connectivity
- Verify RPC URL is correct
- Ensure you have enough ETH for gas (even though recipient pays $0, sender may need gas)
- Check Plasma testnet status

## Questions for Plasma Team

If you're at the event, ask the Plasma team:

1. **Chain ID**: What is the exact chain ID for Plasma testnet? (Currently set to 161221135, but verify)
2. **USDT Address**: What is the official USDT token address on Plasma testnet?
3. **Paymaster Details**: How exactly does the Protocol-Level Paymaster work? Any special configuration needed?
4. **Gas Requirements**: Does the sender need to pay gas, or is it completely gasless?
5. **Explorer**: What is the block explorer URL for Plasma testnet?

## Integration with Dashboard

The dashboard will show:
- Settlement status when payment is executed
- Transaction hash (if available)
- Amount sent
- Gas fee: $0.00

## Next Steps

1. Deploy contract on Plasma testnet
2. Fund contract with USDT
3. Test manual payout
4. Let AI agent trigger automatic payouts

Enjoy gasless rewards! 🚀💚

