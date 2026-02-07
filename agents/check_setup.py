"""
Quick setup verification script
Run this to check if your .env file is configured correctly
"""
import sys
import os

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from config import PRICE_ORACLE_ADDRESS, VERIDIFI_CORE_ADDRESS, RPC_URL
    from contract_interface import ContractInterface
    
    print("=" * 60)
    print("🔍 Green Treasury Setup Verification")
    print("=" * 60)
    print()
    
    # Check environment variables
    print("📋 Environment Variables:")
    print(f"   PRICE_ORACLE_ADDRESS: {PRICE_ORACLE_ADDRESS or '❌ NOT SET'}")
    print(f"   VERIDIFI_CORE_ADDRESS: {VERIDIFI_CORE_ADDRESS or '❌ NOT SET'}")
    print(f"   RPC_URL: {RPC_URL}")
    print()
    
    # Check RPC connection
    print("🌐 Network Connection:")
    try:
        ci = ContractInterface()
        print("   ✅ RPC connection successful")
        
        # Try to get latest block
        latest_block = ci.w3.eth.block_number
        print(f"   ✅ Latest block: {latest_block}")
    except Exception as e:
        print(f"   ❌ RPC connection failed: {e}")
        print()
        sys.exit(1)
    
    print()
    
    # Check PriceOracle contract
    print("📊 PriceOracle Contract:")
    if not PRICE_ORACLE_ADDRESS:
        print("   ⚠️  PRICE_ORACLE_ADDRESS not set")
        print("   💡 Run: yarn hardhat run scripts/deployPriceOracle.ts --network coston2")
    else:
        try:
            price_data = ci.get_latest_prices()
            if price_data:
                print(f"   ✅ Contract accessible at {PRICE_ORACLE_ADDRESS}")
                print(f"   ✅ BTC/USD: ${price_data['btc_price']:,.2f}")
                print(f"   ✅ XRP/USD: ${price_data['xrp_price']:,.4f}")
            else:
                print(f"   ⚠️  Contract at {PRICE_ORACLE_ADDRESS} not responding")
        except Exception as e:
            print(f"   ❌ Error accessing contract: {e}")
    
    print()
    
    # Check VeridiFiCore contract
    print("🌍 VeridiFiCore Contract:")
    if not VERIDIFI_CORE_ADDRESS:
        print("   ⚠️  VERIDIFI_CORE_ADDRESS not set")
        print("   💡 Run: yarn hardhat run scripts/veridiFi/deployVeridiFiCore.ts --network coston2")
    else:
        try:
            carbon_data = ci.get_carbon_intensity()
            if carbon_data:
                print(f"   ✅ Contract accessible at {VERIDIFI_CORE_ADDRESS}")
                print(f"   ✅ Latest intensity: {carbon_data['intensity']} gCO2/kWh")
                print(f"   ✅ Status: {carbon_data['status']}")
            else:
                print(f"   ⚠️  Contract at {VERIDIFI_CORE_ADDRESS} not responding")
                print("   💡 Note: System will fallback to National Grid API")
        except Exception as e:
            print(f"   ⚠️  Error accessing contract: {e}")
            print("   💡 Note: System will fallback to National Grid API")
    
    print()
    print("=" * 60)
    
    # Final status
    if PRICE_ORACLE_ADDRESS and VERIDIFI_CORE_ADDRESS:
        print("✅ Setup looks good! You can run the Green Treasury system.")
        print("   Run: python green_treasury_swarm.py")
    else:
        print("⚠️  Some addresses are missing. Please set them in your .env file.")
        print("   See SETUP_GUIDE.md for instructions.")
    
    print("=" * 60)
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("💡 Make sure you're running from the agents/ directory")
    print("💡 And that you've installed dependencies: pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

