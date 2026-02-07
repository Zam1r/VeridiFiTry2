"""
Plasma Payout Integration
Calls the TypeScript plasmaPayout.ts script to send gasless USDT rewards
"""
import subprocess
import os
import json
from typing import Optional, Dict
from pathlib import Path

# Get project root directory (parent of agents/)
PROJECT_ROOT = Path(__file__).parent.parent


def send_plasma_reward(
    recipient_address: str,
    amount_usdt: float = 1.0,
    reason: str = "EXECUTE_BUY - Green Energy Verified"
) -> Dict:
    """
    Send green reward via Plasma Paymaster (gasless)
    
    Args:
        recipient_address: Ethereum address to receive USDT
        amount_usdt: Amount in USDT (default: 1.0)
        reason: Reason for the reward
    
    Returns:
        dict with transaction details or error information
    """
    try:
        # Validate address format (basic check)
        if not recipient_address.startswith("0x") or len(recipient_address) != 42:
            return {
                "success": False,
                "error": f"Invalid recipient address: {recipient_address}"
            }
        
        # Build command to run the TypeScript script
        script_path = PROJECT_ROOT / "scripts" / "plasma" / "plasmaPayout.ts"
        
        if not script_path.exists():
            return {
                "success": False,
                "error": f"Plasma payout script not found at {script_path}"
            }
        
        # Check if GREEN_REWARD_CONTRACT_ADDRESS is set
        green_reward_address = os.getenv("GREEN_REWARD_CONTRACT_ADDRESS")
        if not green_reward_address:
            return {
                "success": False,
                "error": "GREEN_REWARD_CONTRACT_ADDRESS not set in .env file. Please deploy the contract first."
            }
        
        # Run the TypeScript script using hardhat
        cmd = [
            "yarn",
            "hardhat",
            "run",
            str(script_path.relative_to(PROJECT_ROOT)),
            "--network",
            "plasmaTestnet",
            recipient_address,
            str(amount_usdt),
            reason
        ]
        
        print(f"[Plasma] Executing: {' '.join(cmd)}")
        
        # Run the command
        result = subprocess.run(
            cmd,
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout
        )
        
        if result.returncode == 0:
            # Parse output to extract transaction hash
            output = result.stdout
            tx_hash = None
            
            # Try to extract transaction hash from output
            for line in output.split("\n"):
                if "Transaction hash:" in line:
                    tx_hash = line.split("Transaction hash:")[-1].strip()
                elif "hash:" in line.lower() and "0x" in line:
                    parts = line.split()
                    for part in parts:
                        if part.startswith("0x") and len(part) == 66:
                            tx_hash = part
                            break
            
            return {
                "success": True,
                "recipient": recipient_address,
                "amount_usdt": amount_usdt,
                "transaction_hash": tx_hash,
                "reason": reason,
                "gas_fee": "0.00",  # Plasma Paymaster covers gas
                "output": output
            }
        else:
            error_msg = result.stderr or result.stdout
            return {
                "success": False,
                "error": f"Plasma payout failed: {error_msg}",
                "returncode": result.returncode
            }
            
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Plasma payout timed out after 2 minutes"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Exception in plasma payout: {str(e)}"
        }


def check_plasma_setup() -> Dict:
    """
    Check if Plasma setup is configured correctly
    
    Returns:
        dict with setup status
    """
    issues = []
    
    # Check for required environment variables
    if not os.getenv("GREEN_REWARD_CONTRACT_ADDRESS"):
        issues.append("GREEN_REWARD_CONTRACT_ADDRESS not set in .env")
    
    if not os.getenv("PRIVATE_KEY"):
        issues.append("PRIVATE_KEY not set in .env")
    
    if not os.getenv("PLASMA_USDT_ADDRESS"):
        issues.append("PLASMA_USDT_ADDRESS not set in .env (optional, but recommended)")
    
    # Check if script exists
    script_path = PROJECT_ROOT / "scripts" / "plasma" / "plasmaPayout.ts"
    if not script_path.exists():
        issues.append(f"Plasma payout script not found: {script_path}")
    
    return {
        "configured": len(issues) == 0,
        "issues": issues
    }

