import hre from "hardhat";
import { PriceOracleInstance } from "../../typechain-types";

const PriceOracle = artifacts.require("PriceOracle");

// yarn hardhat run scripts/deployPriceOracle.ts --network coston2
async function main() {
    console.log("Deploying PriceOracle contract...\n");

    const accounts = await hre.web3.eth.getAccounts();
    const deployer = accounts[0];

    console.log("Deployer address:", deployer);
    console.log("Deployer balance:", hre.web3.utils.fromWei(await hre.web3.eth.getBalance(deployer), "ether"), "FLR\n");

    const priceOracle: PriceOracleInstance = await PriceOracle.new({ from: deployer });

    console.log("✅ PriceOracle deployed!");
    console.log("Contract address:", priceOracle.address);
    console.log("\n📝 Add this to your .env file:");
    console.log(`PRICE_ORACLE_ADDRESS=${priceOracle.address}\n`);

    // Verify the contract (optional)
    if (hre.network.name !== "hardhat") {
        console.log("Waiting for block confirmations before verification...\n");
        await new Promise((resolve) => setTimeout(resolve, 10000));

        try {
            await hre.run("verify:verify", {
                address: priceOracle.address,
                constructorArguments: [],
            });
            console.log("✅ Contract verified on explorer\n");
        } catch (error: any) {
            console.log("⚠️  Verification failed:", error.message, "\n");
        }
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

