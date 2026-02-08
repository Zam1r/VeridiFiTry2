#!/usr/bin/env python3
"""
Auditor Agent Terminal Interface
Validates FDC proofs and checks if carbon intensity is below 50 gCO2/kWh
"""
import time
import sys
from datetime import datetime
from contract_interface import ContractInterface
from config import VERIDIFI_CORE_ADDRESS, RPC_URL, GREEN_ENERGY_THRESHOLD

class AuditorTerminal:
    """Terminal interface for Auditor Agent - FDC Carbon Verification"""
    
    def __init__(self):
        self.contract_interface = ContractInterface()
        self.running = True
        self.feed_status = "DISCONNECTED"
        self.last_verification = None
        self.last_intensity = None
        self.last_round_id = None
        
    def print_header(self):
        """Print terminal header"""
        print("\n" + "=" * 80)
        print("🔍 AUDITOR AGENT TERMINAL - FDC Carbon Verification Feed")
        print("=" * 80)
        print(f"Contract: {VERIDIFI_CORE_ADDRESS or 'Not Configured'}")
        print(f"RPC: {RPC_URL}")
        print(f"Feed Status: {self.feed_status}")
        print(f"Green Threshold: {GREEN_ENERGY_THRESHOLD} gCO2/kWh")
        print("=" * 80 + "\n")
    
    def print_feed_info(self):
        """Print detailed feed connection information"""
        print("\n" + "=" * 80)
        print("📡 AUDITOR AGENT - Feed Connection Information")
        print("=" * 80)
        print("\n🔗 Feed Connection:")
        print("  Type: FDC Verification (Flare Data Connector)")
        print("  Contract: VeridiFiCore")
        print(f"  Address: {VERIDIFI_CORE_ADDRESS or 'Not Configured'}")
        print("  Methods:")
        print("    • latestRoundId() - Get latest voting round ID")
        print("    • getCarbonIntensity(roundId) - Get carbon for specific round")
        print("    • getLatestCarbonIntensity() - Get latest carbon intensity")
        print("  Data Source: FDC Verification (Flare Consensus Network)")
        print("\n📊 Data Retrieved:")
        print("  • Carbon intensity (gCO2/kWh)")
        print("  • FDC verification status (VERIFIED/UNVERIFIED)")
        print("  • Voting round ID (for auditability)")
        print("  • Is low carbon (< 50 gCO2/kWh)")
        print("\n🔄 Interaction with Application:")
        print("  • Validates FDC proofs before trusting carbon data")
        print("  • Checks if carbon intensity < 50 gCO2/kWh")
        print("  • Outputs verification status to Manager Agent")
        print("  • Manager Agent requires FDC-verified data for EXECUTE_BUY")
        print("\n⚙️  Feed Flow:")
        print("  Auditor Agent → VeridiFiCore.check_fdc_verification()")
        print("               → FDC Verifier (On-Chain)")
        print("               → Flare Consensus Network")
        print("               → Carbon Intensity + Verification Status")
        print("               → Manager Agent (Decision Node)")
        print("\n✅ Validation Criteria:")
        print("  • FDC proof must be verified (Flare consensus)")
        print("  • Carbon intensity must be < 50 gCO2/kWh for 'Green' status")
        print("  • Voting round ID logged for auditability")
        print("  • Only FDC-verified data is trusted (no raw API data)")
        print("=" * 80 + "\n")
        
    def print_verification_update(self, verification_data):
        """Print formatted verification update"""
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        verified = verification_data.get("verified", False)
        intensity = verification_data.get("intensity")
        round_id = verification_data.get("voting_round_id")
        is_low_carbon = verification_data.get("is_low_carbon", False)
        
        if verified:
            if is_low_carbon and intensity and intensity < 50:
                status_emoji = "🟢"
                status_text = "GREEN VERIFIED"
                carbon_status = f"✅ Low Carbon ({intensity} gCO2/kWh < 50)"
            else:
                status_emoji = "🟡"
                status_text = "VERIFIED (Not Green)"
                carbon_status = f"⚠️  Carbon: {intensity} gCO2/kWh (>= 50)"
        else:
            status_emoji = "⏳"
            status_text = "UNVERIFIED"
            carbon_status = "Waiting for FDC consensus..."
        
        print(f"[{timestamp}] [AUDITOR] Status: {status_emoji} {status_text}")
        if intensity is not None:
            print(f"           Carbon Intensity: {intensity} gCO2/kWh")
        print(f"           {carbon_status}")
        if round_id:
            print(f"           Voting Round ID: {round_id}")
        print(f"           Source: FDC Verification (Flare Consensus)")
        
        self.last_verification = verified
        self.last_intensity = intensity
        self.last_round_id = round_id
        
    def check_fdc_proof(self):
        """Check FDC proof validation"""
        try:
            verification = self.contract_interface.check_fdc_verification()
            
            if not verification:
                self.feed_status = "ERROR"
                print(f"[{datetime.now().strftime('%H:%M:%S')}] [AUDITOR] ❌ Failed to check FDC verification")
                return None
            
            if verification.get("verified"):
                self.feed_status = "VERIFIED"
            else:
                self.feed_status = "PENDING"
                
            self.print_verification_update(verification)
            return verification
            
        except Exception as e:
            self.feed_status = "ERROR"
            print(f"[{datetime.now().strftime('%H:%M:%S')}] [AUDITOR] ❌ Error: {str(e)}")
            return None
    
    def validate_carbon_threshold(self, verification_data):
        """Validate if carbon intensity is below threshold"""
        if not verification_data:
            return False, "No verification data"
        
        verified = verification_data.get("verified", False)
        if not verified:
            return False, "FDC proof not verified"
        
        intensity = verification_data.get("intensity")
        if intensity is None:
            return False, "No carbon intensity data"
        
        is_below_threshold = intensity < 50  # 50 gCO2/kWh threshold
        
        if is_below_threshold:
            return True, f"✅ Carbon intensity ({intensity} gCO2/kWh) is below threshold (50 gCO2/kWh)"
        else:
            return False, f"❌ Carbon intensity ({intensity} gCO2/kWh) is above threshold (50 gCO2/kWh)"
    
    def run_interactive(self):
        """Run interactive terminal mode"""
        self.print_header()
        
        print("Commands:")
        print("  'q' or 'quit' - Exit terminal")
        print("  'r' or 'refresh' - Check FDC proof validation")
        print("  'v' or 'validate' - Validate carbon threshold (< 50 gCO2/kWh)")
        print("  's' or 'status' - Show feed status")
        print("  'c' or 'continuous' - Continuous monitoring (every 10 seconds)")
        print("  'i' or 'info' - Show feed connection information")
        print("  'h' or 'help' - Show this help\n")
        
        while self.running:
            try:
                cmd = input("[AUDITOR] > ").strip().lower()
                
                if cmd in ['q', 'quit', 'exit']:
                    print("\n[AUDITOR] Shutting down...")
                    self.running = False
                    break
                    
                elif cmd in ['r', 'refresh']:
                    self.check_fdc_proof()
                    
                elif cmd in ['v', 'validate']:
                    verification = self.check_fdc_proof()
                    if verification:
                        is_valid, message = self.validate_carbon_threshold(verification)
                        print(f"\n[AUDITOR] Validation Result: {message}\n")
                    
                elif cmd in ['s', 'status']:
                    print(f"\n[AUDITOR] Feed Status: {self.feed_status}")
                    if self.last_verification is not None:
                        print(f"[AUDITOR] Last Verification: {'✅ VERIFIED' if self.last_verification else '❌ UNVERIFIED'}")
                    if self.last_intensity is not None:
                        print(f"[AUDITOR] Last Intensity: {self.last_intensity} gCO2/kWh")
                    if self.last_round_id:
                        print(f"[AUDITOR] Last Round ID: {self.last_round_id}")
                    print()
                    
                elif cmd in ['c', 'continuous']:
                    print("\n[AUDITOR] Starting continuous monitoring (Ctrl+C to stop)...\n")
                    try:
                        while True:
                            self.check_fdc_proof()
                            time.sleep(10)
                    except KeyboardInterrupt:
                        print("\n[AUDITOR] Continuous monitoring stopped\n")
                        
                elif cmd in ['i', 'info', 'feed']:
                    self.print_feed_info()
                    
                elif cmd in ['h', 'help']:
                    print("\nCommands:")
                    print("  'q' or 'quit' - Exit terminal")
                    print("  'r' or 'refresh' - Check FDC proof validation")
                    print("  'v' or 'validate' - Validate carbon threshold (< 50 gCO2/kWh)")
                    print("  's' or 'status' - Show feed status")
                    print("  'c' or 'continuous' - Continuous monitoring (every 10 seconds)")
                    print("  'i' or 'info' - Show feed connection information")
                    print("  'h' or 'help' - Show this help\n")
                    
                elif cmd == '':
                    continue
                    
                else:
                    print(f"[AUDITOR] Unknown command: {cmd}. Type 'help' for commands.\n")
                    
            except KeyboardInterrupt:
                print("\n[AUDITOR] Shutting down...")
                self.running = False
                break
            except EOFError:
                break
    
    def run_single_check(self):
        """Run single check and exit"""
        self.print_header()
        result = self.check_fdc_proof()
        
        if result:
            is_valid, message = self.validate_carbon_threshold(result)
            print(f"\n[AUDITOR] ✅ Check completed")
            print(f"[AUDITOR] Validation: {message}")
            return result
        else:
            print(f"\n[AUDITOR] ❌ Check failed")
            return None


def main():
    """Main entry point"""
    terminal = AuditorTerminal()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--single':
        # Single check mode
        terminal.run_single_check()
    else:
        # Interactive mode
        terminal.run_interactive()


if __name__ == "__main__":
    main()

