# Plasma Settlement Script - Gasless USDT Rewards

Standalone TypeScript script for executing gasless USDT rewards on Plasma Testnet using the built-in Paymaster.

## Features

- ✅ **100% Gasless Transactions**: Recipient receives USDT with $0 gas fees
- ✅ **Plasma Paymaster Integration**: Uses Plasma's built-in Paymaster to cover gas
- ✅ **SignerPaymaster Support**: Compatible with `@holdstation/paymaster-helper` if installed
- ✅ **Dual Mode**: Can use GreenReward contract or direct USDT transfer
- ✅ **Standalone**: No Hardhat dependency - runs with `ts-node`

## Installation

### Option 1: With @holdstation/paymaster-helper (Recommended)

```bash
yarn add @holdstation/paymaster-helper
```

### Option 2: Without (Uses Plasma Built-in Paymaster)

No additional installation needed - script will use Plasma's built-in Paymaster.

## Configuration

Add to your `.env` file:

```env
# Plasma Network
PLASMA_RPC_URL=https://testnet-rpc.plasmadlt.com
PRIVATE_KEY=0x...  # Your private key with USDT balance
PLASMA_USDT_ADDRESS=0x...  # USDT token address on Plasma testnet

# Optional: Use GreenReward contract
GREEN_REWARD_CONTRACT_ADDRESS=0x...  # If using contract-based rewards
```

## Usage

### Direct USDT Transfer

```bash
npx ts-node scripts/plasma/plasma_settlement.ts <userAddress> <amount>
```

Example:
```bash
npx ts-node scripts/plasma/plasma_settlement.ts 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 1.0
```

### Using GreenReward Contract

If `GREEN_REWARD_CONTRACT_ADDRESS` is set in `.env`, the script will automatically use the contract:

```bash
npx ts-node scripts/plasma/plasma_settlement.ts 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 1.0
```

## How It Works

### 1. SignerPaymaster Pattern (if @holdstation/paymaster-helper installed)

The script uses `SignerPaymaster` from `@holdstation/paymaster-helper` to:
- Prepare transactions with paymaster sponsorship
- Sign transactions such that the Paymaster covers gas fees
- Send transactions that result in 100% free receipt for users

### 2. Plasma Built-in Paymaster (fallback)

If `@holdstation/paymaster-helper` is not available, the script uses Plasma's built-in Paymaster:
- Plasma automatically sponsors transactions for whitelisted tokens (like USDT)
- Gas fees are deducted from the paymaster's balance
- Recipient receives 100% of the USDT reward

## Function: `executeReward(userAddress, amount)`

```typescript
export async function executeReward(
    userAddress: string,
    amount: string | number
): Promise<ethers.ContractReceipt>
```

**Parameters:**
- `userAddress`: Recipient's Ethereum address
- `amount`: Amount in USDT (e.g., "1.0" for 1 USDT)

**Returns:**
- Transaction receipt with all details

**Example:**
```typescript
import { executeReward } from "./plasma_settlement";

const receipt = await executeReward(
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "1.0"
);

console.log("Transaction hash:", receipt.hash);
console.log("Gas used:", receipt.gasUsed.toString());
```

## Transaction Flow

1. **Connect to Plasma Testnet** via RPC
2. **Check balances** (signer must have USDT)
3. **Prepare transaction** with paymaster sponsorship
4. **Sign transaction** (Paymaster covers gas)
5. **Send transaction** to Plasma network
6. **Wait for confirmation**
7. **Recipient receives USDT** with $0 gas fees

## Output Example

```
🌱 Plasma Settlement - Gasless USDT Reward
============================================================
Network: { name: 'plasma-testnet', chainId: 9745n }
Signer address: 0x...
Recipient address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
USDT token address: 0x...
Amount: 1.0 USDT
============================================================

Signer USDT balance: 10.0 USDT

📤 Sending gasless transaction...
Gas Limit: 65000
Gas Price: 0 (Paymaster sponsored)

💡 Note: Plasma Paymaster will cover all gas fees

Transaction hash: 0x...
Waiting for confirmation...

============================================================
✅ Gasless USDT Reward Executed Successfully!
============================================================
Transaction hash: 0x...
Block number: 12345
Gas used: 65000
Amount sent: 1.0 USDT
Recipient: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

💚 Recipient received 100% of the reward - $0 gas fees!
💚 Gas fees were covered by Plasma Paymaster
```

## Integration with AI Agent

The script can be called from the Settlement Agent:

```python
# In agents/plasma_payout.py
import subprocess

result = subprocess.run([
    "npx", "ts-node", 
    "scripts/plasma/plasma_settlement.ts",
    recipient_address,
    "1.0"
], capture_output=True, text=True)
```

## Troubleshooting

### "PRIVATE_KEY not set"
- Add `PRIVATE_KEY=0x...` to `.env`

### "PLASMA_USDT_ADDRESS not set"
- Add `PLASMA_USDT_ADDRESS=0x...` to `.env`
- Get the address from Plasma team

### "Insufficient balance"
- Ensure signer has enough USDT tokens
- Check balance: `yarn hardhat run scripts/plasma/verifySetup.ts --network plasmaTestnet`

### "@holdstation/paymaster-helper not found"
- This is normal - script will use Plasma's built-in Paymaster
- To use SignerPaymaster: `yarn add @holdstation/paymaster-helper`

## Notes

- **Gas Fees**: Completely covered by Plasma Paymaster
- **Recipient Cost**: $0.00 - receives 100% of reward amount
- **Network**: Plasma Testnet (chain ID: 9745)
- **Token**: USDT (6 decimals typically)

## Next Steps

1. ✅ Install dependencies (optional): `yarn add @holdstation/paymaster-helper`
2. ✅ Configure `.env` with required variables
3. ✅ Test with small amount: `npx ts-node scripts/plasma/plasma_settlement.ts <address> 0.1`
4. ✅ Integrate with Settlement Agent for automatic rewards

Enjoy gasless rewards! 🚀💚

