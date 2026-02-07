import { ethers } from "ethers";
import "dotenv/config";

/**
 * Verify Plasma Network Setup
 * 
 * Checks if all required configuration is in place for Plasma payouts
 * 
 * Usage:
 *   yarn hardhat run scripts/plasma/verifySetup.ts --network plasmaTestnet
 */

const PLASMA_RPC = process.env.PLASMA_RPC_URL || "https://testnet-rpc.plasmadlt.com";
const GREEN_REWARD_CONTRACT = process.env.GREEN_REWARD_CONTRACT_ADDRESS || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const USDT_ADDRESS = process.env.PLASMA_USDT_ADDRESS || "";

async function main() {
    console.log("🔍 Verifying Plasma Network Setup...\n");
    console.log("=".repeat(60));

    // Check environment variables
    console.log("\n📋 Environment Variables:");
    console.log(`   PLASMA_RPC_URL: ${PLASMA_RPC || "❌ NOT SET"}`);
    console.log(`   GREEN_REWARD_CONTRACT_ADDRESS: ${GREEN_REWARD_CONTRACT || "❌ NOT SET"}`);
    console.log(`   PRIVATE_KEY: ${PRIVATE_KEY ? "✅ SET" : "❌ NOT SET"}`);
    console.log(`   PLASMA_USDT_ADDRESS: ${USDT_ADDRESS || "⚠️  NOT SET (optional)"}`);

    // Test RPC connection
    console.log("\n🌐 Testing RPC Connection:");
    console.log(`   Attempting to connect to: ${PLASMA_RPC}`);
    
    try {
        const provider = new ethers.JsonRpcProvider(PLASMA_RPC);
        
        // Try with timeout
        const network = await Promise.race([
            provider.getNetwork(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout after 10 seconds")), 10000))
        ]) as any;
        
        const blockNumber = await provider.getBlockNumber();
        
        console.log(`   ✅ Connected to Plasma Testnet`);
        console.log(`   Chain ID: ${network.chainId}`);
        console.log(`   Latest Block: ${blockNumber}`);
        
        // Note: Verify chain ID with Plasma team
        console.log(`   ⚠️  Note: Please verify chain ID ${network.chainId} with Plasma team`);
    } catch (error: any) {
        console.log(`   ❌ RPC connection failed: ${error.message}`);
        console.log(`\n💡 Troubleshooting:`);
        console.log(`   1. The RPC URL might be incorrect`);
        console.log(`   2. Check if the domain exists: testnet-rpc.plasmadlt.com`);
        console.log(`   3. Ask Plasma team for the correct RPC URL`);
        console.log(`   4. Try alternative RPC URLs if provided`);
        console.log(`\n📋 Questions to ask Plasma team:`);
        console.log(`   - What is the correct RPC URL for Plasma testnet?`);
        console.log(`   - Is it https://testnet-rpc.plasmadlt.com or something else?`);
        console.log(`   - Are there alternative RPC endpoints?`);
        console.log(`   - Do you need an API key?`);
        console.log(`\n🔄 You can update the RPC URL in your .env file:`);
        console.log(`   PLASMA_RPC_URL=<correct_url_from_plasma_team>`);
        
        // Don't return, continue with other checks
    }

    // Check contract if address is provided
    if (GREEN_REWARD_CONTRACT) {
        console.log("\n📄 Checking GreenReward Contract:");
        try {
            const provider = new ethers.JsonRpcProvider(PLASMA_RPC);
            const code = await provider.getCode(GREEN_REWARD_CONTRACT);
            
            if (code === "0x") {
                console.log(`   ❌ No contract code at ${GREEN_REWARD_CONTRACT}`);
                console.log(`   💡 Deploy the contract first: yarn hardhat run scripts/plasma/deployGreenReward.ts --network plasmaTestnet`);
            } else {
                console.log(`   ✅ Contract code found`);
                console.log(`   Code length: ${code.length} bytes`);
                
                // Try to call a view function
                const contract = new ethers.Contract(
                    GREEN_REWARD_CONTRACT,
                    [
                        "function getContractBalance() view returns (uint256)",
                        "function owner() view returns (address)",
                        "function totalRewardsDistributed() view returns (uint256)",
                    ],
                    provider
                );
                
                try {
                    const balance = await contract.getContractBalance();
                    const owner = await contract.owner();
                    const totalRewards = await contract.totalRewardsDistributed();
                    
                    console.log(`   Contract Balance: ${ethers.formatUnits(balance, 6)} USDT`);
                    console.log(`   Owner: ${owner}`);
                    console.log(`   Total Rewards Distributed: ${ethers.formatUnits(totalRewards, 6)} USDT`);
                    
                    // Check if caller is owner
                    if (PRIVATE_KEY) {
                        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
                        if (owner.toLowerCase() === wallet.address.toLowerCase()) {
                            console.log(`   ✅ Your address is the contract owner`);
                        } else {
                            console.log(`   ⚠️  Your address is NOT the contract owner`);
                            console.log(`   Your address: ${wallet.address}`);
                        }
                    }
                } catch (e: any) {
                    console.log(`   ⚠️  Could not read contract state: ${e.message}`);
                }
            }
        } catch (error: any) {
            console.log(`   ❌ Error checking contract: ${error.message}`);
        }
    } else {
        console.log("\n📄 GreenReward Contract:");
        console.log(`   ⚠️  GREEN_REWARD_CONTRACT_ADDRESS not set`);
        console.log(`   💡 Deploy the contract first: yarn hardhat run scripts/plasma/deployGreenReward.ts --network plasmaTestnet`);
    }

    // Check USDT token if address is provided
    if (USDT_ADDRESS) {
        console.log("\n💰 Checking USDT Token:");
        try {
            const provider = new ethers.JsonRpcProvider(PLASMA_RPC);
            const code = await provider.getCode(USDT_ADDRESS);
            
            if (code === "0x") {
                console.log(`   ❌ No contract code at ${USDT_ADDRESS}`);
            } else {
                console.log(`   ✅ USDT token contract found`);
                
                const token = new ethers.Contract(
                    USDT_ADDRESS,
                    [
                        "function name() view returns (string)",
                        "function symbol() view returns (string)",
                        "function decimals() view returns (uint8)",
                    ],
                    provider
                );
                
                try {
                    const name = await token.name();
                    const symbol = await token.symbol();
                    const decimals = await token.decimals();
                    
                    console.log(`   Name: ${name}`);
                    console.log(`   Symbol: ${symbol}`);
                    console.log(`   Decimals: ${decimals}`);
                } catch (e: any) {
                    console.log(`   ⚠️  Could not read token info: ${e.message}`);
                }
            }
        } catch (error: any) {
            console.log(`   ❌ Error checking USDT token: ${error.message}`);
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Setup verification complete!");
    console.log("\n💡 Questions to ask Plasma team:");
    console.log("   1. What is the exact chain ID for Plasma testnet?");
    console.log("   2. What is the USDT token address on Plasma testnet?");
    console.log("   3. How does the Protocol-Level Paymaster work?");
    console.log("   4. Does the sender need to pay gas, or is it completely gasless?");
    console.log("   5. What is the block explorer URL?");
}

void main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

