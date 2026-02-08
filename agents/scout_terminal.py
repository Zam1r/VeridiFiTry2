#!/usr/bin/env python3
"""
Scout Agent Terminal Interface
Queries FTSO for real-time XRP prices via PriceOracle contract
"""
import time
import sys
from datetime import datetime
from contract_interface import ContractInterface
from config import PRICE_ORACLE_ADDRESS, RPC_URL

class ScoutTerminal:
    """Terminal interface for Scout Agent - FTSO Price Feed"""
    
    def __init__(self):
        self.contract_interface = ContractInterface()
        self.running = True
        self.feed_status = "DISCONNECTED"
        self.last_price = None
        self.last_timestamp = None
        
    def print_header(self):
        """Print terminal header"""
        print("\n" + "=" * 80)
        print("🔍 SCOUT AGENT TERMINAL - FTSO Price Feed")
        print("=" * 80)
        print(f"Contract: {PRICE_ORACLE_ADDRESS or 'Not Configured'}")
        print(f"RPC: {RPC_URL}")
        print(f"Feed Status: {self.feed_status}")
        print("=" * 80 + "\n")
    
    def print_feed_info(self):
        """Print detailed feed connection information"""
        print("\n" + "=" * 80)
        print("📡 SCOUT AGENT - Feed Connection Information")
        print("=" * 80)
        print("\n🔗 Feed Connection:")
        print("  Type: FTSO Oracle (Flare Time Series Oracle)")
        print("  Contract: PriceOracle")
        print(f"  Address: {PRICE_ORACLE_ADDRESS or 'Not Configured'}")
        print("  Method: getLatestPrices()")
        print("  Feed ID: XRP/USD (0x015852502f55534400000000000000000000000000)")
        print("  Data Source: On-Chain FTSO Oracle")
        print("\n📊 Data Retrieved:")
        print("  • XRP/USD price (float)")
        print("  • Timestamp (uint64)")
        print("  • Data freshness (seconds)")
        print("\n🔄 Interaction with Application:")
        print("  • Outputs price data to Manager Agent")
        print("  • Manager Agent uses price to make trading decisions")
        print("  • Price must be < $1.10 for EXECUTE_BUY signal")
        print("\n⚙️  Feed Flow:")
        print("  Scout Agent → PriceOracle.getLatestPrices()")
        print("             → FTSO Oracle (On-Chain)")
        print("             → XRP/USD Price Data")
        print("             → Manager Agent (Decision Node)")
        print("\n⏱️  Data Freshness:")
        print("  • Fresh: < 60 seconds")
        print("  • Old: 60-180 seconds")
        print("  • Stale: > 180 seconds (Oracle Timeout)")
        print("=" * 80 + "\n")
        
    def print_price_update(self, price_data):
        """Print formatted price update"""
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        xrp_price = price_data.get("xrp_price", 0)
        xrp_timestamp = price_data.get("xrp_timestamp", 0)
        current_time = int(time.time())
        age = current_time - xrp_timestamp if xrp_timestamp > 0 else 0
        
        # Color coding based on age
        if age > 180:
            age_status = f"⚠️  STALE ({age}s)"
        elif age > 60:
            age_status = f"🟡 OLD ({age}s)"
        else:
            age_status = f"🟢 FRESH ({age}s)"
        
        print(f"[{timestamp}] [SCOUT] XRP/USD: ${xrp_price:.4f} | Age: {age_status}")
        print(f"           Source: FTSO Oracle (On-Chain)")
        print(f"           Timestamp: {xrp_timestamp} | Current: {current_time}")
        
        self.last_price = xrp_price
        self.last_timestamp = xrp_timestamp
        
    def query_ftso(self):
        """Query FTSO for XRP price"""
        try:
            price_data = self.contract_interface.get_latest_prices()
            
            if not price_data:
                self.feed_status = "ERROR"
                print(f"[{datetime.now().strftime('%H:%M:%S')}] [SCOUT] ❌ Failed to fetch prices from FTSO")
                return None
            
            self.feed_status = "CONNECTED"
            self.print_price_update(price_data)
            return price_data
            
        except Exception as e:
            self.feed_status = "ERROR"
            print(f"[{datetime.now().strftime('%H:%M:%S')}] [SCOUT] ❌ Error: {str(e)}")
            return None
    
    def run_interactive(self):
        """Run interactive terminal mode"""
        self.print_header()
        
        print("Commands:")
        print("  'q' or 'quit' - Exit terminal")
        print("  'r' or 'refresh' - Query FTSO for latest price")
        print("  's' or 'status' - Show feed status")
        print("  'c' or 'continuous' - Continuous polling (every 5 seconds)")
        print("  'i' or 'info' - Show feed connection information")
        print("  'h' or 'help' - Show this help\n")
        
        while self.running:
            try:
                cmd = input("[SCOUT] > ").strip().lower()
                
                if cmd in ['q', 'quit', 'exit']:
                    print("\n[SCOUT] Shutting down...")
                    self.running = False
                    break
                    
                elif cmd in ['r', 'refresh']:
                    self.query_ftso()
                    
                elif cmd in ['s', 'status']:
                    print(f"\n[SCOUT] Feed Status: {self.feed_status}")
                    if self.last_price:
                        print(f"[SCOUT] Last Price: ${self.last_price:.4f}")
                        print(f"[SCOUT] Last Timestamp: {self.last_timestamp}")
                    print()
                    
                elif cmd in ['c', 'continuous']:
                    print("\n[SCOUT] Starting continuous polling (Ctrl+C to stop)...\n")
                    try:
                        while True:
                            self.query_ftso()
                            time.sleep(5)
                    except KeyboardInterrupt:
                        print("\n[SCOUT] Continuous polling stopped\n")
                        
                elif cmd in ['i', 'info', 'feed']:
                    self.print_feed_info()
                    
                elif cmd in ['h', 'help']:
                    print("\nCommands:")
                    print("  'q' or 'quit' - Exit terminal")
                    print("  'r' or 'refresh' - Query FTSO for latest price")
                    print("  's' or 'status' - Show feed status")
                    print("  'c' or 'continuous' - Continuous polling (every 5 seconds)")
                    print("  'i' or 'info' - Show feed connection information")
                    print("  'h' or 'help' - Show this help\n")
                    
                elif cmd == '':
                    continue
                    
                else:
                    print(f"[SCOUT] Unknown command: {cmd}. Type 'help' for commands.\n")
                    
            except KeyboardInterrupt:
                print("\n[SCOUT] Shutting down...")
                self.running = False
                break
            except EOFError:
                break
    
    def run_single_query(self):
        """Run single query and exit"""
        self.print_header()
        result = self.query_ftso()
        
        if result:
            print(f"\n[SCOUT] ✅ Query successful")
            print(f"[SCOUT] XRP/USD: ${result['xrp_price']:.4f}")
            return result
        else:
            print(f"\n[SCOUT] ❌ Query failed")
            return None


def main():
    """Main entry point"""
    terminal = ScoutTerminal()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--single':
        # Single query mode
        terminal.run_single_query()
    else:
        # Interactive mode
        terminal.run_interactive()


if __name__ == "__main__":
    main()

