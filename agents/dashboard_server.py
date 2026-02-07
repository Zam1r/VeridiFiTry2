"""
Dashboard Backend Server
Serves real-time data from the Green Treasury system to the dashboard
"""
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import time
import threading
from datetime import datetime
from typing import Optional, Dict
from contract_interface import ContractInterface
from config import RPC_URL, PRICE_ORACLE_ADDRESS, VERIDIFI_CORE_ADDRESS
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for the dashboard

# Global state
current_data = {
    "market_report": None,
    "carbon_audit": None,
    "fdc_verification_status": None,
    "treasury_decision": None,
    "settlement_status": None,
    "agent_logs": [],
    "agents_running": True  # Track if agents are running
}

# Control flag for agent loop
agents_running = True
update_thread = None

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
            _mock_plasma_payout()
            return
        
        # Get recipient
        recipient = os.getenv("PLASMA_RECIPIENT_ADDRESS", "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
        amount = 1.0
        reason = "EXECUTE_BUY - Green Energy Verified via FDC"
        
        log_agent("Settlement", "EXECUTE_BUY signal received. Initiating Plasma Payment...")
        log_agent("Settlement", f"Sending {amount} USDT to {recipient}")
        log_agent("Settlement", "Gas Fee: $0.00 (Covered by Plasma Paymaster)")
        
        # Send payout
        result = send_plasma_reward(recipient, amount, reason)
        
        if result.get("success"):
            tx_hash = result.get("transaction_hash", "Pending")
            log_agent("Settlement", f"✅ Plasma Payment executed successfully!")
            log_agent("Settlement", f"TX Hash: {tx_hash}")
            log_agent("Settlement", f"Amount: {amount} USDT (Green Reward)")
            log_agent("Settlement", "💚 Recipient received USDT with $0 gas fees!")
            
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
            _mock_plasma_payout(error)
            
    except ImportError:
        log_agent("Settlement", "⚠️ Plasma payout module not available. Using mock payment.")
        _mock_plasma_payout()
    except Exception as e:
        log_agent("Settlement", f"❌ Error in Plasma payout: {str(e)}")
        _mock_plasma_payout(str(e))


def _mock_plasma_payout(error_msg: str = None):
    """Fallback mock payout"""
    import os
    recipient = os.getenv("PLASMA_RECIPIENT_ADDRESS", "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
    amount = 1.0
    
    log_agent("Settlement", f"Simulating Plasma Payment: {amount} USDT to {recipient}")
    log_agent("Settlement", "Paymaster Fee: $0.00 (Zero-Fee)")
    if error_msg:
        log_agent("Settlement", f"Note: {error_msg}")
    
    import random
    tx_hash = f"0x{''.join([f'{random.randint(0, 15):x}' for _ in range(64)])}"
    
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
    """Serve the dashboard HTML"""
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
        "agent_logs": current_data["agent_logs"][-20:],  # Last 20 logs
        "agents_running": current_data["agents_running"],
        "timestamp": int(time.time())
    })


@app.route('/api/agents/start', methods=['POST'])
def start_agents():
    """Start the agent system"""
    global agents_running, current_data
    
    if not agents_running:
        agents_running = True
        current_data["agents_running"] = True
        log_agent("System", "✅ Agents started - Resuming data collection")
        return jsonify({
            "status": "success",
            "message": "Agents started",
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
    """Stop the agent system"""
    global agents_running, current_data
    
    if agents_running:
        agents_running = False
        current_data["agents_running"] = False
        log_agent("System", "⏸️ Agents stopped - Data collection paused")
        return jsonify({
            "status": "success",
            "message": "Agents stopped",
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

