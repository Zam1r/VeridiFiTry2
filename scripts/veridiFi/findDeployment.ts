import { web3 } from "hardhat";
import { VeridiFiCoreInstance } from "../../typechain-types";

const VeridiFiCore = artifacts.require("VeridiFiCore");

// This script helps you find your deployed VeridiFiCore address
// Usage: yarn hardhat run scripts/veridiFi/findDeployment.ts --network coston2

async function main() {
    const accounts = await web3.eth.getAccounts();
    const deployer = accounts[0];

    console.log("Searching for VeridiFiCore deployments from:", deployer, "\n");

    // Get recent transactions from the deployer
    const latestBlock = await web3.eth.getBlockNumber();
    console.log("Current block:", latestBlock, "\n");
    console.log("Checking last 100 blocks for contract creations...\n");

    let found = false;
    const checkBlocks = 100;

    for (let i = 0; i < checkBlocks; i++) {
        const blockNumber = latestBlock - i;
        try {
            const block = await web3.eth.getBlock(blockNumber, true);
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    if (typeof tx === "object" && tx.from && tx.from.toLowerCase() === deployer.toLowerCase()) {
                        if (tx.to === null || tx.to === "0x") {
                            // This is a contract creation
                            const receipt = await web3.eth.getTransactionReceipt(tx.hash);
                            if (receipt && receipt.contractAddress) {
                                try {
                                    // Try to verify it's a VeridiFiCore contract
                                    const contract = await VeridiFiCore.at(receipt.contractAddress);
                                    const fdcHub = await contract.FDC_HUB();
                                    if (fdcHub) {
                                        console.log("✅ Found VeridiFiCore contract!");
                                        console.log("Address:", receipt.contractAddress, "\n");
                                        console.log("Block:", blockNumber);
                                        console.log("Transaction:", tx.hash, "\n");
                                        found = true;
                                        break;
                                    }
                                } catch (e) {
                                    // Not a VeridiFiCore contract, continue
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // Block might not exist, continue
        }
        if (found) break;
    }

    if (!found) {
        console.log("❌ Could not find VeridiFiCore deployment in recent blocks.");
        console.log("Please check your terminal history or the blockchain explorer.\n");
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
