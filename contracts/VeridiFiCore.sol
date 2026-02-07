// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IFdcHub } from "@flarenetwork/flare-periphery-contracts/coston2/IFdcHub.sol";
import { IFdcRequestFeeConfigurations } from "@flarenetwork/flare-periphery-contracts/coston2/IFdcRequestFeeConfigurations.sol";
import { IWeb2Json } from "@flarenetwork/flare-periphery-contracts/coston2/IWeb2Json.sol";
import { ContractRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";

/**
 * @title VeridiFiCore
 * @notice Core contract for VeridiFi that submits Web2Json attestation requests to FDC
 * @dev Submits requests to fetch carbon intensity data from the UK Carbon Intensity API
 */
contract VeridiFiCore {
    /// @notice FDC Hub address for submitting attestation requests
    address public constant FDC_HUB = 0x3676742d4508492c026e77a3841C526019a8F1f0;

    /// @notice Carbon Intensity API URL
    string public constant CARBON_INTENSITY_API_URL = "https://api.carbonintensity.org.uk/intensity";

    /// @notice Struct to store carbon intensity data
    struct CarbonIntensityData {
        uint256 actual;
    }

    /// @notice Mapping to store the latest carbon intensity value by round
    mapping(uint256 => uint256) public carbonIntensityByRound;

    /// @notice Latest carbon intensity value
    uint256 public latestCarbonIntensity;

    /// @notice Latest round ID for which intensity was stored
    uint256 public latestRoundId;

    /// @notice Events
    event AttestationRequestSubmitted(bytes indexed abiEncodedRequest, uint256 fee);
    event CarbonIntensityUpdated(uint256 indexed roundId, uint256 actualIntensity);

    /// @notice Errors
    error InvalidFdcHubAddress();
    error FeeCalculationFailed();
    error AttestationRequestFailed();
    error InvalidProof();

    /**
     * @notice Submits a Web2Json attestation request to the FDC Hub
     * @dev The abiEncodedRequest should be prepared off-chain using the verifier API
     *      The request should fetch from https://api.carbonintensity.org.uk/intensity
     *      and extract the 'actual' intensity value using jq filter: {actual: .data[0].actual}
     * @param abiEncodedRequest The ABI-encoded attestation request prepared off-chain
     * @return fee The fee paid for the attestation request
     */
    function submitCarbonIntensityAttestationRequest(
        bytes calldata abiEncodedRequest
    ) external payable returns (uint256 fee) {
        IFdcHub fdcHub = IFdcHub(FDC_HUB);

        // Get the FDC Request Fee Configurations contract
        IFdcRequestFeeConfigurations feeConfig = fdcHub.fdcRequestFeeConfigurations();

        // Calculate the required fee
        try feeConfig.getRequestFee(abiEncodedRequest) returns (uint256 requestFee) {
            fee = requestFee;

            // Ensure sufficient value is sent
            require(msg.value >= fee, "Insufficient payment for request fee");

            // Submit the attestation request to FDC Hub
            fdcHub.requestAttestation{ value: fee }(abiEncodedRequest);

            emit AttestationRequestSubmitted(abiEncodedRequest, fee);

            // Refund excess payment if any
            if (msg.value > fee) {
                payable(msg.sender).transfer(msg.value - fee);
            }
        } catch {
            revert FeeCalculationFailed();
        }
    }

    /**
     * @notice Processes a Web2Json proof and stores the carbon intensity data
     * @dev Verifies the proof and extracts the 'actual' intensity value
     * @param proof The Web2Json proof containing the carbon intensity data
     * @param roundId The voting round ID for this proof (should be obtained from the FDC system)
     * @return actualIntensity The actual carbon intensity value
     */
    function processCarbonIntensityProof(
        IWeb2Json.Proof calldata proof,
        uint256 roundId
    ) external returns (uint256 actualIntensity) {
        // Verify the proof using FDC Verification
        require(ContractRegistry.getFdcVerification().verifyWeb2Json(proof), "Invalid Web2Json proof");

        // Verify the URL matches the expected carbon intensity API
        require(
            keccak256(abi.encodePacked(proof.data.requestBody.url)) ==
                keccak256(abi.encodePacked(CARBON_INTENSITY_API_URL)),
            "Invalid API URL"
        );

        // Decode the carbon intensity data
        CarbonIntensityData memory data = abi.decode(proof.data.responseBody.abiEncodedData, (CarbonIntensityData));

        actualIntensity = data.actual;

        // Store the intensity by round ID
        carbonIntensityByRound[roundId] = actualIntensity;
        latestCarbonIntensity = actualIntensity;
        latestRoundId = roundId;

        emit CarbonIntensityUpdated(roundId, actualIntensity);
    }

    /**
     * @notice Gets the carbon intensity value for a given round
     * @param roundId The voting round ID
     * @return The carbon intensity value for that round
     */
    function getCarbonIntensity(uint256 roundId) external view returns (uint256) {
        return carbonIntensityByRound[roundId];
    }

    /**
     * @notice Gets the latest carbon intensity value
     * @return The latest carbon intensity value
     */
    function getLatestCarbonIntensity() external view returns (uint256) {
        return latestCarbonIntensity;
    }

    /**
     * @notice Helper function to get the required fee for an attestation request
     * @param abiEncodedRequest The ABI-encoded attestation request
     * @return The fee required for the request
     */
    function getRequestFee(bytes calldata abiEncodedRequest) external view returns (uint256) {
        IFdcHub fdcHub = IFdcHub(FDC_HUB);
        IFdcRequestFeeConfigurations feeConfig = fdcHub.fdcRequestFeeConfigurations();
        return feeConfig.getRequestFee(abiEncodedRequest);
    }
}
