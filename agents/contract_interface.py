"""
Contract interface for interacting with on-chain contracts using web3.py
"""
from web3 import Web3
from eth_abi import decode
import json
from typing import Tuple, Optional
from config import RPC_URL, PRICE_ORACLE_ADDRESS, VERIDIFI_CORE_ADDRESS, GREEN_ENERGY_THRESHOLD

# ABI for PriceOracle contract
PRICE_ORACLE_ABI = [
    {
        "inputs": [],
        "name": "getLatestPrices",
        "outputs": [
            {"internalType": "uint256", "name": "btcPrice", "type": "uint256"},
            {"internalType": "uint256", "name": "xrpPrice", "type": "uint256"},
            {"internalType": "uint64", "name": "btcTimestamp", "type": "uint64"},
            {"internalType": "uint64", "name": "xrpTimestamp", "type": "uint64"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

# ABI for VeridiFiCore contract
VERIDIFI_CORE_ABI = [
    {
        "inputs": [],
        "name": "getLatestCarbonIntensity",
        "outputs": [
            {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "latestRoundId",
        "outputs": [
            {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "roundId", "type": "uint256"}],
        "name": "getCarbonIntensity",
        "outputs": [
            {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

# ABI for ContractRegistry (to get FDCVerification address)
CONTRACT_REGISTRY_ABI = [
    {
        "inputs": [{"internalType": "bytes32", "name": "nameHash", "type": "bytes32"}],
        "name": "getContractAddressByName",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
]

# ABI for FDCVerification contract
FDC_VERIFICATION_ABI = [
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "bytes32", "name": "attestationType", "type": "bytes32"},
                    {"internalType": "uint256", "name": "votingRound", "type": "uint256"},
                    {"components": [
                        {"internalType": "string", "name": "url", "type": "string"},
                        {"internalType": "bytes", "name": "requestBody", "type": "bytes"}
                    ], "name": "requestBody", "type": "tuple"},
                    {"components": [
                        {"internalType": "bytes", "name": "abiEncodedData", "type": "bytes"}
                    ], "name": "responseBody", "type": "tuple"}
                ],
                "internalType": "struct IWeb2Json.Data",
                "name": "data",
                "type": "tuple"
            },
            {"internalType": "bytes32[]", "name": "merkleProof", "type": "bytes32[]"}
        ],
        "name": "verifyWeb2Json",
        "outputs": [{"internalType": "bool", "name": "_proved", "type": "bool"}],
        "stateMutability": "payable",
        "type": "function"
    }
]


class ContractInterface:
    """Interface for interacting with on-chain contracts"""
    
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to RPC: {RPC_URL}")
        
        if PRICE_ORACLE_ADDRESS:
            self.price_oracle = self.w3.eth.contract(
                address=Web3.to_checksum_address(PRICE_ORACLE_ADDRESS),
                abi=PRICE_ORACLE_ABI
            )
        else:
            self.price_oracle = None
            
        if VERIDIFI_CORE_ADDRESS:
            self.veridiFi_core = self.w3.eth.contract(
                address=Web3.to_checksum_address(VERIDIFI_CORE_ADDRESS),
                abi=VERIDIFI_CORE_ABI
            )
        else:
            self.veridiFi_core = None
        
        # ContractRegistry address for Coston2 (to get FDCVerification address)
        CONTRACT_REGISTRY_ADDRESS = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019"
        self.contract_registry = self.w3.eth.contract(
            address=Web3.to_checksum_address(CONTRACT_REGISTRY_ADDRESS),
            abi=CONTRACT_REGISTRY_ABI
        )
        
        # Get FDCVerification address from ContractRegistry
        # Note: This may fail on some networks - it's non-critical as we use VeridiFiCore for FDC data
        try:
            fdc_verification_name_hash = Web3.keccak(text="FdcVerification")
            fdc_verification_address = self.contract_registry.functions.getContractAddressByName(fdc_verification_name_hash).call()
            if fdc_verification_address and fdc_verification_address != "0x0000000000000000000000000000000000000000":
                self.fdc_verification = self.w3.eth.contract(
                    address=Web3.to_checksum_address(fdc_verification_address),
                    abi=FDC_VERIFICATION_ABI
                )
            else:
                self.fdc_verification = None
        except Exception as e:
            # Non-critical warning - FDC verification works through VeridiFiCore
            # Only print warning in debug mode to reduce noise
            import os
            if os.getenv("DEBUG", "false").lower() == "true":
                print(f"Debug: Could not get FDCVerification address from ContractRegistry: {e}")
                print("  Note: This is non-critical - FDC verification works through VeridiFiCore")
            self.fdc_verification = None
    
    def get_latest_prices(self) -> Optional[dict]:
        """
        Get latest BTC and XRP prices from FTSO via PriceOracle contract
        
        Returns:
            dict with btc_price, xrp_price, btc_timestamp, xrp_timestamp
            Returns None if contract not configured or call fails
        """
        if not self.price_oracle:
            print("Error: PriceOracle contract not configured. Set PRICE_ORACLE_ADDRESS in .env")
            return None
        
        try:
            # Add timeout to the call
            result = self.price_oracle.functions.getLatestPrices().call()
            
            if not result or len(result) != 4:
                print(f"Error: Invalid result from getLatestPrices(): {result}")
                return None
            
            btc_price_wei, xrp_price_wei, btc_timestamp, xrp_timestamp = result
            
            # Validate timestamps
            if btc_timestamp == 0 or xrp_timestamp == 0:
                print("Warning: Timestamps are zero - prices might not be available yet")
            
            # Convert from wei (18 decimals) to USD
            btc_price = float(btc_price_wei) / 1e18
            xrp_price = float(xrp_price_wei) / 1e18
            
            # Validate prices are reasonable
            if btc_price <= 0 or xrp_price <= 0:
                print(f"Warning: Invalid prices - BTC: {btc_price}, XRP: {xrp_price}")
            
            return {
                "btc_price": btc_price,
                "xrp_price": xrp_price,
                "btc_timestamp": btc_timestamp,
                "xrp_timestamp": xrp_timestamp,
                "btc_price_wei": str(btc_price_wei),
                "xrp_price_wei": str(xrp_price_wei)
            }
        except ValueError as e:
            print(f"Error: Invalid contract response format: {e}")
            print("This might mean the contract ABI doesn't match or contract is not deployed")
            return None
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            print(f"Error fetching prices ({error_type}): {error_msg}")
            
            # Provide helpful error messages
            if "code" in error_msg.lower() or "execution reverted" in error_msg.lower():
                print("  💡 Contract execution failed - check if contract is deployed correctly")
            elif "connection" in error_msg.lower() or "timeout" in error_msg.lower():
                print("  💡 RPC connection issue - check your internet and RPC URL")
            elif "invalid" in error_msg.lower() or "address" in error_msg.lower():
                print("  💡 Invalid contract address - verify PRICE_ORACLE_ADDRESS in .env")
            
            return None
    
    def get_carbon_intensity(self) -> Optional[dict]:
        """
        Get latest carbon intensity from VeridiFiCore contract
        
        Returns:
            dict with intensity value, verification status, and whether it's "Green"
            Returns None if contract not configured or call fails
        """
        if not self.veridiFi_core:
            return None
        
        try:
            intensity_wei = self.veridiFi_core.functions.getLatestCarbonIntensity().call()
            intensity = int(intensity_wei)
            
            # If intensity is 0, no verified proof has been processed yet
            is_fdc_verified = intensity > 0
            
            # Get the latest round ID to confirm proof was processed
            latest_round_id = 0
            try:
                latest_round_id = self.veridiFi_core.functions.latestRoundId().call()
            except:
                pass  # Round ID might not be available
            
            is_green = intensity < GREEN_ENERGY_THRESHOLD if is_fdc_verified else False
            
            return {
                "intensity": intensity,
                "is_green": is_green,
                "is_fdc_verified": is_fdc_verified,
                "latest_round_id": latest_round_id,
                "threshold": GREEN_ENERGY_THRESHOLD,
                "status": "Green" if is_green else "Not Green",
                "verification_status": "FDC_VERIFIED" if is_fdc_verified else "UNVERIFIED"
            }
        except Exception as e:
            print(f"Error fetching carbon intensity: {e}")
            return None
    
    def check_fdc_verification(self) -> Optional[dict]:
        """
        Check if FDC has verified carbon intensity data for Oxford region
        Checks VeridiFiCore for latest round ID and carbon intensity
        
        Returns:
            dict with verification status, voting round ID, and carbon intensity if verified
            Returns None if no verified proof exists or error occurs
        """
        if not self.veridiFi_core:
            return None
        
        try:
            # Get latest round ID from VeridiFiCore (indicates FDC attestation was processed)
            latest_round_id = 0
            try:
                latest_round_id = self.veridiFi_core.functions.latestRoundId().call()
            except Exception as e:
                print(f"Error getting latest round ID: {e}")
                return None
            
            # If round ID is 0, no verified proof has been processed yet
            if latest_round_id == 0:
                return {
                    "verified": False,
                    "intensity": None,
                    "voting_round_id": None,
                    "message": "No FDC-verified proof found. Waiting for Flare nodes to reach consensus."
                }
            
            # Get carbon intensity for this round
            intensity_wei = 0
            try:
                # Try to get intensity for the specific round
                intensity_wei = self.veridiFi_core.functions.getCarbonIntensity(latest_round_id).call()
            except:
                # Fallback to latest intensity
                try:
                    intensity_wei = self.veridiFi_core.functions.getLatestCarbonIntensity().call()
                except:
                    pass
            
            intensity = int(intensity_wei)
            
            # If intensity is 0, no verified proof has been processed
            if intensity == 0:
                return {
                    "verified": False,
                    "intensity": None,
                    "voting_round_id": latest_round_id,
                    "message": f"Voting Round ID {latest_round_id} found but no carbon intensity data."
                }
            
            # Check if intensity indicates low carbon (Green) - threshold is 50
            is_low_carbon = intensity < 50  # Green threshold
            
            return {
                "verified": True,
                "intensity": intensity,
                "voting_round_id": latest_round_id,
                "is_low_carbon": is_low_carbon,
                "status": "GREEN_VERIFIED" if is_low_carbon else "VERIFIED",
                "message": f"FDC proof verified. Carbon intensity: {intensity} gCO2/kWh"
            }
        except Exception as e:
            print(f"Error checking FDC verification: {e}")
            return None

