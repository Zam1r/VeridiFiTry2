import hre, { run, web3 } from "hardhat";
import { VeridiFiCoreInstance } from "../../typechain-types";
import { prepareAttestationRequestBase, retrieveDataAndProofBaseWithRetry, calculateRoundId } from "../utils/fdc";

const VeridiFiCore = artifacts.require("VeridiFiCore");

const { VERIFIER_URL_TESTNET, VERIFIER_API_KEY_TESTNET, COSTON2_DA_LAYER_URL } = process.env;

// yarn hardhat run scripts/veridiFi/submitCarbonIntensityRequest.ts --network coston2
// Make sure to set VERIDIFI_CORE_ADDRESS in your .env file or update the address below

// Carbon Intensity API configuration
// Using the official National Grid Carbon Intensity API
// Base URL: api.carbonintensity.org.uk
// Documentation: https://carbon-intensity.github.io/api-definitions/

// Option 1: Vercel serverless function (recommended - cleaner endpoint)
// Replace with your actual Vercel deployment URL:
// const apiUrl = "https://your-project.vercel.app/api/carbon-intensity";

// Option 2: Direct UK API (original - may be blocked by FDC verifier)
const apiUrl = "https://api.carbonintensity.org.uk/intensity";

// Option 3: Regional endpoint for Oxford (OX1 postcode) - uncomment to try
// const apiUrl = "https://api.carbonintensity.org.uk/regional/intensity/2024-01-01T00:00Z/2024-01-01T23:59Z/postcode/OX1";

// Option 4: Date-specific endpoint - uncomment to try
// const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
// const apiUrl = `https://api.carbonintensity.org.uk/intensity/date/${today}`;

const httpMethod = "GET";

// Minimal headers - official API doesn't require authentication
// Using minimal headers to avoid triggering bot detection
const headers = JSON.stringify({
    "Accept": "application/json",
    "User-Agent": "FlareFDC/1.0",
});
const queryParams = "{}";
const body = "{}";
// jq filter to extract the 'actual' intensity value
// For UK API: { data: [{ intensity: { actual: <number> } }] }
// For Vercel function: { actual: <number> } (already simplified)
// 
// If using Vercel endpoint, use: `{actual: .actual}`
// If using UK API, use: `{actual: .data[0].intensity.actual}`
const postProcessJq = `{actual: .data[0].intensity.actual}`; // For UK API
// const postProcessJq = `{actual: .actual}`; // For Vercel function
const abiSignature = `{"components": [{"internalType": "uint256", "name": "actual", "type": "uint256"}],"name": "task","type": "tuple"}`;

// Configuration constants
const attestationTypeBase = "Web2Json";
const sourceIdBase = "PublicWeb2";
const verifierUrlBase = VERIFIER_URL_TESTNET;

// Update this with your deployed VeridiFiCore address or set VERIDIFI_CORE_ADDRESS in .env
const VERIDIFI_CORE_ADDRESS = process.env.VERIDIFI_CORE_ADDRESS || "";

async function prepareAttestationRequest(apiUrl: string, postProcessJq: string, abiSignature: string) {
    const requestBody = {
        url: apiUrl,
        httpMethod: httpMethod,
        headers: headers,
        queryParams: queryParams,
        body: body,
        postProcessJq: postProcessJq,
        abiSignature: abiSignature,
    };

    const url = `${verifierUrlBase}/verifier/web2/Web2Json/prepareRequest`;
    const apiKey = VERIFIER_API_KEY_TESTNET;

    return await prepareAttestationRequestBase(url, apiKey, attestationTypeBase, sourceIdBase, requestBody);
}

async function retrieveDataAndProof(abiEncodedRequest: string, roundId: number) {
    const url = `${COSTON2_DA_LAYER_URL}/api/v1/fdc/proof-by-request-round-raw`;
    console.log("Url:", url, "\n");
    return await retrieveDataAndProofBaseWithRetry(url, abiEncodedRequest, roundId);
}

async function submitRequestViaContract(
    veridiFiCore: VeridiFiCoreInstance,
    abiEncodedRequest: string
): Promise<number> {
    console.log("Getting request fee from contract...\n");
    const fee = await veridiFiCore.getRequestFee(abiEncodedRequest);
    console.log("Request fee:", web3.utils.fromWei(fee.toString(), "ether"), "FLR\n");

    const accounts = await web3.eth.getAccounts();
    const sender = accounts[0];
    const balance = await web3.eth.getBalance(sender);
    console.log("Sender balance:", web3.utils.fromWei(balance.toString(), "ether"), "FLR\n");

    if (BigInt(balance.toString()) < BigInt(fee.toString())) {
        throw new Error("Insufficient balance to pay for request fee");
    }

    console.log("Submitting attestation request via VeridiFiCore contract...\n");
    const transaction = await veridiFiCore.submitCarbonIntensityAttestationRequest(abiEncodedRequest, {
        value: fee,
        from: sender,
    });

    console.log("Transaction hash:", transaction.tx, "\n");

    const roundId = await calculateRoundId(transaction);
    console.log(
        `Check round progress at: https://${hre.network.name}-systems-explorer.flare.rocks/voting-round/${roundId}?tab=fdc\n`
    );

    return roundId;
}

async function processProof(veridiFiCore: VeridiFiCoreInstance, proof: any, roundId: number) {
    console.log("Processing proof...\n");
    console.log("Proof hex:", proof.response_hex, "\n");

    // Decode the proof response
    const IWeb2JsonVerification = await artifacts.require("IWeb2JsonVerification");
    const responseType = IWeb2JsonVerification._json.abi[0].inputs[0].components[1];
    console.log("Response type:", responseType, "\n");

    const decodedResponse = web3.eth.abi.decodeParameter(responseType, proof.response_hex);
    console.log("Decoded proof:", decodedResponse, "\n");

    // Submit the proof to the contract
    const accounts = await web3.eth.getAccounts();
    const transaction = await veridiFiCore.processCarbonIntensityProof(
        {
            merkleProof: proof.proof,
            data: decodedResponse,
        },
        roundId,
        { from: accounts[0] }
    );

    console.log("Proof processed. Transaction:", transaction.tx, "\n");

    // Read the stored intensity
    const intensity = await veridiFiCore.getCarbonIntensity(roundId);
    const latestIntensity = await veridiFiCore.getLatestCarbonIntensity();
    console.log("Carbon intensity for round", roundId, ":", intensity.toString(), "\n");
    console.log("Latest carbon intensity:", latestIntensity.toString(), "\n");
}

async function main() {
    if (!VERIDIFI_CORE_ADDRESS) {
        throw new Error("Please set VERIDIFI_CORE_ADDRESS in your .env file or update the address in the script");
    }

    // Get the VeridiFiCore contract instance
    const veridiFiCore: VeridiFiCoreInstance = await VeridiFiCore.at(VERIDIFI_CORE_ADDRESS);
    console.log("VeridiFiCore address:", veridiFiCore.address, "\n");

    // Step 1: Prepare the attestation request
    console.log("Step 1: Preparing attestation request...\n");
    const data = await prepareAttestationRequest(apiUrl, postProcessJq, abiSignature);
    console.log("Prepared request data:", data, "\n");

    // Check if the request preparation was successful
    if (!data.abiEncodedRequest) {
        throw new Error(
            `Failed to prepare attestation request: ${JSON.stringify(data)}\n` +
                `This usually means:\n` +
                `1. The API URL is unreachable or returned an error\n` +
                `2. The jq filter doesn't match the API response structure\n` +
                `3. The verifier API is having issues\n` +
                `Please check the API response structure and jq filter.`
        );
    }

    const abiEncodedRequest = data.abiEncodedRequest;

    // Step 2: Submit the request via the contract
    console.log("Step 2: Submitting request via VeridiFiCore contract...\n");
    const roundId = await submitRequestViaContract(veridiFiCore, abiEncodedRequest);

    // Step 3: Wait for round to finalize and retrieve proof
    console.log("Step 3: Waiting for round to finalize and retrieving proof...\n");
    const proof = await retrieveDataAndProof(abiEncodedRequest, roundId);

    // Step 4: Process the proof
    console.log("Step 4: Processing proof...\n");
    await processProof(veridiFiCore, proof, roundId);

    console.log("\n✅ All steps completed successfully!\n");
}

void main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
