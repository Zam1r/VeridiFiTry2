import { ethers } from "ethers";
import "dotenv/config";
import hre from "hardhat";

/**
 * Fund GreenReward Contract with USDT
 * 
 * Transfers USDT tokens to the GreenReward contract so it can distribute rewards
 * 
 * Usage:
 *   yarn hardhat run scripts/plasma/fundContract.ts --network plasmaTestnet
 * 
 * Make sure to set:
 *   - PRIVATE_KEY in .env (sender account with USDT)
 *   - GREEN_REWARD_CONTRACT_ADDRESS in .env
 *   - PLASMA_USDT_ADDRESS in .env
 */

const PLASMA_RPC = process.env.PLASMA_RPC_URL || "https://testnet-rpc.plasmadlt.com";
const GREEN_REWARD_CONTRACT = process.env.GREEN_REWARD_CONTRACT_ADDRESS || "";
const USDT_ADDRESS = process.env.PLASMA_USDT_ADDRESS || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

async function main() {
    console.log("💰 Funding GreenReward Contract with USDT...\n");
    console.log("=".repeat(60));

    if (!GREEN_REWARD_CONTRACT) {
        throw new Error("GREEN_REWARD_CONTRACT_ADDRESS not set in .env");
    }

    if (!USDT_ADDRESS) {
        throw new Error("PLASMA_USDT_ADDRESS not set in .env");
    }

    if (!PRIVATE_KEY) {
        throw new Error("PRIVATE_KEY not set in .env");
    }

    // Connect to network
    const provider = new ethers.JsonRpcProvider(PLASMA_RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("Sender address:", wallet.address);
    console.log("Contract address:", GREEN_REWARD_CONTRACT);
    console.log("USDT token address:", USDT_ADDRESS, "\n");

    // Get USDT contract
    const usdtAbi = [
        "function balanceOf(address) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
    ];

    const usdtContract = new ethers.Contract(USDT_ADDRESS, usdtAbi, wallet);

    // Check sender balance
    const senderBalance = await usdtContract.balanceOf(wallet.address);
    const decimals = await usdtContract.decimals();
    const symbol = await usdtContract.symbol();

    console.log(`Sender ${symbol} balance: ${ethers.formatUnits(senderBalance, decimals)} ${symbol}`);

    if (senderBalance === 0n) {
        console.log("\n⚠️  You have no USDT tokens!");
        console.log("💡 Ask Plasma team: 'How do I get test USDT tokens on Plasma testnet?'");
        console.log("💡 Or check if there's a faucet available");
        return;
    }

    // Get amount to transfer (default: 10 USDT, or from command line)
    const amountArg = process.argv[2];
    const amountUsdt = amountArg ? parseFloat(amountArg) : 10.0;
    const amountWei = ethers.parseUnits(amountUsdt.toString(), decimals);

    if (senderBalance < amountWei) {
        console.log(`\n❌ Insufficient balance. Need ${amountUsdt} ${symbol}, but have ${ethers.formatUnits(senderBalance, decimals)} ${symbol}`);
        return;
    }

    // Check current contract balance
    const contractBalance = await usdtContract.balanceOf(GREEN_REWARD_CONTRACT);
    console.log(`Contract ${symbol} balance: ${ethers.formatUnits(contractBalance, decimals)} ${symbol}\n`);

    // Confirm transfer
    console.log(`📤 Transferring ${amountUsdt} ${symbol} to contract...`);
    console.log(`   From: ${wallet.address}`);
    console.log(`   To: ${GREEN_REWARD_CONTRACT}`);
    console.log(`   Amount: ${amountUsdt} ${symbol}\n`);

    // Transfer USDT to contract
    try {
        const tx = await usdtContract.transfer(GREEN_REWARD_CONTRACT, amountWei, {
            gasLimit: 100000,
        });

        console.log("Transaction hash:", tx.hash);
        console.log("Waiting for confirmation...\n");

        const receipt = await tx.wait();

        console.log("✅ Transfer successful!");
        console.log("Block number:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());

        // Check new contract balance
        const newContractBalance = await usdtContract.balanceOf(GREEN_REWARD_CONTRACT);
        console.log(`\nNew contract ${symbol} balance: ${ethers.formatUnits(newContractBalance, decimals)} ${symbol}`);

        console.log("\n🎉 Contract is now funded and ready to send rewards!");
        console.log("\nNext steps:");
        console.log("1. Test manual payout: yarn hardhat run scripts/plasma/plasmaPayout.ts --network plasmaTestnet <recipient> 1.0");
        console.log("2. Let AI agent trigger automatic payouts when EXECUTE_BUY signal is received");

    } catch (error: any) {
        console.error("❌ Transfer failed:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
        throw error;
    }
}

void main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

