import hre from "hardhat";
import { GreenRewardInstance } from "../../typechain-types";

const GreenReward = artifacts.require("plasma/GreenReward");

/**
 * Deploy GreenReward contract on Plasma Testnet
 * 
 * Usage:
 *   yarn hardhat run scripts/plasma/deployGreenReward.ts --network plasmaTestnet
 * 
 * Make sure to set:
 *   - PRIVATE_KEY in .env
 *   - PLASMA_USDT_ADDRESS in .env (USDT token address on Plasma testnet)
 */
async function main() {
    console.log("Deploying GreenReward contract on Plasma Testnet...\n");

    const accounts = await hre.web3.eth.getAccounts();
    const deployer = accounts[0];

    console.log("Deployer address:", deployer);
    const balance = await hre.web3.eth.getBalance(deployer);
    console.log("Deployer balance:", hre.web3.utils.fromWei(balance.toString(), "ether"), "ETH\n");

    // Get USDT address from environment or use default
    const USDT_ADDRESS = process.env.PLASMA_USDT_ADDRESS || process.env.USDT_ADDRESS || "";
    
    if (!USDT_ADDRESS) {
        throw new Error(
            "Please set PLASMA_USDT_ADDRESS in your .env file.\n" +
            "This should be the USDT token contract address on Plasma testnet."
        );
    }

    console.log("USDT Token Address:", USDT_ADDRESS, "\n");

    // Deploy the contract
    const greenReward: GreenRewardInstance = await GreenReward.new(USDT_ADDRESS, {
        from: deployer,
    });

    console.log("✅ GreenReward contract deployed!");
    console.log("Contract address:", greenReward.address);
    console.log("\n📝 Add this to your .env file:");
    console.log(`GREEN_REWARD_CONTRACT_ADDRESS=${greenReward.address}\n`);

    // Verify the contract (optional)
    if (hre.network.name !== "hardhat") {
        console.log("Waiting for block confirmations before verification...\n");
        await new Promise((resolve) => setTimeout(resolve, 10000));

        try {
            await hre.run("verify:verify", {
                address: greenReward.address,
                constructorArguments: [USDT_ADDRESS],
            });
            console.log("✅ Contract verified on explorer\n");
        } catch (error: any) {
            console.log("⚠️  Verification failed:", error.message, "\n");
        }
    }

    console.log("🎉 Deployment complete!");
    console.log("\nNext steps:");
    console.log("1. Fund the contract with USDT tokens");
    console.log("2. Update GREEN_REWARD_CONTRACT_ADDRESS in .env");
    console.log("3. Use the contract with plasmaPayout.ts script");
}

void main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

