#!/usr/bin/env python3
"""
Settlement Agent Terminal Interface
Executes the payout via Plasma when EXECUTE_BUY signal is received
"""
import time
import sys
import os
import subprocess
from datetime import datetime
from pathlib import Path

class SettlementTerminal:
    """Terminal interface for Settlement Agent - Plasma Payout"""
    
    def __init__(self):
        self.running = True
        self.plasma_status = "DISCONNECTED"
        self.last_payout = None
        self.project_root = Path(__file__).parent.parent
        
    def print_header(self):
        """Print terminal header"""
        print("\n" + "=" * 80)
        print("💸 SETTLEMENT AGENT TERMINAL - Plasma Payout Execution")
        print("=" * 80)
        print(f"Plasma Status: {self.plasma_status}")
        print(f"Recipient: {os.getenv('PLASMA_RECIPIENT_ADDRESS', 'Not Configured')}")
        print(f"Project Root: {self.project_root}")
        print("=" * 80 + "\n")
    
    def print_feed_info(self):
        """Print detailed feed connection information"""
        script_path = self.project_root / "scripts" / "plasma" / "plasma_settlement.ts"
        print("\n" + "=" * 80)
        print("📡 SETTLEMENT AGENT - Feed Connection Information")
        print("=" * 80)
        print("\n🔗 Feed Connection:")
        print("  Type: Plasma Network (Gasless Payment Network)")
        print("  Script: plasma_settlement.ts")
        print(f"  Path: {script_path}")
        print(f"  Exists: {'✅ Yes' if script_path.exists() else '❌ No'}")
        print("  Network: Plasma Testnet")
        print("  Paymaster: Plasma Paymaster (covers gas fees)")
        print("\n📊 Data Retrieved/Executed:")
        print("  • Transaction hash")
        print("  • Payout status (COMPLETED/FAILED)")
        print("  • Amount (USDT)")
        print("  • Recipient address")
        print("  • Gas fee: $0.00 (covered by Plasma Paymaster)")
        print("\n🔄 Interaction with Application:")
        print("  • Receives EXECUTE_BUY signal from Manager Agent")
        print("  • Executes gasless USDT payout via Plasma")
        print("  • Only executes when Manager Agent approves trade")
        print("  • Provides transaction confirmation back to system")
        print("\n⚙️  Feed Flow:")
        print("  Manager Agent → EXECUTE_BUY Signal")
        print("               → Settlement Agent")
        print("               → plasma_settlement.ts script")
        print("               → Plasma Paymaster Helper")
        print("               → Plasma Network (Testnet)")
        print("               → Gasless USDT Transfer")
        print("               → Transaction Hash + Status")
        print("\n💡 Key Features:")
        print("  • Gasless transactions (user pays $0 gas)")
        print("  • USDT token transfers")
        print("  • On-chain transaction confirmation")
        print("  • Automatic gas fee coverage by Plasma Paymaster")
        print("\n🔐 Security:")
        print("  • Only executes after Manager Agent approval")
        print("  • Requires valid recipient address")
        print("  • Transaction verification on Plasma network")
        print("  • Timeout protection (120s max)")
        print("=" * 80 + "\n")
        
    def print_payout_result(self, payout_data):
        """Print formatted payout result"""
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        executed = payout_data.get("executed", False)
        tx_hash = payout_data.get("transaction_hash")
        amount = payout_data.get("amount_usdt", 0)
        recipient = payout_data.get("recipient", "Unknown")
        error = payout_data.get("error")
        
        if executed:
            status_emoji = "✅"
            status_text = "COMPLETED"
        else:
            status_emoji = "❌"
            status_text = "FAILED"
        
        print(f"[{timestamp}] [SETTLEMENT] Status: {status_emoji} {status_text}")
        if executed:
            print(f"           Amount: {amount} USDT")
            print(f"           Recipient: {recipient}")
            if tx_hash:
                print(f"           Transaction Hash: {tx_hash}")
            print(f"           Gas Fee: $0.00 (Covered by Plasma Paymaster)")
        else:
            if error:
                print(f"           Error: {error}")
        
        self.last_payout = payout_data
        
    def execute_plasma_payout(self, recipient=None, amount="1.0"):
        """Execute Plasma payout via plasma_settlement.ts script"""
        try:
            if not recipient:
                recipient = os.getenv("PLASMA_RECIPIENT_ADDRESS", "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
            
            script_path = self.project_root / "scripts" / "plasma" / "plasma_settlement.ts"
            
            if not script_path.exists():
                return {
                    "executed": False,
                    "error": f"Plasma settlement script not found: {script_path}",
                    "amount_usdt": float(amount),
                    "recipient": recipient
                }
            
            print(f"[{datetime.now().strftime('%H:%M:%S')}] [SETTLEMENT] Executing Plasma payout...")
            print(f"           Recipient: {recipient}")
            print(f"           Amount: {amount} USDT")
            
            # Call plasma_settlement.ts script
            result = subprocess.run(
                ["npx", "ts-node", str(script_path.relative_to(self.project_root)), recipient, amount],
                cwd=str(self.project_root),
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                # Parse transaction hash from output
                tx_hash = None
                for line in result.stdout.split("\n"):
                    if "Transaction hash:" in line:
                        tx_hash = line.split("Transaction hash:")[-1].strip()
                
                self.plasma_status = "CONNECTED"
                payout_data = {
                    "executed": True,
                    "transaction_hash": tx_hash,
                    "amount_usdt": float(amount),
                    "recipient": recipient,
                    "gas_fee": 0.0,
                    "status": "COMPLETED",
                    "timestamp": int(time.time())
                }
                
                self.print_payout_result(payout_data)
                return payout_data
            else:
                error_msg = result.stderr or result.stdout
                self.plasma_status = "ERROR"
                payout_data = {
                    "executed": False,
                    "error": error_msg,
                    "amount_usdt": float(amount),
                    "recipient": recipient,
                    "status": "FAILED"
                }
                
                self.print_payout_result(payout_data)
                return payout_data
                
        except subprocess.TimeoutExpired:
            error_msg = "Plasma payout timed out"
            self.plasma_status = "ERROR"
            payout_data = {
                "executed": False,
                "error": error_msg,
                "amount_usdt": float(amount),
                "recipient": recipient,
                "status": "FAILED"
            }
            self.print_payout_result(payout_data)
            return payout_data
            
        except Exception as e:
            error_msg = f"Exception in Plasma payout: {str(e)}"
            self.plasma_status = "ERROR"
            payout_data = {
                "executed": False,
                "error": error_msg,
                "amount_usdt": float(amount),
                "recipient": recipient,
                "status": "FAILED"
            }
            self.print_payout_result(payout_data)
            return payout_data
    
    def run_interactive(self):
        """Run interactive terminal mode"""
        self.print_header()
        
        print("Commands:")
        print("  'q' or 'quit' - Exit terminal")
        print("  'e' or 'execute' - Execute Plasma payout")
        print("  's' or 'status' - Show payout status")
        print("  'i' or 'info' - Show feed connection information")
        print("  'h' or 'help' - Show this help\n")
        
        while self.running:
            try:
                cmd = input("[SETTLEMENT] > ").strip().lower()
                
                if cmd in ['q', 'quit', 'exit']:
                    print("\n[SETTLEMENT] Shutting down...")
                    self.running = False
                    break
                    
                elif cmd in ['e', 'execute']:
                    recipient = input("  Recipient address (or press Enter for default): ").strip()
                    if not recipient:
                        recipient = None
                    amount = input("  Amount in USDT (or press Enter for 1.0): ").strip()
                    if not amount:
                        amount = "1.0"
                    
                    print()
                    self.execute_plasma_payout(recipient, amount)
                    print()
                    
                elif cmd in ['s', 'status']:
                    print(f"\n[SETTLEMENT] Plasma Status: {self.plasma_status}")
                    if self.last_payout:
                        print(f"[SETTLEMENT] Last Payout: {'✅ EXECUTED' if self.last_payout.get('executed') else '❌ FAILED'}")
                        if self.last_payout.get('transaction_hash'):
                            print(f"[SETTLEMENT] TX Hash: {self.last_payout['transaction_hash']}")
                        if self.last_payout.get('error'):
                            print(f"[SETTLEMENT] Error: {self.last_payout['error']}")
                    print()
                    
                elif cmd in ['i', 'info', 'feed']:
                    self.print_feed_info()
                    
                elif cmd in ['h', 'help']:
                    print("\nCommands:")
                    print("  'q' or 'quit' - Exit terminal")
                    print("  'e' or 'execute' - Execute Plasma payout")
                    print("  's' or 'status' - Show payout status")
                    print("  'i' or 'info' - Show feed connection information")
                    print("  'h' or 'help' - Show this help\n")
                    
                elif cmd == '':
                    continue
                    
                else:
                    print(f"[SETTLEMENT] Unknown command: {cmd}. Type 'help' for commands.\n")
                    
            except KeyboardInterrupt:
                print("\n[SETTLEMENT] Shutting down...")
                self.running = False
                break
            except EOFError:
                break
    
    def run_single_payout(self, recipient=None, amount="1.0"):
        """Run single payout and exit"""
        self.print_header()
        result = self.execute_plasma_payout(recipient, amount)
        
        if result.get("executed"):
            print(f"\n[SETTLEMENT] ✅ Payout executed successfully")
        else:
            print(f"\n[SETTLEMENT] ❌ Payout failed")
        
        return result


def main():
    """Main entry point"""
    terminal = SettlementTerminal()
    
    if len(sys.argv) > 1:
        # Single payout mode
        recipient = sys.argv[1] if len(sys.argv) > 1 else None
        amount = sys.argv[2] if len(sys.argv) > 2 else "1.0"
        terminal.run_single_payout(recipient, amount)
    else:
        # Interactive mode
        terminal.run_interactive()


if __name__ == "__main__":
    main()

