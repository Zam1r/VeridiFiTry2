"""
Dashboard Backend Server
Serves real-time data from the Green Treasury system to the dashboard
Integrated with Carbon Credits Market frontend (market analysis, portfolio, trading)
"""
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import time
import threading
from datetime import datetime
from typing import Optional, Dict
from contract_interface import ContractInterface
from config import RPC_URL, PRICE_ORACLE_ADDRESS, VERIDIFI_CORE_ADDRESS
import requests
import random
import os

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)  # Enable CORS for the dashboard

# Global state
current_data = {
    "market_report": None,
    "carbon_audit": None,
    "fdc_verification_status": None,
    "treasury_decision": None,
    "settlement_status": None,
    "agent_logs": [],
    "plasma_commands": [],  # Track plasma command history
    "user_wallet_address": None,  # User's wallet address for Plasma payouts
    "user_credits": 0,  # User's carbon credits
    "user_balance": 10000,  # User's account balance (default $10,000)
    "agents_running": True  # Track if agents are running
}

# Control flag for agent loop
agents_running = True
update_thread = None
swarm_thread = None  # Thread for LangGraph agents
swarm_running = False  # Track if swarm is actively running

# Initialize contract interface
contract_interface = None
try:
    contract_interface = ContractInterface()
except Exception as e:
    print(f"Warning: Could not initialize contract interface: {e}")
    print("Dashboard will use mock data")

# Constants
GREEN_THRESHOLD = 50
AMBER_THRESHOLD = 150


def log_agent(agent_name: str, message: str):
    """Add log entry to agent logs"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_entry = {
        "timestamp": timestamp,
        "agent": agent_name,
        "message": message
    }
    current_data["agent_logs"].append(log_entry)
    
    # Keep only last 100 entries
    if len(current_data["agent_logs"]) > 100:
        current_data["agent_logs"] = current_data["agent_logs"][-100:]
    
    print(f"[{timestamp}] [{agent_name}] -> {message}")


def log_plasma_command(command: str, output: str = None, status: str = "info"):
    """Add plasma command entry to plasma commands history"""
    command_entry = {
        "timestamp": int(time.time()),
        "command": command,
        "output": output,
        "status": status  # "info", "success", "error"
    }
    current_data["plasma_commands"].append(command_entry)
    
    # Keep only last 50 entries
    if len(current_data["plasma_commands"]) > 50:
        current_data["plasma_commands"] = current_data["plasma_commands"][-50:]


def fetch_market_data() -> Optional[Dict]:
    """Fetch market data from FTSO"""
    if not contract_interface:
        log_agent("Scout", "Contract interface not initialized. Check RPC connection and .env file")
        return None
        
    if not contract_interface.price_oracle:
        log_agent("Scout", "PriceOracle contract not configured. Set PRICE_ORACLE_ADDRESS in .env file")
        return None
    
    try:
        price_data = contract_interface.get_latest_prices()
        if not price_data:
            log_agent("Scout", "Failed to fetch prices from contract. Check contract address and deployment")
            return None
        
        # Check for oracle timeout (3 minutes)
        current_time = int(time.time())
        btc_age = current_time - price_data["btc_timestamp"]
        xrp_age = current_time - price_data["xrp_timestamp"]
        
        if btc_age > 180 or xrp_age > 180:
            log_agent("Scout", f"Oracle Timeout: Data is stale (BTC: {btc_age}s, XRP: {xrp_age}s)")
            return {
                "error": "ORACLE_TIMEOUT",
                "btc_age_seconds": btc_age,
                "xrp_age_seconds": xrp_age
            }
        
        market_report = {
            "btc_usd": price_data["btc_price"],
            "xrp_usd": price_data["xrp_price"],
            "btc_timestamp": price_data["btc_timestamp"],
            "xrp_timestamp": price_data["xrp_timestamp"],
            "btc_freshness_seconds": btc_age,
            "xrp_freshness_seconds": xrp_age,
            "data_source": "FTSO Oracle (On-Chain)",
            "contract_address": PRICE_ORACLE_ADDRESS,
            "status": "VALID"
        }
        
        log_agent("Scout", f"BTC/USD: ${price_data['btc_price']:,.2f} (age: {btc_age}s)")
        log_agent("Scout", f"XRP/USD: ${price_data['xrp_price']:,.4f} (age: {xrp_age}s)")
        
        return market_report
        
    except Exception as e:
        log_agent("Scout", f"Error fetching market data: {str(e)}")
        return None


def fetch_carbon_data() -> Optional[Dict]:
    """Fetch carbon intensity data from FDC - verifies proofs before trusting data"""
    intensity = None
    data_source = "Unknown"
    is_fdc_verified = False
    fdc_round_id = None
    verification_status = "UNVERIFIED"
    
    # Step 1: Check if FDC has verified a proof (consensus reached)
    if contract_interface and contract_interface.veridiFi_core:
        try:
            fdc_verification = contract_interface.check_fdc_verification()
            if fdc_verification and fdc_verification.get("verified"):
                # FDC proof exists and was verified by Flare nodes
                is_fdc_verified = True
                intensity = fdc_verification["intensity"]
                fdc_round_id = fdc_verification.get("latest_round_id")
                data_source = "FDC Verified (Flare Consensus)"
                log_agent("Auditor", f"✅ FDC proof verified! Carbon intensity: {intensity} gCO2/kWh")
                
                # Check if it's low carbon (Green)
                if fdc_verification.get("is_low_carbon", False):
                    verification_status = "STATE_GREEN_VERIFIED"
                    log_agent("Auditor", "🟢 STATE_GREEN_VERIFIED: Low carbon confirmed by FDC consensus!")
                else:
                    verification_status = "VERIFIED"
                    log_agent("Auditor", f"⚠️ FDC verified but carbon is not low ({intensity} gCO2/kWh)")
        except Exception as e:
            log_agent("Auditor", f"FDC verification check error: {str(e)}")
    
    # Fallback to National Grid API (but mark as UNVERIFIED)
    if not is_fdc_verified:
        log_agent("Auditor", "⏳ No FDC-verified proof found. Waiting for Flare nodes to reach consensus...")
        log_agent("Auditor", "Fetching unverified data from National Grid API for reference...")
        try:
            response = requests.get(
                "https://api.carbonintensity.org.uk/intensity",
                headers={"Accept": "application/json"},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                intensity = data.get("data", [{}])[0].get("intensity", {}).get("actual")
                data_source = "National Grid API (UNVERIFIED - No FDC Proof)"
                log_agent("Auditor", f"⚠️ Unverified API data: {intensity} gCO2/kWh (NOT trusted)")
            else:
                raise Exception(f"API returned status {response.status_code}")
                
        except Exception as api_error:
            log_agent("Auditor", f"API fetch failed: {str(api_error)}")
            # Fail-safe: Default to Red
            intensity = 200
            data_source = "Default (Safety First - FDC Unavailable)"
            log_agent("Auditor", "FAIL-SAFE: Defaulting to Red (200 gCO2/kWh) - Safety First")
    
    # Determine status
    if intensity is None:
        status = "Unknown"
        status_emoji = "⚪"
    elif intensity < GREEN_THRESHOLD:
        status = "Green"
        status_emoji = "🟢"
    elif intensity < AMBER_THRESHOLD:
        status = "Amber"
        status_emoji = "🟡"
    else:
        status = "Red"
        status_emoji = "🔴"
    
    carbon_audit = {
        "intensity": intensity,
        "status": status,
        "status_emoji": status_emoji,
        "region": "Oxford",
        "green_threshold": GREEN_THRESHOLD,
        "amber_threshold": AMBER_THRESHOLD,
        "data_source": data_source,
        "is_fdc_verified": is_fdc_verified,
        "fdc_round_id": fdc_round_id,
        "timestamp": int(time.time()),
        "is_green": status == "Green",
        "is_amber": status == "Amber",
        "is_red": status == "Red"
    }
    
    log_agent("Auditor", f"Carbon Intensity: {intensity} gCO2/kWh - Status: {status_emoji} {status}")
    log_agent("Auditor", f"Verification Status: {verification_status}")
    
    return carbon_audit


def update_data_loop():
    """Background thread that updates data every 1.8 seconds"""
    global current_data, agents_running
    
    while True:
        if not agents_running:
            time.sleep(0.5)  # Check more frequently when stopped
            continue
            
        try:
            # Fetch market data
            market_report = fetch_market_data()
            if market_report:
                current_data["market_report"] = market_report
            
            # Fetch carbon data (less frequently)
            if int(time.time()) % 10 == 0:  # Every 10 seconds
                carbon_audit = fetch_carbon_data()
                if carbon_audit:
                    current_data["carbon_audit"] = carbon_audit
                    # Update FDC verification status
                    if carbon_audit.get("is_fdc_verified"):
                        if carbon_audit.get("is_green"):
                            current_data["fdc_verification_status"] = "STATE_GREEN_VERIFIED"
                        else:
                            current_data["fdc_verification_status"] = "VERIFIED"
                    else:
                        current_data["fdc_verification_status"] = "UNVERIFIED"
            
            # Make treasury decision
            if current_data["market_report"] and current_data["carbon_audit"]:
                make_treasury_decision()
            
        except Exception as e:
            log_agent("System", f"Error in update loop: {str(e)}")
        
        time.sleep(1.8)  # 1.8 seconds


def _execute_plasma_payout():
    """Execute Plasma payout when EXECUTE_BUY signal is received"""
    try:
        from plasma_payout import send_plasma_reward, check_plasma_setup
        import os
        
        # Check setup
        setup_status = check_plasma_setup()
        if not setup_status["configured"]:
            log_agent("Settlement", f"⚠️ Plasma not configured: {setup_status['issues']}")
            log_agent("Settlement", "Using mock payment. Configure Plasma to enable real payouts.")
            log_plasma_command(
                "check_plasma_setup",
                f"⚠️ Plasma not configured: {', '.join(setup_status['issues'])}",
                "error"
            )
            _mock_plasma_payout()
            return
        
        # Get recipient - prioritize user-provided wallet, then env var, then default
        recipient = current_data.get("user_wallet_address")
        if not recipient:
            recipient = os.getenv("PLASMA_RECIPIENT_ADDRESS")
        if not recipient:
            recipient = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"  # Default fallback
        
        amount = 1.0
        reason = "EXECUTE_BUY - Green Energy Verified via FDC"
        
        log_agent("Settlement", "EXECUTE_BUY signal received. Initiating Plasma Payment...")
        log_agent("Settlement", f"Sending {amount} USDT to {recipient}")
        log_agent("Settlement", "Gas Fee: $0.00 (Covered by Plasma Paymaster)")
        
        # Check if using user-provided wallet
        if current_data.get("user_wallet_address"):
            log_agent("Settlement", f"Using user-configured wallet: {recipient[:10]}...{recipient[-8:]}")
        else:
            log_agent("Settlement", "⚠️ No user wallet configured. Using default/fallback address.")
        
        # Log command
        log_plasma_command(
            f"send_plasma_reward {recipient} {amount} \"{reason}\"",
            f"Initiating Plasma Payment: {amount} USDT to {recipient}",
            "info"
        )
        
        # Send payout
        result = send_plasma_reward(recipient, amount, reason)
        
        if result.get("success"):
            tx_hash = result.get("transaction_hash", "Pending")
            log_agent("Settlement", f"✅ Plasma Payment executed successfully!")
            log_agent("Settlement", f"TX Hash: {tx_hash}")
            log_agent("Settlement", f"Amount: {amount} USDT (Green Reward)")
            log_agent("Settlement", "💚 Recipient received USDT with $0 gas fees!")
            
            log_plasma_command(
                f"send_plasma_reward {recipient} {amount}",
                f"✅ Success! TX: {tx_hash} | Amount: {amount} USDT | Gas Fee: $0.00",
                "success"
            )
            
            current_data["settlement_status"] = {
                "executed": True,
                "transaction_hash": tx_hash,
                "amount_usdt": amount,
                "recipient": recipient,
                "fee": 0.0,
                "payment_type": "Green Reward (Plasma)",
                "status": "COMPLETED",
                "timestamp": int(time.time()),
                "network": "Plasma Testnet"
            }
        else:
            error = result.get("error", "Unknown error")
            log_agent("Settlement", f"❌ Plasma payment failed: {error}")
            log_agent("Settlement", "Falling back to mock payment...")
            log_plasma_command(
                f"send_plasma_reward {recipient} {amount}",
                f"❌ Failed: {error}",
                "error"
            )
            _mock_plasma_payout(error)
            
    except ImportError:
        log_agent("Settlement", "⚠️ Plasma payout module not available. Using mock payment.")
        log_plasma_command(
            "import plasma_payout",
            "⚠️ Plasma payout module not available. Using mock payment.",
            "error"
        )
        _mock_plasma_payout()
    except Exception as e:
        log_agent("Settlement", f"❌ Error in Plasma payout: {str(e)}")
        log_plasma_command(
            "send_plasma_reward",
            f"❌ Exception: {str(e)}",
            "error"
        )
        _mock_plasma_payout(str(e))


def _mock_plasma_payout(error_msg: str = None):
    """Fallback mock payout"""
    import os
    # Get recipient - prioritize user-provided wallet, then env var, then default
    recipient = current_data.get("user_wallet_address")
    if not recipient:
        recipient = os.getenv("PLASMA_RECIPIENT_ADDRESS")
    if not recipient:
        recipient = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"  # Default fallback
    amount = 1.0
    
    log_agent("Settlement", f"Simulating Plasma Payment: {amount} USDT to {recipient}")
    log_agent("Settlement", "Paymaster Fee: $0.00 (Zero-Fee)")
    if error_msg:
        log_agent("Settlement", f"Note: {error_msg}")
    
    import random
    tx_hash = f"0x{''.join([f'{random.randint(0, 15):x}' for _ in range(64)])}"
    
    log_plasma_command(
        f"send_plasma_reward {recipient} {amount} (mock)",
        f"✅ Mock Payment: TX: {tx_hash} | Amount: {amount} USDT | Note: Configure Plasma for real payouts",
        "info"
    )
    
    current_data["settlement_status"] = {
        "executed": True,
        "transaction_hash": tx_hash,
        "amount_usdt": amount,
        "recipient": recipient,
        "fee": 0.0,
        "payment_type": "Green Reward (Mock)",
        "status": "COMPLETED",
        "timestamp": int(time.time()),
        "note": "Mock payment - Configure Plasma for real payouts"
    }
    
    log_agent("Settlement", "✅ Mock Plasma Payment executed (configure Plasma for real payouts)")


def make_treasury_decision():
    """Make treasury decision based on market and carbon data - requires FDC verification"""
    market_report = current_data["market_report"]
    carbon_audit = current_data["carbon_audit"]
    fdc_status = current_data.get("fdc_verification_status")
    
    if not market_report or not carbon_audit:
        return
    
    # Check for oracle timeout
    if market_report.get("error") == "ORACLE_TIMEOUT":
        current_data["treasury_decision"] = {
            "decision": "HALT_ACTIVITY",
            "reason": "Oracle Timeout: FTSO data is stale (>3 minutes)"
        }
        log_agent("Manager", "DECISION: HALT_ACTIVITY - Oracle timeout detected. Trading halted for safety.")
        return
    
    xrp_price = market_report.get("xrp_usd", 0)
    energy_status = carbon_audit.get("status", "Unknown")
    is_green = carbon_audit.get("is_green", False)
    is_red = carbon_audit.get("is_red", False)
    is_fdc_verified = carbon_audit.get("is_fdc_verified", False)
    intensity = carbon_audit.get("intensity", 999)
    XRP_TARGET_PRICE = 1.10
    
    log_agent("Manager", f"Evaluating conditions: XRP=${xrp_price:.4f}, Energy={energy_status} ({intensity} gCO2/kWh)")
    log_agent("Manager", f"FDC Verification Status: {fdc_status}")
    
    # Critical: Check if FDC proof is verified
    if not is_fdc_verified or fdc_status != "STATE_GREEN_VERIFIED":
        if not is_fdc_verified:
            reason = "FDC proof not verified. Waiting for Flare nodes to reach consensus. AI doesn't trust unverified data."
            log_agent("Manager", "⚠️ Carbon data is not FDC-verified. AI requires consensus before trading.")
        elif fdc_status == "VERIFIED":
            reason = f"FDC verified but carbon is not low ({intensity} gCO2/kWh). Waiting for Green energy."
        else:
            reason = "FDC verification pending. Waiting for consensus."
        
        current_data["treasury_decision"] = {
            "decision": "WAIT",
            "reason": reason
        }
        log_agent("Manager", f"DECISION: WAIT - {reason}")
        return
    
    # Logic Gate 1: If Energy is 'Red', HALT_ACTIVITY
    if is_red:
        current_data["treasury_decision"] = {
            "decision": "HALT_ACTIVITY",
            "reason": f"Energy is Red ({intensity} gCO2/kWh > {AMBER_THRESHOLD}). Halting activity."
        }
        log_agent("Manager", f"DECISION: HALT_ACTIVITY - Energy is Red ({intensity} gCO2/kWh). Saving on carbon impact fees.")
        return
    
    # Logic Gate 2: If Energy is 'Green' AND FDC-verified (STATE_GREEN_VERIFIED) AND XRP Price < $1.10, EXECUTE_BUY
    if is_green and fdc_status == "STATE_GREEN_VERIFIED" and xrp_price < XRP_TARGET_PRICE:
        current_data["treasury_decision"] = {
            "decision": "EXECUTE_BUY",
            "reason": f"✅ STATE_GREEN_VERIFIED: FDC consensus confirmed low carbon ({intensity} gCO2/kWh < {GREEN_THRESHOLD}) AND XRP Price (${xrp_price:.4f}) is below target (${XRP_TARGET_PRICE})."
        }
        log_agent("Manager", f"DECISION: EXECUTE_BUY - FDC-verified Green energy AND XRP below target. Handoff to Settlement.")
        log_agent("Manager", "✅ All conditions met: FDC-verified Green energy + favorable XRP price")
        
        # Trigger Plasma payout
        _execute_plasma_payout()
        
        return
    
    # Default: WAIT
    if not is_green:
        reason = f"Waiting for Green energy. Current: {energy_status} ({intensity} gCO2/kWh)"
    elif xrp_price >= XRP_TARGET_PRICE:
        reason = f"XRP price (${xrp_price:.4f}) above target (${XRP_TARGET_PRICE}). Waiting for better entry."
    else:
        reason = f"Conditions not met. Energy: {energy_status}, XRP: ${xrp_price:.4f}"
    
    current_data["treasury_decision"] = {
        "decision": "WAIT",
        "reason": reason
    }
    log_agent("Manager", f"DECISION: WAIT - {reason}")


@app.route('/')
def index():
    """Serve the Carbon Credits Market frontend (main page)"""
    return send_from_directory('static', 'index.html')

@app.route('/dashboard')
def old_dashboard():
    """Serve the old dashboard HTML (for backward compatibility)"""
    return send_from_directory('.', 'dashboard.html')


@app.route('/api/data')
def get_data():
    """Get current data for dashboard"""
    return jsonify({
        "market_report": current_data["market_report"],
        "carbon_audit": current_data["carbon_audit"],
        "fdc_verification_status": current_data["fdc_verification_status"],
        "treasury_decision": current_data["treasury_decision"],
        "settlement_status": current_data["settlement_status"],
        "agent_logs": current_data["agent_logs"][-100:],  # Last 100 logs for real-time updates
        "agents_running": current_data["agents_running"],
        "timestamp": int(time.time())
    })

@app.route('/api/agent-logs')
def get_agent_logs():
    """Get all agent logs for developer panel"""
    return jsonify({
        "agent_logs": current_data["agent_logs"],
        "total_count": len(current_data["agent_logs"]),
        "agents_running": current_data["agents_running"],
        "timestamp": int(time.time())
    })

@app.route('/api/plasma-commands')
def get_plasma_commands():
    """Get plasma command history for terminal display"""
    return jsonify({
        "plasma_commands": current_data["plasma_commands"],
        "total_count": len(current_data["plasma_commands"]),
        "timestamp": int(time.time())
    })

# Admin API Endpoints
@app.route('/api/admin/update-wallet', methods=['POST'])
def admin_update_wallet():
    """Admin: Update user wallet address"""
    try:
        data = request.get_json()
        wallet_address = data.get("wallet_address", "").strip()
        
        if not wallet_address:
            return jsonify({"error": "Wallet address is required"}), 400
        
        # Validate Ethereum address format
        import re
        if not re.match(r'^0x[a-fA-F0-9]{40}$', wallet_address):
            return jsonify({"error": "Invalid Ethereum address format"}), 400
        
        # Update wallet address
        current_data["user_wallet_address"] = wallet_address
        
        # Log the update
        log_plasma_command(
            f"admin_set_wallet {wallet_address}",
            f"✅ Admin updated wallet: {wallet_address[:10]}...{wallet_address[-8:]}",
            "success"
        )
        log_agent("Admin", f"Wallet address updated: {wallet_address[:10]}...{wallet_address[-8:]}")
        
        return jsonify({
            "success": True,
            "wallet_address": wallet_address,
            "message": "Wallet address updated successfully",
            "timestamp": int(time.time())
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/update-credits', methods=['POST'])
def admin_update_credits():
    """Admin: Update user carbon credits"""
    try:
        data = request.get_json()
        credits = data.get("credits")
        
        if credits is None:
            return jsonify({"error": "Credits value is required"}), 400
        
        try:
            credits = int(credits)
            if credits < 0:
                return jsonify({"error": "Credits must be a non-negative integer"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Credits must be a valid integer"}), 400
        
        # Update credits in current_data (for backend tracking)
        current_data["user_credits"] = credits
        
        log_agent("Admin", f"Carbon credits updated to {credits:,} CC")
        
        return jsonify({
            "success": True,
            "credits": credits,
            "message": f"Carbon credits updated to {credits:,} CC",
            "timestamp": int(time.time())
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/add-money', methods=['POST'])
def admin_add_money():
    """Admin: Add money to user account"""
    try:
        data = request.get_json()
        amount = data.get("amount")
        
        if amount is None:
            return jsonify({"error": "Amount is required"}), 400
        
        try:
            amount = float(amount)
            if amount <= 0:
                return jsonify({"error": "Amount must be greater than 0"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Amount must be a valid number"}), 400
        
        # Update balance in current_data
        current_balance = current_data.get("user_balance", 0)
        new_balance = current_balance + amount
        current_data["user_balance"] = new_balance
        
        log_agent("Admin", f"Added ${amount:.2f} to account. New balance: ${new_balance:.2f}")
        
        return jsonify({
            "success": True,
            "amount_added": amount,
            "new_balance": new_balance,
            "message": f"${amount:.2f} added to account",
            "timestamp": int(time.time())
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/pay-user', methods=['POST'])
def admin_pay_user():
    """Admin: Manually trigger Plasma payout to user"""
    try:
        data = request.get_json()
        amount = data.get("amount", 1.0)
        
        try:
            amount = float(amount)
            if amount <= 0:
                return jsonify({"error": "Amount must be greater than 0"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Amount must be a valid number"}), 400
        
        # Get recipient wallet
        recipient = current_data.get("user_wallet_address")
        if not recipient:
            recipient = os.getenv("PLASMA_RECIPIENT_ADDRESS")
        if not recipient:
            recipient = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        
        log_agent("Admin", f"Manual Plasma payout initiated: {amount} USDT to {recipient[:10]}...{recipient[-8:]}")
        
        # Trigger Plasma payout
        try:
            from plasma_payout import send_plasma_reward, check_plasma_setup
            
            setup_status = check_plasma_setup()
            if not setup_status["configured"]:
                log_plasma_command(
                    f"admin_pay_user {amount} USDT",
                    f"⚠️ Plasma not configured: {', '.join(setup_status['issues'])}",
                    "error"
                )
                return jsonify({
                    "success": False,
                    "error": "Plasma not configured",
                    "issues": setup_status["issues"]
                }), 400
            
            reason = f"Admin Manual Payout - {amount} USDT"
            log_plasma_command(
                f"admin_pay_user {recipient} {amount}",
                f"Initiating admin payout: {amount} USDT to {recipient[:10]}...{recipient[-8:]}",
                "info"
            )
            
            result = send_plasma_reward(recipient, amount, reason)
            
            if result.get("success"):
                tx_hash = result.get("transaction_hash", "Pending")
                log_plasma_command(
                    f"admin_pay_user {amount} USDT",
                    f"✅ Success! TX: {tx_hash} | Amount: {amount} USDT | Gas Fee: $0.00",
                    "success"
                )
                return jsonify({
                    "success": True,
                    "transaction_hash": tx_hash,
                    "amount": amount,
                    "recipient": recipient,
                    "message": f"Plasma payout executed: {amount} USDT",
                    "timestamp": int(time.time())
                })
            else:
                error = result.get("error", "Unknown error")
                log_plasma_command(
                    f"admin_pay_user {amount} USDT",
                    f"❌ Failed: {error}",
                    "error"
                )
                return jsonify({
                    "success": False,
                    "error": error
                }), 500
                
        except ImportError:
            log_plasma_command(
                f"admin_pay_user {amount} USDT",
                "⚠️ Plasma payout module not available",
                "error"
            )
            return jsonify({
                "success": False,
                "error": "Plasma payout module not available"
            }), 500
        except Exception as e:
            log_plasma_command(
                f"admin_pay_user {amount} USDT",
                f"❌ Exception: {str(e)}",
                "error"
            )
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/reset-user', methods=['POST'])
def admin_reset_user():
    """Admin: Reset all user data"""
    try:
        # Reset user data
        current_data["user_wallet_address"] = None
        current_data["user_credits"] = 0
        current_data["user_balance"] = 10000  # Default balance
        
        log_agent("Admin", "User data reset to defaults")
        
        return jsonify({
            "success": True,
            "message": "User data reset successfully",
            "timestamp": int(time.time())
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/user-wallet', methods=['GET'])
def get_user_wallet():
    """Get user's saved wallet address"""
    # For now, use a simple in-memory store or session
    # In production, this would be tied to user authentication
    wallet_address = current_data.get("user_wallet_address")
    
    # Fallback to environment variable if no user wallet set
    if not wallet_address:
        wallet_address = os.getenv("PLASMA_RECIPIENT_ADDRESS")
    
    return jsonify({
        "wallet_address": wallet_address,
        "timestamp": int(time.time())
    })

@app.route('/api/user-wallet', methods=['POST'])
def save_user_wallet():
    """Save user's wallet address"""
    try:
        data = request.get_json()
        wallet_address = data.get("wallet_address", "").strip()
        
        # Validate Ethereum address format
        if not wallet_address:
            return jsonify({"error": "Wallet address is required"}), 400
        
        # Basic validation: 0x followed by 40 hex characters
        import re
        if not re.match(r'^0x[a-fA-F0-9]{40}$', wallet_address):
            return jsonify({"error": "Invalid Ethereum address format"}), 400
        
        # Save to current_data (in production, save to database tied to user session)
        current_data["user_wallet_address"] = wallet_address
        
        # Log the wallet configuration
        log_plasma_command(
            f"set_wallet_address {wallet_address}",
            f"✅ Wallet address configured: {wallet_address[:10]}...{wallet_address[-8:]}",
            "success"
        )
        
        log_agent("System", f"User wallet address saved: {wallet_address[:10]}...{wallet_address[-8:]}")
        
        return jsonify({
            "success": True,
            "wallet_address": wallet_address,
            "message": "Wallet address saved successfully",
            "timestamp": int(time.time())
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def run_swarm_loop():
    """Run LangGraph agents in a loop, checking agents_running flag"""
    global agents_running, swarm_running, current_data
    
    while True:
        if not agents_running:
            time.sleep(1)  # Check every second when stopped
            continue
        
        try:
            swarm_running = True
            log_agent("System", "🚀 Starting LangGraph agent execution...")
            
            # Import and run the swarm
            from green_treasury_swarm import run_veridifi_swarm
            
            # Run one execution cycle
            run_veridifi_swarm()
            
            log_agent("System", "✅ LangGraph agent execution complete")
            
            # Wait before next execution (only if agents are still running)
            if agents_running:
                time.sleep(30)  # Run agents every 30 seconds when active
            else:
                swarm_running = False
                break
                
        except Exception as e:
            log_agent("System", f"❌ Error in LangGraph agents: {str(e)}")
            swarm_running = False
            time.sleep(5)  # Wait before retrying


@app.route('/api/agents/start', methods=['POST'])
def start_agents():
    """Start the agent system - starts both data collection and LangGraph agents"""
    global agents_running, current_data, swarm_thread, swarm_running
    
    started_components = []
    
    # Start data collection loop
    if not agents_running:
        agents_running = True
        current_data["agents_running"] = True
        started_components.append("data collection")
    
    # Start LangGraph swarm thread if not already running
    if not swarm_running or (swarm_thread and not swarm_thread.is_alive()):
        swarm_thread = threading.Thread(target=run_swarm_loop, daemon=True)
        swarm_thread.start()
        started_components.append("LangGraph agents")
    
    if started_components:
        log_agent("System", f"✅ Agents started - {' and '.join(started_components)} active")
        return jsonify({
            "status": "success",
            "message": f"Agents started - {' and '.join(started_components)} active",
            "agents_running": True
        })
    else:
        return jsonify({
            "status": "already_running",
            "message": "Agents are already running",
            "agents_running": True
        })


@app.route('/api/agents/stop', methods=['POST'])
def stop_agents():
    """Stop the agent system - stops both data collection and LangGraph agents"""
    global agents_running, current_data, swarm_running
    
    stopped_components = []
    
    # Stop data collection loop
    if agents_running:
        agents_running = False
        current_data["agents_running"] = False
        stopped_components.append("data collection")
    
    # Stop LangGraph swarm if running
    if swarm_running:
        swarm_running = False
        stopped_components.append("LangGraph agents")
    
    if stopped_components:
        log_agent("System", f"⏸️ Agents stopped - {' and '.join(stopped_components)} paused")
        return jsonify({
            "status": "success",
            "message": f"Agents stopped - {' and '.join(stopped_components)} paused",
            "agents_running": False
        })
    else:
        return jsonify({
            "status": "already_stopped",
            "message": "Agents are already stopped",
            "agents_running": False
        })


@app.route('/api/agents/status', methods=['GET'])
def get_agent_status():
    """Get current agent status"""
    return jsonify({
        "agents_running": current_data["agents_running"],
        "status": "running" if current_data["agents_running"] else "stopped"
    })


@app.route('/api/scan/company', methods=['POST'])
def scan_company():
    """Scan company using Flare stack - simulates FDC calls with mock CO2 data"""
    import json
    import random
    
    try:
        data = request.get_json()
        company_id = data.get('companyId')
        company_name = data.get('companyName', 'Unknown Company')
        sites = data.get('sites', [])
        
        if not company_id:
            return jsonify({"error": "companyId is required"}), 400
        
        # Generate realistic mock CO2 goals and coverage
        # Simulate Flare stack calls with realistic delays
        time.sleep(0.5)  # Simulate API delay
        
        # Generate mock CO2 goals for the company
        total_target = sum(site.get('targetEmissions', 400) for site in sites)
        base_current = total_target * random.uniform(0.85, 1.15)  # 85-115% of target
        
        # Generate site-level data with realistic coverage percentages
        scan_results = {
            "scanId": f"scan_{int(time.time())}_{company_id}",
            "companyId": company_id,
            "companyName": company_name,
            "timestamp": datetime.now().isoformat(),
            "flareStackCalls": [],
            "co2Goals": {
                "annualTarget": total_target,
                "currentEmissions": base_current,
                "deadline": "2025-12-31",
                "progressPercent": min(100, (base_current / total_target * 100) if total_target > 0 else 0),
                "onTrack": base_current <= total_target * 1.05
            },
            "co2Coverage": {
                "sitesMonitored": len(sites),
                "totalSites": len(sites),
                "coveragePercent": 100.0,
                "dataQuality": "high",
                "lastUpdated": datetime.now().isoformat()
            },
            "sites": []
        }
        
        # Generate data for each site
        for site in sites:
            site_id = site.get('id', 'unknown')
            site_name = site.get('name', 'Unknown Site')
            target = site.get('targetEmissions', 400)
            
            # Generate realistic current emissions (80-120% of target)
            current = target * random.uniform(0.80, 1.20)
            
            # Calculate status
            ratio = current / target if target > 0 else 1.0
            if ratio <= 0.9:
                status = 'ahead'
            elif ratio <= 1.1:
                status = 'onTrack'
            else:
                status = 'behind'
            
            # Generate coverage data
            coverage = random.uniform(85, 100)  # 85-100% coverage
            
            site_data = {
                "siteId": site_id,
                "siteName": site_name,
                "location": site.get('location', {}),
                "emissions": {
                    "current": round(current, 2),
                    "target": target,
                    "trend": random.choice(['decreasing', 'stable', 'increasing']),
                    "changePercent": round((current - target) / target * 100, 2) if target > 0 else 0
                },
                "coverage": {
                    "percent": round(coverage, 1),
                    "sensorsActive": random.randint(8, 12),
                    "totalSensors": 12,
                    "dataQuality": "high" if coverage > 90 else "medium"
                },
                "status": status,
                "lastUpdated": datetime.now().isoformat()
            }
            
            scan_results["sites"].append(site_data)
        
        # Calculate overall status
        status_counts = {}
        for site in scan_results["sites"]:
            status = site["status"]
            status_counts[status] = status_counts.get(status, 0) + 1
        
        scan_results["progress"] = {
            "onTrack": status_counts.get('onTrack', 0),
            "behind": status_counts.get('behind', 0),
            "ahead": status_counts.get('ahead', 0)
        }
        
        # Determine overall status
        if scan_results["progress"]["behind"] > scan_results["progress"]["onTrack"] + scan_results["progress"]["ahead"]:
            scan_results["overallStatus"] = 'behind'
        elif scan_results["progress"]["ahead"] > scan_results["progress"]["onTrack"] + scan_results["progress"]["behind"]:
            scan_results["overallStatus"] = 'ahead'
        else:
            scan_results["overallStatus"] = 'onTrack'
        
        # Generate recommendations
        recommendations = []
        if scan_results["overallStatus"] == 'behind':
            recommendations.append({
                "priority": "high",
                "category": "emissions",
                "title": "Emissions Reduction Required",
                "description": f"{scan_results['progress']['behind']} site(s) are behind target. Immediate action needed.",
                "action": "Review high-emission sites and implement reduction strategies"
            })
        
        if scan_results["co2Goals"]["currentEmissions"] > scan_results["co2Goals"]["annualTarget"]:
            recommendations.append({
                "priority": "high",
                "category": "goals",
                "title": "Annual CO2 Goal at Risk",
                "description": f"Current emissions ({scan_results['co2Goals']['currentEmissions']:.0f} CO2e) exceed target ({scan_results['co2Goals']['annualTarget']:.0f} CO2e).",
                "action": "Implement aggressive reduction measures to meet annual target"
            })
        
        if scan_results["progress"]["ahead"] > 0:
            recommendations.append({
                "priority": "low",
                "category": "optimization",
                "title": "Maintain Current Performance",
                "description": f"{scan_results['progress']['ahead']} site(s) are ahead of target.",
                "action": "Continue current practices and share best practices with other sites"
            })
        
        scan_results["recommendations"] = recommendations
        
        # Simulate Flare stack API calls for terminal logging
        scan_results["flareStackCalls"] = [
            {
                "timestamp": datetime.now().isoformat(),
                "endpoint": "POST /api/v1/fdc/prepare-request",
                "method": "POST",
                "status": 200,
                "message": "FDC attestation request prepared"
            },
            {
                "timestamp": datetime.now().isoformat(),
                "endpoint": "POST /api/v1/veridiFi/submit-attestation",
                "method": "POST",
                "status": 200,
                "message": f"Attestation submitted for {company_name}"
            },
            {
                "timestamp": datetime.now().isoformat(),
                "endpoint": "GET /api/v1/fdc/round-status",
                "method": "GET",
                "status": 200,
                "message": "Round finalized, proof available"
            },
            {
                "timestamp": datetime.now().isoformat(),
                "endpoint": "POST /api/v1/veridiFi/process-proof",
                "method": "POST",
                "status": 200,
                "message": "Proof processed and verified"
            }
        ]
        
        return jsonify(scan_results)
        
    except Exception as e:
        log_agent("Scan", f"Error scanning company: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "contracts_configured": {
            "price_oracle": PRICE_ORACLE_ADDRESS != "",
            "veridiFi_core": VERIDIFI_CORE_ADDRESS != ""
        },
        "rpc_url": RPC_URL
    })


if __name__ == '__main__':
    # Start background update thread
    update_thread = threading.Thread(target=update_data_loop, daemon=True)
    update_thread.start()
    
    log_agent("System", "Dashboard server starting...")
    log_agent("System", f"PriceOracle: {PRICE_ORACLE_ADDRESS or 'Not configured'}")
    log_agent("System", f"VeridiFiCore: {VERIDIFI_CORE_ADDRESS or 'Not configured'}")
    log_agent("System", "✅ Agents initialized and running")
    
    # Run Flask server
    print("\n" + "=" * 60)
    print("🌱 Green Treasury Dashboard Server")
    print("=" * 60)
    print("Server running at: http://localhost:3000")
    print("Dashboard available at: http://localhost:3000")
    print("API endpoint: http://localhost:3000/api/data")
    print("Control endpoints: /api/agents/start, /api/agents/stop")
    print("=" * 60 + "\n")
    
    app.run(host='0.0.0.0', port=3000, debug=True)

