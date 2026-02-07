"""
Configuration file for the VeridiFi Agent Swarm
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Contract addresses (set these in your .env file)
PRICE_ORACLE_ADDRESS = os.getenv("PRICE_ORACLE_ADDRESS", "")
VERIDIFI_CORE_ADDRESS = os.getenv("VERIDIFI_CORE_ADDRESS", "")

# RPC endpoint (set this in your .env file)
RPC_URL = os.getenv("RPC_URL", "https://coston2-api.flare.network/ext/C/rpc")

# OpenAI API key for LangGraph agents (set this in your .env file)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Carbon intensity threshold for "Green" energy (gCO2/kWh)
# UK average is ~200-300, green is typically < 100
GREEN_ENERGY_THRESHOLD = int(os.getenv("GREEN_ENERGY_THRESHOLD", "100"))

# Price thresholds (optional - can be configured per agent)
MIN_BTC_PRICE = float(os.getenv("MIN_BTC_PRICE", "0"))
MAX_BTC_PRICE = float(os.getenv("MAX_BTC_PRICE", "1000000"))
MIN_XRP_PRICE = float(os.getenv("MIN_XRP_PRICE", "0"))
MAX_XRP_PRICE = float(os.getenv("MAX_XRP_PRICE", "100"))

