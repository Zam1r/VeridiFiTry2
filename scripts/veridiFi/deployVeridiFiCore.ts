import { run } from "hardhat";
import fs from "fs";
import { VeridiFiCoreInstance } from "../../typechain-types";

const VeridiFiCore = artifacts.require("VeridiFiCore");

// yarn hardhat run scripts/veridiFi/deployVeridiFiCore.ts --network coston2

async function deployAndVerify() {
    const args: any[] = [];
    const veridiFiCore: VeridiFiCoreInstance = await VeridiFiCore.new(...args);

    try {
        await run("verify:verify", {
            address: veridiFiCore.address,
            constructorArguments: args,
        });
    } catch (e: any) {
        console.log(e);
    }

    console.log("VeridiFiCore deployed to:", veridiFiCore.address, "\n");
    console.log("FDC Hub address:", await veridiFiCore.FDC_HUB(), "\n");
    console.log("Carbon Intensity API URL:", await veridiFiCore.CARBON_INTENSITY_API_URL(), "\n");

    // Save address to file for easy reference
    const deployFileContent = `export const veridiFiCoreAddress = "${veridiFiCore.address}";\n`;
    fs.writeFileSync(`scripts/veridiFi/deploys.ts`, deployFileContent);
    console.log("Address saved to scripts/veridiFi/deploys.ts\n");

    return veridiFiCore;
}

void deployAndVerify()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
