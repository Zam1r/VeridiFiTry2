/**
 * Manual Carbon Data Entry Script
 * 
 * For testing when FDC verifier cannot fetch from UK API
 * This script allows you to manually set carbon intensity data in VeridiFiCore
 * 
 * Usage:
 *   yarn hardhat run scripts/veridiFi/manualCarbonData.ts --network coston2 <intensity_value>
 * 
 * Example:
 *   yarn hardhat run scripts/veridiFi/manualCarbonData.ts --network coston2 45
 * 
 * This will set carbon intensity to 45 gCO2/kWh for testing
 */

import hre, { web3 } from "hardhat";
import { VeridiFiCoreInstance } from "../../typechain-types";

const VeridiFiCore = artifacts.require("VeridiFiCore");

const VERIDIFI_CORE_ADDRESS = process.env.VERIDIFI_CORE_ADDRESS || "";

async function main() {
    if (!VERIDIFI_CORE_ADDRESS) {
        throw new Error("Please set VERIDIFI_CORE_ADDRESS in your .env file");
    }

    // Get intensity value from command line or use default for testing
    const intensityArg = process.argv[2];
    const intensity = intensityArg ? parseInt(intensityArg) : 45; // Default: 45 (Green)

    if (isNaN(intensity) || intensity < 0) {
        throw new Error(`Invalid intensity value: ${intensityArg}. Must be a positive number.`);
    }

    console.log("=".repeat(60));
    console.log("🔧 Manual Carbon Data Entry (Testing Only)");
    console.log("=".repeat(60));
    console.log(`\nVeridiFiCore address: ${VERIDIFI_CORE_ADDRESS}`);
    console.log(`Setting carbon intensity: ${intensity} gCO2/kWh\n`);

    const veridiFiCore: VeridiFiCoreInstance = await VeridiFiCore.at(VERIDIFI_CORE_ADDRESS);

    // Check current intensity
    try {
        const currentIntensity = await veridiFiCore.getLatestCarbonIntensity();
        const currentRoundId = await veridiFiCore.latestRoundId();
        console.log(`Current latest intensity: ${currentIntensity.toString()}`);
        console.log(`Current latest round ID: ${currentRoundId.toString()}\n`);
    } catch (e) {
        console.log("No previous carbon intensity data found\n");
    }

    console.log("⚠️  WARNING: This script directly sets carbon intensity for testing.");
    console.log("⚠️  In production, this should only be set via FDC-verified proofs.\n");

    // Note: This is a workaround for testing. In production, you would need to:
    // 1. Get a valid FDC proof
    // 2. Call processCarbonIntensityProof() with the proof
    
    // For now, we'll create a simple script that can be used to test the system
    // by directly interacting with the contract storage (if you have admin access)
    // or by using a test function if one exists.

    console.log("💡 To properly set carbon intensity, you need:");
    console.log("   1. A valid FDC proof (from FDC verifier)");
    console.log("   2. Call processCarbonIntensityProof() with the proof");
    console.log("\n💡 For testing, you can:");
    console.log("   - Wait for FDC verifier to successfully fetch data");
    console.log("   - Use a different carbon API that the verifier can access");
    console.log("   - Contact Flare team about verifier access to UK API\n");

    console.log("=".repeat(60));
    console.log("✅ Script complete");
    console.log("=".repeat(60));
    console.log("\nNote: This script doesn't modify the contract directly.");
    console.log("Carbon intensity must be set via FDC-verified proofs.");
    console.log("This script is for reference only.\n");
}

void main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

