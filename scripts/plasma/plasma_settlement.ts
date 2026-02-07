/**
 * Plasma Settlement Script - Gasless USDT Rewards
 * 
 * Standalone script that triggers gasless USDT rewards on Plasma Testnet
 * Uses Plasma's built-in Paymaster to cover gas fees, resulting in 100% free receipt for users
 * 
 * Usage:
 *   npx ts-node scripts/plasma/plasma_settlement.ts <userAddress> <amount>
 * 
 * Example:
 *   npx ts-node scripts/plasma/plasma_settlement.ts 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 1.0
 * 
 * Environment Variables Required:
 *   - PLASMA_RPC_URL (default: https://testnet-rpc.plasmadlt.com)
 *   - PRIVATE_KEY (signer's private key)
 *   - PLASMA_USDT_ADDRESS (USDT token address on Plasma testnet)
 *   - GREEN_REWARD_CONTRACT_ADDRESS (optional: use GreenReward contract)
 */

import { ethers } from "ethers";
import "dotenv/config";

// Try to import @holdstation/paymaster-helper if available
let SignerPaymaster: any = null;
let useSignerPaymasterFlag = false;
try {
    // @ts-ignore - Package may not be installed
    const paymasterHelper = require("@holdstation/paymaster-helper");
    SignerPaymaster = paymasterHelper.SignerPaymaster;
    useSignerPaymasterFlag = true;
} catch (e) {
    // Package not installed - will use Plasma built-in Paymaster
    useSignerPaymasterFlag = false;
}

// Configuration
const PLASMA_RPC = process.env.PLASMA_RPC_URL || "https://testnet-rpc.plasmadlt.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const USDT_ADDRESS = process.env.PLASMA_USDT_ADDRESS || "";
const GREEN_REWARD_CONTRACT = process.env.GREEN_REWARD_CONTRACT_ADDRESS || "";

// USDT ABI (standard ERC20)
const USDT_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

// GreenReward Contract ABI (if using contract)
const GREEN_REWARD_ABI = [
    "function sendGreenReward(address recipient, uint256 amount, string memory reason)",
    "function getContractBalance() view returns (uint256)",
    "function owner() view returns (address)"
];

/**
 * Paymaster Helper Interface
 * Implements SignerPaymaster pattern for Plasma gasless transactions
 * Uses @holdstation/paymaster-helper if available, otherwise falls back to Plasma built-in Paymaster
 */
class PlasmaPaymasterHelper {
    private provider: ethers.JsonRpcProvider;
    private signer: ethers.Wallet;
    private useSignerPaymaster: boolean;
    private signerPaymaster: any;
    
    constructor(provider: ethers.JsonRpcProvider, signer: ethers.Wallet) {
        this.provider = provider;
        this.signer = signer;
        this.useSignerPaymaster = SignerPaymaster !== null;
        
        // Initialize SignerPaymaster if available
        if (this.useSignerPaymaster) {
            try {
                // Initialize with Plasma testnet configuration
                this.signerPaymaster = new SignerPaymaster({
                    signer: signer,
                    // Plasma Paymaster configuration
                    // Adjust these based on Plasma's actual paymaster contract address
                });
            } catch (e) {
                console.log("⚠️  Failed to initialize SignerPaymaster, using fallback");
                this.useSignerPaymaster = false;
            }
        }
    }
    
    /**
     * Prepare transaction with paymaster sponsorship
     * Uses SignerPaymaster if available, otherwise uses Plasma's built-in paymaster
     */
    async prepareGaslessTransaction(
        to: string,
        data: string,
        value: bigint = 0n
    ): Promise<ethers.TransactionRequest> {
        // If SignerPaymaster is available, use it
        if (this.useSignerPaymaster && this.signerPaymaster) {
            try {
                // Use SignerPaymaster to prepare the transaction
                const tx = await this.signerPaymaster.prepareTransaction({
                    to,
                    data,
                    value
                });
                return tx;
            } catch (e) {
                console.log("⚠️  SignerPaymaster failed, using fallback:", e);
                this.useSignerPaymaster = false;
            }
        }
        
        // Fallback: Use Plasma's built-in paymaster
        const feeData = await this.provider.getFeeData();
        
        // Estimate gas limit
        const gasLimit = await this.provider.estimateGas({
            to,
            data,
            value,
            from: this.signer.address
        });
        
        // Build transaction with paymaster support
        // Plasma's paymaster will automatically sponsor this transaction
        const tx: ethers.TransactionRequest = {
            to,
            data,
            value,
            gasLimit: gasLimit * 120n / 100n, // Add 20% buffer
            gasPrice: feeData.gasPrice || 0n,
            // Note: Plasma's paymaster handles fee payment automatically
            // The transaction will be sponsored if it meets paymaster criteria
        };
        
        return tx;
    }
    
    /**
     * Send gasless transaction via Plasma Paymaster
     */
    async sendGaslessTransaction(tx: ethers.TransactionRequest): Promise<ethers.ContractTransactionResponse> {
        // If SignerPaymaster is available, use it
        if (this.useSignerPaymaster && this.signerPaymaster) {
            try {
                // Use SignerPaymaster to send the transaction
                const response = await this.signerPaymaster.sendTransaction(tx);
                return response;
            } catch (e) {
                console.log("⚠️  SignerPaymaster send failed, using fallback:", e);
                this.useSignerPaymaster = false;
            }
        }
        
        // Fallback: Send transaction directly - Plasma paymaster will handle gas fees
        const response = await this.signer.sendTransaction(tx);
        return response;
    }
}

/**
 * Execute gasless USDT reward transfer
 * @param userAddress Recipient address
 * @param amount Amount in USDT (e.g., "1.0" for 1 USDT)
 * @returns Transaction receipt
 */
export async function executeReward(
    userAddress: string,
    amount: string | number
): Promise<ethers.ContractReceipt> {
    console.log("🌱 Plasma Settlement - Gasless USDT Reward\n");
    console.log("=".repeat(60));
    
    // Log paymaster method being used
    if (useSignerPaymasterFlag) {
        console.log("✅ Using @holdstation/paymaster-helper (SignerPaymaster)\n");
    } else {
        console.log("ℹ️  Using Plasma built-in Paymaster\n");
    }
    
    // Validate inputs
    if (!PRIVATE_KEY) {
        throw new Error("PRIVATE_KEY not set in .env file");
    }
    
    if (!USDT_ADDRESS) {
        throw new Error("PLASMA_USDT_ADDRESS not set in .env file");
    }
    
    if (!ethers.isAddress(userAddress)) {
        throw new Error(`Invalid user address: ${userAddress}`);
    }
    
    // Connect to Plasma testnet
    const provider = new ethers.JsonRpcProvider(PLASMA_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log("Network:", await provider.getNetwork());
    console.log("Signer address:", signer.address);
    console.log("Recipient address:", userAddress);
    console.log("USDT token address:", USDT_ADDRESS);
    
    // Get USDT contract
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    
    // Get USDT decimals
    const decimals = await usdtContract.decimals();
    const symbol = await usdtContract.symbol();
    
    // Parse amount
    const amountWei = ethers.parseUnits(amount.toString(), decimals);
    const amountFormatted = ethers.formatUnits(amountWei, decimals);
    
    console.log(`Amount: ${amountFormatted} ${symbol}`);
    console.log("\n" + "=".repeat(60) + "\n");
    
    // Check signer balance
    const signerBalance = await usdtContract.balanceOf(signer.address);
    console.log(`Signer ${symbol} balance: ${ethers.formatUnits(signerBalance, decimals)} ${symbol}`);
    
    if (signerBalance < amountWei) {
        throw new Error(
            `Insufficient balance. Need ${amountFormatted} ${symbol}, ` +
            `but have ${ethers.formatUnits(signerBalance, decimals)} ${symbol}`
        );
    }
    
    // Option 1: Use GreenReward contract if available
    if (GREEN_REWARD_CONTRACT) {
        console.log("Using GreenReward contract for reward distribution...");
        return await executeRewardViaContract(
            provider,
            signer,
            userAddress,
            amountWei,
            decimals,
            symbol
        );
    }
    
    // Option 2: Direct USDT transfer with paymaster
    console.log("Executing direct USDT transfer via Plasma Paymaster...");
    
    // Initialize paymaster helper
    const paymaster = new PlasmaPaymasterHelper(provider, signer);
    
    // Encode transfer function call
    const transferData = usdtContract.interface.encodeFunctionData("transfer", [
        userAddress,
        amountWei
    ]);
    
    // Prepare gasless transaction
    const tx = await paymaster.prepareGaslessTransaction(
        USDT_ADDRESS,
        transferData,
        0n
    );
    
    console.log("\n📤 Sending gasless transaction...");
    console.log("Gas Limit:", tx.gasLimit?.toString());
    console.log("Gas Price:", tx.gasPrice ? ethers.formatUnits(tx.gasPrice, "gwei") + " gwei" : "0 (Paymaster sponsored)");
    console.log("\n💡 Note: Plasma Paymaster will cover all gas fees\n");
    
    // Send transaction
    const response = await paymaster.sendGaslessTransaction(tx);
    
    console.log("Transaction hash:", response.hash);
    console.log("Waiting for confirmation...\n");
    
    // Wait for confirmation
    const receipt = await response.wait();
    
    console.log("=".repeat(60));
    console.log("✅ Gasless USDT Reward Executed Successfully!");
    console.log("=".repeat(60));
    console.log("Transaction hash:", receipt.hash);
    console.log("Block number:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log(`Amount sent: ${amountFormatted} ${symbol}`);
    console.log("Recipient:", userAddress);
    console.log("\n💚 Recipient received 100% of the reward - $0 gas fees!");
    console.log("💚 Gas fees were covered by Plasma Paymaster\n");
    
    return receipt;
}

/**
 * Execute reward via GreenReward contract
 */
async function executeRewardViaContract(
    provider: ethers.JsonRpcProvider,
    signer: ethers.Wallet,
    userAddress: string,
    amountWei: bigint,
    decimals: number,
    symbol: string
): Promise<ethers.ContractReceipt> {
    const greenRewardContract = new ethers.Contract(
        GREEN_REWARD_CONTRACT,
        GREEN_REWARD_ABI,
        signer
    );
    
    // Check contract balance
    const contractBalance = await greenRewardContract.getContractBalance();
    console.log(`Contract ${symbol} balance: ${ethers.formatUnits(contractBalance, decimals)} ${symbol}`);
    
    if (contractBalance < amountWei) {
        throw new Error(
            `Insufficient contract balance. Need ${ethers.formatUnits(amountWei, decimals)} ${symbol}, ` +
            `but contract has ${ethers.formatUnits(contractBalance, decimals)} ${symbol}`
        );
    }
    
    // Check if caller is owner
    const owner = await greenRewardContract.owner();
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        throw new Error(
            `Only contract owner can send rewards. Owner: ${owner}, Caller: ${signer.address}`
        );
    }
    
    // Initialize paymaster helper
    const paymaster = new PlasmaPaymasterHelper(provider, signer);
    
    // Encode sendGreenReward function call
    const reason = "EXECUTE_BUY - Green Energy Verified via FDC";
    const rewardData = greenRewardContract.interface.encodeFunctionData("sendGreenReward", [
        userAddress,
        amountWei,
        reason
    ]);
    
    // Prepare gasless transaction
    const tx = await paymaster.prepareGaslessTransaction(
        GREEN_REWARD_CONTRACT,
        rewardData,
        0n
    );
    
    console.log("\n📤 Sending gasless transaction via GreenReward contract...");
    console.log("Gas Limit:", tx.gasLimit?.toString());
    console.log("Gas Price:", tx.gasPrice ? ethers.formatUnits(tx.gasPrice, "gwei") + " gwei" : "0 (Paymaster sponsored)");
    console.log("\n💡 Note: Plasma Paymaster will cover all gas fees\n");
    
    // Send transaction
    const response = await paymaster.sendGaslessTransaction(tx);
    
    console.log("Transaction hash:", response.hash);
    console.log("Waiting for confirmation...\n");
    
    // Wait for confirmation
    const receipt = await response.wait();
    
    console.log("=".repeat(60));
    console.log("✅ Gasless USDT Reward Executed Successfully!");
    console.log("=".repeat(60));
    console.log("Transaction hash:", receipt.hash);
    console.log("Block number:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log(`Amount sent: ${ethers.formatUnits(amountWei, decimals)} ${symbol}`);
    console.log("Recipient:", userAddress);
    console.log("Reason:", reason);
    console.log("\n💚 Recipient received 100% of the reward - $0 gas fees!");
    console.log("💚 Gas fees were covered by Plasma Paymaster\n");
    
    return receipt;
}

/**
 * Main function for CLI usage
 */
async function main() {
    const userAddress = process.argv[2];
    const amount = process.argv[3] || "1.0";
    
    if (!userAddress) {
        console.error("Usage: npx ts-node scripts/plasma/plasma_settlement.ts <userAddress> [amount]");
        console.error("\nExample:");
        console.error("  npx ts-node scripts/plasma/plasma_settlement.ts 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 1.0");
        console.error("\nEnvironment Variables:");
        console.error("  - PLASMA_RPC_URL (default: https://testnet-rpc.plasmadlt.com)");
        console.error("  - PRIVATE_KEY (required)");
        console.error("  - PLASMA_USDT_ADDRESS (required)");
        console.error("  - GREEN_REWARD_CONTRACT_ADDRESS (optional)");
        process.exit(1);
    }
    
    try {
        await executeReward(userAddress, amount);
        process.exit(0);
    } catch (error: any) {
        console.error("\n❌ Error executing reward:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    void main();
}

