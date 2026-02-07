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
    
    def get_latest_prices(self) -> Optional[dict]:
        """
        Get latest BTC and XRP prices from FTSO via PriceOracle contract
        
        Returns:
            dict with btc_price, xrp_price, btc_timestamp, xrp_timestamp
            Returns None if contract not configured or call fails
        """
        if not self.price_oracle:
            return None
        
        try:
            result = self.price_oracle.functions.getLatestPrices().call()
            btc_price_wei, xrp_price_wei, btc_timestamp, xrp_timestamp = result
            
            # Convert from wei (18 decimals) to USD
            btc_price = float(btc_price_wei) / 1e18
            xrp_price = float(xrp_price_wei) / 1e18
            
            return {
                "btc_price": btc_price,
                "xrp_price": xrp_price,
                "btc_timestamp": btc_timestamp,
                "xrp_timestamp": xrp_timestamp,
                "btc_price_wei": str(btc_price_wei),
                "xrp_price_wei": str(xrp_price_wei)
            }
        except Exception as e:
            print(f"Error fetching prices: {e}")
            return None
    
    def get_carbon_intensity(self) -> Optional[dict]:
        """
        Get latest carbon intensity from VeridiFiCore contract
        
        Returns:
            dict with intensity value and whether it's "Green"
            Returns None if contract not configured or call fails
        """
        if not self.veridiFi_core:
            return None
        
        try:
            intensity_wei = self.veridiFi_core.functions.getLatestCarbonIntensity().call()
            intensity = int(intensity_wei)
            is_green = intensity < GREEN_ENERGY_THRESHOLD
            
            return {
                "intensity": intensity,
                "is_green": is_green,
                "threshold": GREEN_ENERGY_THRESHOLD,
                "status": "Green" if is_green else "Not Green"
            }
        except Exception as e:
            print(f"Error fetching carbon intensity: {e}")
            return None

