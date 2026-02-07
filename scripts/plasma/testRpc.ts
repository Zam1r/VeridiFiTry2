import { ethers } from "ethers";
import "dotenv/config";

/**
 * Test different Plasma RPC URLs to find the correct one
 * 
 * Usage:
 *   yarn hardhat run scripts/plasma/testRpc.ts
 */

// Possible RPC URLs to test
const POSSIBLE_RPC_URLS = [
    "https://testnet-rpc.plasmadlt.com",
    "https://rpc.plasmadlt.com/testnet",
    "https://testnet.plasmadlt.com/rpc",
    "https://plasma-testnet.plasmadlt.com/rpc",
    // Add more URLs from Plasma team
];

async function testRpcUrl(url: string): Promise<{ success: boolean; chainId?: bigint; blockNumber?: number; error?: string }> {
    try {
        console.log(`\nTesting: ${url}`);
        const provider = new ethers.JsonRpcProvider(url);
        
        // Set timeout
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout after 10 seconds")), 10000)
        );
        
        const network = await Promise.race([provider.getNetwork(), timeout]) as any;
        const blockNumber = await provider.getBlockNumber();
        
        return {
            success: true,
            chainId: network.chainId,
            blockNumber: blockNumber
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function main() {
    console.log("🔍 Testing Plasma RPC URLs...\n");
    console.log("=".repeat(60));
    
    // Test URLs from environment first
    const envRpc = process.env.PLASMA_RPC_URL;
    if (envRpc) {
        console.log("\n📋 Testing RPC from .env file:");
        const result = await testRpcUrl(envRpc);
        if (result.success) {
            console.log(`   ✅ SUCCESS!`);
            console.log(`   Chain ID: ${result.chainId}`);
            console.log(`   Latest Block: ${result.blockNumber}`);
            console.log(`\n✅ Use this RPC URL: ${envRpc}`);
            return;
        } else {
            console.log(`   ❌ Failed: ${result.error}`);
        }
    }
    
    // Test possible URLs
    console.log("\n📋 Testing possible RPC URLs:");
    let foundWorking = false;
    
    for (const url of POSSIBLE_RPC_URLS) {
        const result = await testRpcUrl(url);
        if (result.success) {
            console.log(`   ✅ SUCCESS!`);
            console.log(`   Chain ID: ${result.chainId}`);
            console.log(`   Latest Block: ${result.blockNumber}`);
            console.log(`\n✅ Working RPC URL: ${url}`);
            console.log(`\n📝 Add this to your .env file:`);
            console.log(`   PLASMA_RPC_URL=${url}`);
            foundWorking = true;
            break;
        } else {
            console.log(`   ❌ Failed: ${result.error}`);
        }
    }
    
    if (!foundWorking) {
        console.log("\n" + "=".repeat(60));
        console.log("❌ None of the tested RPC URLs worked.");
        console.log("\n💡 Next Steps:");
        console.log("   1. Ask the Plasma team for the correct RPC URL");
        console.log("   2. Check if you need an API key");
        console.log("   3. Verify the network is accessible from your location");
        console.log("   4. Try using a VPN if there are network restrictions");
        console.log("\n📋 Questions for Plasma team:");
        console.log("   - What is the exact RPC URL for Plasma testnet?");
        console.log("   - Do I need an API key?");
        console.log("   - Are there any network requirements?");
        console.log("   - Is there a different endpoint format?");
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

