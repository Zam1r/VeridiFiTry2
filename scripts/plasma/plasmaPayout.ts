import { ethers } from "ethers";
import "dotenv/config";
import hre from "hardhat";
import { GreenRewardInstance } from "../../typechain-types";

const GreenReward = artifacts.require("plasma/GreenReward");

/**
 * Plasma Payout Script
 * 
 * Sends 1.00 USDT to a user's address using Plasma's Protocol-Level Paymaster
 * This results in $0 gas fees for the recipient.
 * 
 * Usage:
 *   yarn hardhat run scripts/plasma/plasmaPayout.ts --network plasmaTestnet
 * 
 * Or call from code:
 *   const recipient = "0x...";
 *   const amount = ethers.parseUnits("1.0", 6); // 1 USDT (6 decimals)
 *   await sendGreenReward(recipient, amount, "EXECUTE_BUY - Green Energy Verified");
 */

// Configuration
const PLASMA_RPC = process.env.PLASMA_RPC_URL || "https://testnet-rpc.plasmadlt.com";
const GREEN_REWARD_CONTRACT = process.env.GREEN_REWARD_CONTRACT_ADDRESS || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

// Default reward amount: 1.00 USDT (6 decimals for USDT)
const DEFAULT_REWARD_AMOUNT = ethers.parseUnits("1.0", 6);

/**
 * Send green reward to recipient using Plasma Paymaster (gasless)
 * @param recipientAddress Address to receive the USDT reward
 * @param amount Amount in USDT (with 6 decimals), defaults to 1.00 USDT
 * @param reason Reason for the reward (e.g., "EXECUTE_BUY - Green Energy Verified")
 * @returns Transaction receipt
 */
export async function sendGreenReward(
    recipientAddress: string,
    amount: bigint = DEFAULT_REWARD_AMOUNT,
    reason: string = "EXECUTE_BUY - Green Energy Verified"
): Promise<any> {
    if (!GREEN_REWARD_CONTRACT) {
        throw new Error(
            "GREEN_REWARD_CONTRACT_ADDRESS not set in .env file.\n" +
            "Please deploy the GreenReward contract first using:\n" +
            "yarn hardhat run scripts/plasma/deployGreenReward.ts --network plasmaTestnet"
        );
    }

    if (!PRIVATE_KEY) {
        throw new Error("PRIVATE_KEY not set in .env file");
    }

    console.log("🌱 Sending Green Reward via Plasma Paymaster...\n");
    console.log("Recipient:", recipientAddress);
    console.log("Amount:", ethers.formatUnits(amount, 6), "USDT");
    console.log("Reason:", reason);
    console.log("Gas Fee: $0.00 (covered by Plasma Paymaster)\n");

    // Connect to Plasma testnet
    const provider = new ethers.JsonRpcProvider(PLASMA_RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // Get contract instance
    const greenReward = await GreenReward.at(GREEN_REWARD_CONTRACT);
    const contract = new ethers.Contract(
        GREEN_REWARD_CONTRACT,
        [
            "function sendGreenReward(address recipient, uint256 amount, string memory reason)",
            "function getContractBalance() view returns (uint256)",
            "function owner() view returns (address)",
        ],
        wallet
    );

    // Check contract balance
    const contractBalance = await contract.getContractBalance();
    console.log("Contract USDT Balance:", ethers.formatUnits(contractBalance, 6), "USDT");

    if (contractBalance < amount) {
        throw new Error(
            `Insufficient contract balance. Need ${ethers.formatUnits(amount, 6)} USDT, ` +
            `but contract has ${ethers.formatUnits(contractBalance, 6)} USDT`
        );
    }

    // Check if caller is owner
    const owner = await contract.owner();
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        throw new Error(
            `Only contract owner can send rewards. Owner: ${owner}, Caller: ${wallet.address}`
        );
    }

    // Send the reward
    // Note: On Plasma, the transaction itself may have gas, but the recipient
    // receives the USDT with $0 gas fees due to Protocol-Level Paymaster
    console.log("Sending transaction...\n");
    
    try {
        // Using ethers v6
        const tx = await contract.sendGreenReward(recipientAddress, amount, reason, {
            // Gas is covered by Plasma Paymaster, but we still need to specify gas limit
            gasLimit: 200000,
        });

        console.log("Transaction hash:", tx.hash);
        console.log("Waiting for confirmation...\n");

        const receipt = await tx.wait();
        
        console.log("✅ Green Reward sent successfully!");
        console.log("Transaction hash:", receipt.hash);
        console.log("Block number:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("\n💚 Recipient received", ethers.formatUnits(amount, 6), "USDT with $0 gas fees!\n");

        return receipt;
    } catch (error: any) {
        console.error("❌ Error sending reward:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
        throw error;
    }
}

/**
 * Main function for CLI usage
 */
async function main() {
    // Get recipient from command line args or use default
    const recipient = process.argv[2] || process.env.PLASMA_RECIPIENT_ADDRESS || "";
    
    if (!recipient) {
        console.error("Usage: yarn hardhat run scripts/plasma/plasmaPayout.ts --network plasmaTestnet <recipient_address>");
        console.error("Or set PLASMA_RECIPIENT_ADDRESS in .env");
        process.exit(1);
    }

    // Validate address
    if (!ethers.isAddress(recipient)) {
        throw new Error(`Invalid recipient address: ${recipient}`);
    }

    // Get amount from args or use default
    const amountArg = process.argv[3];
    const amount = amountArg 
        ? ethers.parseUnits(amountArg, 6)
        : DEFAULT_REWARD_AMOUNT;

    const reason = process.argv[4] || "EXECUTE_BUY - Green Energy Verified";

    await sendGreenReward(recipient, amount, reason);
}

// Run if called directly
if (require.main === module) {
    void main()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

