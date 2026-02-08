#!/usr/bin/env python3
"""
Manager Agent Terminal Interface
Makes the decision—only executes trades when price < $1.10 AND carbon is verified green
"""
import time
import sys
from datetime import datetime
from contract_interface import ContractInterface
from config import PRICE_ORACLE_ADDRESS, VERIDIFI_CORE_ADDRESS, RPC_URL

# Constants
XRP_TARGET_PRICE = 1.10  # USD
GREEN_THRESHOLD = 50  # gCO2/kWh

class ManagerTerminal:
    """Terminal interface for Manager Agent - Decision Maker"""
    
    def __init__(self):
        self.contract_interface = ContractInterface()
        self.running = True
        self.last_decision = None
        self.last_reason = None
        
    def print_header(self):
        """Print terminal header"""
        print("\n" + "=" * 80)
        print("🎯 MANAGER AGENT TERMINAL - Trading Decision Engine")
        print("=" * 80)
        print(f"Price Oracle: {PRICE_ORACLE_ADDRESS or 'Not Configured'}")
        print(f"VeridiFi Core: {VERIDIFI_CORE_ADDRESS or 'Not Configured'}")
        print(f"RPC: {RPC_URL}")
        print(f"Decision Criteria:")
        print(f"  - XRP Price < ${XRP_TARGET_PRICE}")
        print(f"  - Carbon Intensity < {GREEN_THRESHOLD} gCO2/kWh (FDC Verified)")
        print("=" * 80 + "\n")
    
    def print_feed_info(self):
        """Print detailed feed connection and interaction information"""
        print("\n" + "=" * 80)
        print("📡 MANAGER AGENT - Feed Connections & Interactions")
        print("=" * 80)
        print("\n🔗 Feed Connections:")
        print("  1. Scout Agent Feed (FTSO Price Data):")
        print(f"     • Contract: PriceOracle ({PRICE_ORACLE_ADDRESS or 'Not Configured'})")
        print("     • Method: getLatestPrices()")
        print("     • Data: XRP/USD price, timestamp")
        print("     • Source: FTSO Oracle (On-Chain)")
        print("\n  2. Auditor Agent Feed (FDC Carbon Data):")
        print(f"     • Contract: VeridiFiCore ({VERIDIFI_CORE_ADDRESS or 'Not Configured'})")
        print("     • Method: check_fdc_verification()")
        print("     • Data: Carbon intensity, FDC status, round ID")
        print("     • Source: FDC Verification (Flare Consensus)")
        print("\n🎯 Decision Logic:")
        print("  IF (XRP Price < $1.10) AND (Carbon < 50 gCO2/kWh AND FDC Verified):")
        print("    → Decision: EXECUTE_BUY")
        print("    → Action: Signal Settlement Agent to execute Plasma payout")
        print("\n  ELSE IF (Carbon >= 150 gCO2/kWh):")
        print("    → Decision: HALT_ACTIVITY")
        print("    → Action: Stop all trading activity")
        print("\n  ELSE:")
        print("    → Decision: WAIT")
        print("    → Action: Wait for conditions to be met")
        print("\n🔄 Interaction with Application:")
        print("  • Receives price data from Scout Agent")
        print("  • Receives carbon data from Auditor Agent")
        print("  • Evaluates both conditions simultaneously")
        print("  • Outputs decision to Settlement Agent (if EXECUTE_BUY)")
        print("  • Only trusts FDC-verified carbon data")
        print("\n⚙️  Decision Flow:")
        print("  Scout Agent (Price) ──┐")
        print("                        ├─→ Manager Agent → Decision")
        print("  Auditor Agent (Carbon)─┘")
        print("                        │")
        print("                        ├─→ EXECUTE_BUY → Settlement Agent")
        print("                        ├─→ WAIT → No action")
        print("                        └─→ HALT_ACTIVITY → Stop trading")
        print("\n✅ Safety Features:")
        print("  • Oracle timeout check (>180s = HALT)")
        print("  • Requires FDC verification (no unverified data)")
        print("  • Carbon threshold enforcement (>=150 = HALT)")
        print("  • Missing data handling (HALT if unavailable)")
        print("=" * 80 + "\n")
        
    def print_decision(self, decision_data):
        """Print formatted decision"""
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        decision = decision_data.get("decision", "UNKNOWN")
        reason = decision_data.get("reason", "")
        xrp_price = decision_data.get("xrp_price")
        carbon_intensity = decision_data.get("carbon_intensity")
        fdc_verified = decision_data.get("fdc_verified", False)
        
        if decision == "EXECUTE_BUY":
            decision_emoji = "✅"
            decision_color = "GREEN"
        elif decision == "HALT_ACTIVITY":
            decision_emoji = "🛑"
            decision_color = "RED"
        else:
            decision_emoji = "⏸️"
            decision_color = "YELLOW"
        
        print(f"[{timestamp}] [MANAGER] Decision: {decision_emoji} {decision}")
        print(f"           Status: {decision_color}")
        print(f"           Reason: {reason}")
        
        if xrp_price is not None:
            price_status = "✅" if xrp_price < XRP_TARGET_PRICE else "❌"
            print(f"           XRP Price: ${xrp_price:.4f} {price_status} (Target: < ${XRP_TARGET_PRICE})")
        
        if carbon_intensity is not None:
            carbon_status = "✅" if carbon_intensity < GREEN_THRESHOLD else "❌"
            print(f"           Carbon: {carbon_intensity} gCO2/kWh {carbon_status} (Threshold: < {GREEN_THRESHOLD})")
            print(f"           FDC Verified: {'✅ YES' if fdc_verified else '❌ NO'}")
        
        self.last_decision = decision
        self.last_reason = reason
        
    def make_decision(self):
        """Make trading decision based on price and carbon data"""
        try:
            # Get price data from Scout Agent feed
            price_data = self.contract_interface.get_latest_prices()
            if not price_data:
                return {
                    "decision": "HALT_ACTIVITY",
                    "reason": "Failed to fetch price data from FTSO",
                    "xrp_price": None,
                    "carbon_intensity": None,
                    "fdc_verified": False
                }
            
            xrp_price = price_data.get("xrp_price", 0)
            xrp_timestamp = price_data.get("xrp_timestamp", 0)
            current_time = int(time.time())
            xrp_age = current_time - xrp_timestamp if xrp_timestamp > 0 else 999
            
            # Check for oracle timeout
            if xrp_age > 180:
                return {
                    "decision": "HALT_ACTIVITY",
                    "reason": f"Oracle Timeout: XRP data is {xrp_age}s old (max: 180s)",
                    "xrp_price": xrp_price,
                    "carbon_intensity": None,
                    "fdc_verified": False
                }
            
            # Get carbon data from Auditor Agent feed
            fdc_verification = self.contract_interface.check_fdc_verification()
            if not fdc_verification:
                return {
                    "decision": "WAIT",
                    "reason": "Failed to check FDC verification",
                    "xrp_price": xrp_price,
                    "carbon_intensity": None,
                    "fdc_verified": False
                }
            
            verified = fdc_verification.get("verified", False)
            intensity = fdc_verification.get("intensity")
            is_low_carbon = fdc_verification.get("is_low_carbon", False)
            
            # Decision logic
            if not verified:
                return {
                    "decision": "WAIT",
                    "reason": "FDC proof not verified. Waiting for Flare nodes to reach consensus.",
                    "xrp_price": xrp_price,
                    "carbon_intensity": intensity,
                    "fdc_verified": False
                }
            
            if intensity is None or intensity == 0:
                return {
                    "decision": "WAIT",
                    "reason": "No carbon intensity data available",
                    "xrp_price": xrp_price,
                    "carbon_intensity": None,
                    "fdc_verified": False
                }
            
            # Check if carbon is too high (Red)
            if intensity >= 150:
                return {
                    "decision": "HALT_ACTIVITY",
                    "reason": f"Energy is Red ({intensity} gCO2/kWh >= 150). Halting activity.",
                    "xrp_price": xrp_price,
                    "carbon_intensity": intensity,
                    "fdc_verified": verified
                }
            
            # Check conditions for EXECUTE_BUY
            price_below_target = xrp_price < XRP_TARGET_PRICE
            carbon_below_threshold = is_low_carbon and intensity < GREEN_THRESHOLD
            
            if price_below_target and carbon_below_threshold:
                return {
                    "decision": "EXECUTE_BUY",
                    "reason": f"✅ All conditions met: XRP Price (${xrp_price:.4f}) < ${XRP_TARGET_PRICE} AND Carbon ({intensity} gCO2/kWh) < {GREEN_THRESHOLD} (FDC Verified)",
                    "xrp_price": xrp_price,
                    "carbon_intensity": intensity,
                    "fdc_verified": verified
                }
            else:
                if not price_below_target:
                    reason = f"XRP Price (${xrp_price:.4f}) >= ${XRP_TARGET_PRICE}"
                elif not carbon_below_threshold:
                    reason = f"Carbon ({intensity} gCO2/kWh) >= {GREEN_THRESHOLD} or not FDC verified"
                else:
                    reason = "Conditions not met"
                
                return {
                    "decision": "WAIT",
                    "reason": reason,
                    "xrp_price": xrp_price,
                    "carbon_intensity": intensity,
                    "fdc_verified": verified
                }
                
        except Exception as e:
            return {
                "decision": "HALT_ACTIVITY",
                "reason": f"Exception in decision making: {str(e)}",
                "xrp_price": None,
                "carbon_intensity": None,
                "fdc_verified": False
            }
    
    def run_interactive(self):
        """Run interactive terminal mode"""
        self.print_header()
        
        print("Commands:")
        print("  'q' or 'quit' - Exit terminal")
        print("  'd' or 'decide' - Make trading decision")
        print("  's' or 'status' - Show last decision")
        print("  'c' or 'continuous' - Continuous decision making (every 5 seconds)")
        print("  'i' or 'info' - Show feed connections and interactions")
        print("  'h' or 'help' - Show this help\n")
        
        while self.running:
            try:
                cmd = input("[MANAGER] > ").strip().lower()
                
                if cmd in ['q', 'quit', 'exit']:
                    print("\n[MANAGER] Shutting down...")
                    self.running = False
                    break
                    
                elif cmd in ['d', 'decide']:
                    decision_data = self.make_decision()
                    self.print_decision(decision_data)
                    print()
                    
                elif cmd in ['s', 'status']:
                    if self.last_decision:
                        print(f"\n[MANAGER] Last Decision: {self.last_decision}")
                        print(f"[MANAGER] Reason: {self.last_reason}\n")
                    else:
                        print("\n[MANAGER] No decision made yet. Use 'decide' command.\n")
                    
                elif cmd in ['c', 'continuous']:
                    print("\n[MANAGER] Starting continuous decision making (Ctrl+C to stop)...\n")
                    try:
                        while True:
                            decision_data = self.make_decision()
                            self.print_decision(decision_data)
                            print()
                            time.sleep(5)
                    except KeyboardInterrupt:
                        print("\n[MANAGER] Continuous decision making stopped\n")
                        
                elif cmd in ['i', 'info', 'feed']:
                    self.print_feed_info()
                    
                elif cmd in ['h', 'help']:
                    print("\nCommands:")
                    print("  'q' or 'quit' - Exit terminal")
                    print("  'd' or 'decide' - Make trading decision")
                    print("  's' or 'status' - Show last decision")
                    print("  'c' or 'continuous' - Continuous decision making (every 5 seconds)")
                    print("  'i' or 'info' - Show feed connections and interactions")
                    print("  'h' or 'help' - Show this help\n")
                    
                elif cmd == '':
                    continue
                    
                else:
                    print(f"[MANAGER] Unknown command: {cmd}. Type 'help' for commands.\n")
                    
            except KeyboardInterrupt:
                print("\n[MANAGER] Shutting down...")
                self.running = False
                break
            except EOFError:
                break
    
    def run_single_decision(self):
        """Run single decision and exit"""
        self.print_header()
        decision_data = self.make_decision()
        self.print_decision(decision_data)
        
        print(f"\n[MANAGER] ✅ Decision completed")
        return decision_data


def main():
    """Main entry point"""
    terminal = ManagerTerminal()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--single':
        # Single decision mode
        terminal.run_single_decision()
    else:
        # Interactive mode
        terminal.run_interactive()


if __name__ == "__main__":
    main()

