# VeridiFi Core - Carbon Intensity FDC Integration

This directory contains scripts for deploying and interacting with the VeridiFiCore contract, which submits Web2Json attestation requests to the Flare Data Connector (FDC) to fetch carbon intensity data from the UK Carbon Intensity API.

## Setup

1. **Deploy the Contract**

    ```bash
    yarn hardhat run scripts/veridiFi/deployVeridiFiCore.ts --network coston2
    ```

2. **Set Environment Variables**
   Add the deployed contract address to your `.env` file:

    ```env
    VERIDIFI_CORE_ADDRESS=0x...
    ```

3. **Required Environment Variables**
   Make sure you have these set in your `.env`:
    - `VERIFIER_URL_TESTNET` - FDC Verifier API URL
    - `VERIFIER_API_KEY_TESTNET` - FDC Verifier API Key
    - `COSTON2_DA_LAYER_URL` - Data Availability Layer URL
    - `PRIVATE_KEY` - Your account private key

## Usage

### Submit Carbon Intensity Request

This script will:

1. Prepare the Web2Json attestation request
2. Submit it via the VeridiFiCore contract
3. Wait for the round to finalize
4. Retrieve and process the proof

```bash
yarn hardhat run scripts/veridiFi/submitCarbonIntensityRequest.ts --network coston2
```

## API Configuration

The contract is configured to fetch from:

- **API URL**: `https://api.carbonintensity.org.uk/intensity`
- **Data Field**: Extracts the `actual` intensity value from `data[0].intensity.actual`

The API response structure:

```json
{
    "data": [
        {
            "from": "2024-01-01T00:00Z",
            "to": "2024-01-01T00:30Z",
            "intensity": {
                "forecast": 123,
                "actual": 125,
                "index": "moderate"
            }
        }
    ]
}
```

## Contract Functions

### `submitCarbonIntensityAttestationRequest(bytes calldata abiEncodedRequest)`

Submits a Web2Json attestation request to the FDC Hub. The `abiEncodedRequest` should be prepared off-chain using the verifier API.

### `processCarbonIntensityProof(IWeb2Json.Proof calldata proof, uint256 roundId)`

Processes a Web2Json proof and stores the carbon intensity data on-chain.

### `getRequestFee(bytes calldata abiEncodedRequest)`

Returns the fee required for an attestation request.

### `getCarbonIntensity(uint256 roundId)`

Returns the carbon intensity value for a specific round.

### `getLatestCarbonIntensity()`

Returns the most recent carbon intensity value.

## FDC Hub Address

The contract uses the FDC Hub at: `0x3676742D4508492C026E77A3841C526019A8f1F0`
