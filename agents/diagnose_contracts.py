"""
Diagnostic script to identify why contract fetching is failing
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("=" * 60)
print("🔍 Contract Connection Diagnostic")
print("=" * 60)
print()

# Check .env file
print("1. Checking .env file...")
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(env_path):
    print(f"   ✅ .env file found at: {env_path}")
    with open(env_path, 'r') as f:
        env_content = f.read()
        if 'PRICE_ORACLE_ADDRESS' in env_content:
            print("   ✅ PRICE_ORACLE_ADDRESS found in .env")
        else:
            print("   ❌ PRICE_ORACLE_ADDRESS NOT found in .env")
        if 'VERIDIFI_CORE_ADDRESS' in env_content:
            print("   ✅ VERIDIFI_CORE_ADDRESS found in .env")
        else:
            print("   ❌ VERIDIFI_CORE_ADDRESS NOT found in .env")
        if 'RPC_URL' in env_content:
            print("   ✅ RPC_URL found in .env")
        else:
            print("   ⚠️  RPC_URL not in .env (will use default)")
else:
    print(f"   ❌ .env file NOT found at: {env_path}")
    print("   💡 Create a .env file in the project root with:")
    print("      PRICE_ORACLE_ADDRESS=0x...")
    print("      VERIDIFI_CORE_ADDRESS=0x...")
    print("      RPC_URL=https://coston2-api.flare.network/ext/C/rpc")

print()

# Check config loading
print("2. Checking configuration...")
try:
    from config import PRICE_ORACLE_ADDRESS, VERIDIFI_CORE_ADDRESS, RPC_URL
    print(f"   RPC_URL: {RPC_URL}")
    print(f"   PRICE_ORACLE_ADDRESS: {PRICE_ORACLE_ADDRESS or '❌ NOT SET'}")
    print(f"   VERIDIFI_CORE_ADDRESS: {VERIDIFI_CORE_ADDRESS or '❌ NOT SET'}")
except Exception as e:
    print(f"   ❌ Error loading config: {e}")
    sys.exit(1)

print()

# Check RPC connection
print("3. Testing RPC connection...")
try:
    from web3 import Web3
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if w3.is_connected():
        print(f"   ✅ Connected to RPC: {RPC_URL}")
        try:
            block_number = w3.eth.block_number
            print(f"   ✅ Latest block: {block_number}")
        except Exception as e:
            print(f"   ⚠️  Could not get block number: {e}")
    else:
        print(f"   ❌ Failed to connect to RPC: {RPC_URL}")
        print("   💡 Check your internet connection and RPC URL")
except Exception as e:
    print(f"   ❌ Error connecting to RPC: {e}")

print()

# Check contract addresses
print("4. Checking contract addresses...")
if not PRICE_ORACLE_ADDRESS:
    print("   ❌ PRICE_ORACLE_ADDRESS is not set!")
    print("   💡 Deploy PriceOracle contract:")
    print("      yarn hardhat run scripts/deployPriceOracle.ts --network coston2")
    print("   💡 Then add the address to .env file")
else:
    print(f"   ✅ PRICE_ORACLE_ADDRESS: {PRICE_ORACLE_ADDRESS}")
    try:
        from web3 import Web3
        w3 = Web3(Web3.HTTPProvider(RPC_URL))
        address = Web3.to_checksum_address(PRICE_ORACLE_ADDRESS)
        code = w3.eth.get_code(address)
        if code == b'':
            print(f"   ❌ No contract code at address {address}")
            print("   💡 Contract might not be deployed or address is wrong")
        else:
            print(f"   ✅ Contract code found at address")
            print(f"   💡 Code length: {len(code)} bytes")
    except Exception as e:
        print(f"   ⚠️  Could not verify contract: {e}")

if not VERIDIFI_CORE_ADDRESS:
    print("   ⚠️  VERIDIFI_CORE_ADDRESS is not set (optional for prices)")
else:
    print(f"   ✅ VERIDIFI_CORE_ADDRESS: {VERIDIFI_CORE_ADDRESS}")

print()

# Test contract interface
print("5. Testing contract interface...")
try:
    from contract_interface import ContractInterface
    ci = ContractInterface()
    
    if ci.price_oracle:
        print("   ✅ PriceOracle contract interface initialized")
        print("   Testing getLatestPrices()...")
        try:
            prices = ci.get_latest_prices()
            if prices:
                print(f"   ✅ Successfully fetched prices!")
                print(f"      BTC/USD: ${prices['btc_price']:,.2f}")
                print(f"      XRP/USD: ${prices['xrp_price']:,.4f}")
            else:
                print("   ❌ getLatestPrices() returned None")
                print("   💡 Check contract address and RPC connection")
        except Exception as e:
            print(f"   ❌ Error calling getLatestPrices(): {e}")
            print(f"   💡 Error type: {type(e).__name__}")
            import traceback
            print("   Full traceback:")
            traceback.print_exc()
    else:
        print("   ❌ PriceOracle contract not configured")
        print("   💡 Set PRICE_ORACLE_ADDRESS in .env file")
        
except Exception as e:
    print(f"   ❌ Error initializing contract interface: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 60)
print("Diagnostic complete!")
print("=" * 60)

