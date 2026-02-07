"""
Green Treasury Multi-Agent Orchestration System
Uses LangGraph and web3.py to manage an autonomous "Green Treasury" on Flare Coston2

Agents:
1. Oracle Scout (FTSO Node) - Polls prices from PriceOracle/VeridiFiCore
2. Environmental Auditor (FDC Node) - Fetches carbon intensity for Oxford region
3. Treasury Manager (Supervisor Node) - Makes trading decisions based on logic gates
4. Settlement Agent (Plasma Node) - Executes mock Plasma Payments
"""
import time
import json
from typing import TypedDict, Annotated, Literal, Optional
from datetime import datetime
from langgraph.graph import StateGraph, END
from contract_interface import ContractInterface
from config import RPC_URL, PRICE_ORACLE_ADDRESS, VERIDIFI_CORE_ADDRESS, GREEN_ENERGY_THRESHOLD
import requests

# Initialize contract interface
contract_interface = ContractInterface()

# Constants
ORACLE_TIMEOUT_SECONDS = 180  # 3 minutes
XRP_TARGET_PRICE = 1.10  # USD
GREEN_THRESHOLD = 50  # gCO2/kWh
AMBER_THRESHOLD = 150  # gCO2/kWh
CARBON_INTENSITY_API_URL = "https://api.carbonintensity.org.uk/regional/intensity/{from}/{to}/postcode/{postcode}"


class TreasuryState(TypedDict):
    """Shared state across all agents in the VeridiFi Swarm"""
    # FTSO Price from Oracle Scout
    ftso_price: Annotated[Optional[float], "XRP/USD price from FTSO Oracle"]
    
    # FDC Proof Validation from Environmental Auditor
    fdc_proof_valid: Annotated[Optional[bool], "Whether FDC proof is valid and carbon is below threshold"]
    
    # Payout Status from Settlement Agent
    payout_status: Annotated[Optional[dict], "Status of Plasma payout execution"]
    
    # Additional data (for backward compatibility and detailed logging)
    market_report: Annotated[Optional[dict], "Market Report with prices and timestamps"]
    carbon_audit: Annotated[Optional[dict], "Carbon intensity audit with status"]
    fdc_verification_status: Annotated[Optional[str], "FDC verification status"]
    treasury_decision: Annotated[Optional[str], "Decision from Manager"]
    decision_reason: Annotated[Optional[str], "Reason for the decision"]
    settlement_status: Annotated[Optional[dict], "Status of Plasma Payment execution"]
    errors: Annotated[list, "List of errors encountered"]
    agent_history: Annotated[list, "History of agent actions and thoughts"]


def log_agent(agent_name: str, message: str, state: TreasuryState):
    """Terminal-style logging for agents"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] [{agent_name}] -> {message}"
    print(log_entry)
    
    # Add to agent history
    history = state.get("agent_history", [])
    history.append({
        "timestamp": timestamp,
        "agent": agent_name,
        "message": message
    })
    return history


def scout_agent(state: TreasuryState) -> TreasuryState:
    """
    Scout Agent (Price Node)
    Polls FTSO for XRP/USD price and updates ftso_price in state
    """
    log_agent("Scout", "Fetching XRP/USD price from FTSO Oracle...", state)
    
    try:
        price_data = contract_interface.get_latest_prices()
        
        if not price_data:
            error_msg = "Failed to fetch prices from FTSO Oracle"
            log_agent("Scout", f"ERROR: {error_msg}", state)
            return {
                **state,
                "errors": state.get("errors", []) + [{"agent": "Scout", "error": error_msg}],
                "ftso_price": None
            }
        
        xrp_price = price_data["xrp_price"]
        current_time = int(time.time())
        xrp_timestamp = price_data["xrp_timestamp"]
        xrp_age = current_time - xrp_timestamp
        
        # Check for oracle timeout
        if xrp_age > ORACLE_TIMEOUT_SECONDS:
            error_msg = f"Oracle Timeout: XRP data is {xrp_age}s old (max: {ORACLE_TIMEOUT_SECONDS}s)"
            log_agent("Scout", f"ERROR: {error_msg}", state)
            return {
                **state,
                "errors": state.get("errors", []) + [{"agent": "Scout", "error": error_msg}],
                "ftso_price": None
            }
        
        log_agent("Scout", f"XRP/USD: ${xrp_price:.4f} (age: {xrp_age}s)", state)
        log_agent("Scout", "Price data ready. Sending to Manager...", state)
        
        return {
            **state,
            "ftso_price": xrp_price,
            "market_report": {
                "xrp_usd": xrp_price,
                "xrp_timestamp": xrp_timestamp,
                "xrp_freshness_seconds": xrp_age,
                "status": "VALID"
            }
        }
        
    except Exception as e:
        error_msg = f"Exception in Scout Agent: {str(e)}"
        log_agent("Scout", f"ERROR: {error_msg}", state)
        return {
            **state,
            "errors": state.get("errors", []) + [{"agent": "Scout", "error": error_msg}],
            "ftso_price": None
        }


def oracle_scout_agent(state: TreasuryState) -> TreasuryState:
    """
    Oracle Scout (FTSO Node)
    Polls getLatestPrices() for BTC/USD and XRP/USD
    Outputs structured 'Market Report' with prices and data freshness
    
    Note: This agent uses the contract at PRICE_ORACLE_ADDRESS which should have
    getLatestPrices() function. If your VeridiFiCore contract has this function,
    set PRICE_ORACLE_ADDRESS to your VeridiFiCore address in the .env file.
    """
    log_agent("Scout", "Polling FTSO for BTC/USD and XRP/USD prices...", state)
    
    try:
        # Get prices from contract (PriceOracle or VeridiFiCore if it has getLatestPrices())
        # The contract address is configured via PRICE_ORACLE_ADDRESS in .env
        price_data = contract_interface.get_latest_prices()
        
        if not price_data:
            error_msg = "Failed to fetch prices from contract"
            log_agent("Scout", f"ERROR: {error_msg}", state)
            return {
                **state,
                "errors": state.get("errors", []) + [{"agent": "Scout", "error": error_msg}],
                "market_report": None
            }
        
        # Check for oracle timeout (3 minutes)
        current_time = int(time.time())
        btc_age = current_time - price_data["btc_timestamp"]
        xrp_age = current_time - price_data["xrp_timestamp"]
        
        if btc_age > ORACLE_TIMEOUT_SECONDS or xrp_age > ORACLE_TIMEOUT_SECONDS:
            error_msg = f"Oracle Timeout: BTC data is {btc_age}s old, XRP data is {xrp_age}s old (max: {ORACLE_TIMEOUT_SECONDS}s)"
            log_agent("Scout", f"ERROR: {error_msg}", state)
            return {
                **state,
                "errors": state.get("errors", []) + [{"agent": "Scout", "error": error_msg}],
                "market_report": {
                    "error": "ORACLE_TIMEOUT",
                    "btc_age_seconds": btc_age,
                    "xrp_age_seconds": xrp_age
                }
            }
        
        # Create structured Market Report
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
        
        log_agent("Scout", f"BTC/USD: ${price_data['btc_price']:,.2f} (age: {btc_age}s)", state)
        log_agent("Scout", f"XRP/USD: ${price_data['xrp_price']:,.4f} (age: {xrp_age}s)", state)
        log_agent("Scout", "Market Report generated. Sending to Manager...", state)
        
        return {
            **state,
            "market_report": market_report
        }
        
    except Exception as e:
        error_msg = f"Exception in Oracle Scout: {str(e)}"
        log_agent("Scout", f"ERROR: {error_msg}", state)
        return {
            **state,
            "errors": state.get("errors", []) + [{"agent": "Scout", "error": error_msg}],
            "market_report": None
        }


def auditor_agent(state: TreasuryState) -> TreasuryState:
    """
    Auditor Agent (Carbon Node)
    Checks FDC proof validation and updates fdc_proof_valid in state
    """
    log_agent("Auditor", "Checking FDC proof validation for carbon data...", state)
    
    try:
        fdc_verification = contract_interface.check_fdc_verification()
        
        if not fdc_verification:
            log_agent("Auditor", "❌ FDC verification check failed", state)
            return {
                **state,
                "fdc_proof_valid": False,
                "fdc_verification_status": "UNVERIFIED"
            }
        
        voting_round_id = fdc_verification.get("voting_round_id")
        if voting_round_id:
            log_agent("Auditor", f"📋 Voting Round ID: {voting_round_id}", state)
        
        if fdc_verification.get("verified"):
            intensity = fdc_verification.get("intensity")
            is_low_carbon = fdc_verification.get("is_low_carbon", False)
            
            log_agent("Auditor", f"✅ FDC proof verified! Carbon intensity: {intensity} gCO2/kWh", state)
            
            # fdc_proof_valid is True only if verified AND low carbon (< 50)
            fdc_proof_valid = is_low_carbon and intensity < 50
            
            if fdc_proof_valid:
                log_agent("Auditor", "🟢 FDC proof valid: Low carbon confirmed (< 50 gCO2/kWh)", state)
            else:
                log_agent("Auditor", f"⚠️ FDC verified but carbon not low ({intensity} >= 50)", state)
            
            return {
                **state,
                "fdc_proof_valid": fdc_proof_valid,
                "fdc_verification_status": "STATE_GREEN_VERIFIED" if fdc_proof_valid else "VERIFIED",
                "carbon_audit": {
                    "intensity": intensity,
                    "is_green": fdc_proof_valid,
                    "voting_round_id": voting_round_id
                }
            }
        else:
            log_agent("Auditor", "⏳ FDC proof not yet verified. Waiting for consensus...", state)
            return {
                **state,
                "fdc_proof_valid": False,
                "fdc_verification_status": "UNVERIFIED"
            }
            
    except Exception as e:
        error_msg = f"Exception in Auditor Agent: {str(e)}"
        log_agent("Auditor", f"ERROR: {error_msg}", state)
        return {
            **state,
            "errors": state.get("errors", []) + [{"agent": "Auditor", "error": error_msg}],
            "fdc_proof_valid": False
        }


def environmental_auditor_agent(state: TreasuryState) -> TreasuryState:
    """
    Environmental Auditor (FDC Node)
    Checks FDCVerification contract on Flare Coston2 for verified attestations
    Uses web3.py to check votingRoundId and carbonIntensity from VeridiFiCore
    If attestation is confirmed and carbonIntensity < 50, sets status to 'GREEN_VERIFIED'
    If attestation is missing or invalid, routes to ERROR_HALT node
    """
    log_agent("Auditor", "Checking FDCVerification contract for Oxford carbon data attestation...", state)
    
    try:
        # Step 1: Check FDC verification via VeridiFiCore (which processes FDC proofs)
        fdc_verification = contract_interface.check_fdc_verification()
        
        verification_status = "UNVERIFIED"
        intensity = None
        data_source = "Unknown"
        is_fdc_verified = False
        voting_round_id = None
        attestation_valid = False
        
        if fdc_verification:
            voting_round_id = fdc_verification.get("voting_round_id")
            
            # Log Voting Round ID for auditability
            if voting_round_id:
                log_agent("Auditor", f"📋 Voting Round ID: {voting_round_id}", state)
            else:
                log_agent("Auditor", "⚠️ No Voting Round ID found - attestation may not be processed yet", state)
            
            if fdc_verification.get("verified"):
                # FDC proof exists and was verified by Flare nodes
                is_fdc_verified = True
                attestation_valid = True
                intensity = fdc_verification.get("intensity")
                data_source = "FDC Verified (Flare Consensus)"
                
                log_agent("Auditor", f"✅ FDC attestation verified! Carbon intensity: {intensity} gCO2/kWh", state)
                log_agent("Auditor", f"📋 Voting Round ID: {voting_round_id}", state)
                
                # Check if it's low carbon (Green) - threshold is 50
                if fdc_verification.get("is_low_carbon", False) and intensity < 50:
                    verification_status = "STATE_GREEN_VERIFIED"
                    log_agent("Auditor", "🟢 STATE_GREEN_VERIFIED: Low carbon (<50 gCO2/kWh) confirmed by FDC consensus!", state)
                else:
                    verification_status = "VERIFIED"
                    log_agent("Auditor", f"⚠️ FDC verified but carbon is not low ({intensity} gCO2/kWh >= 50)", state)
            else:
                # No verified proof yet or invalid
                log_agent("Auditor", "⏳ No FDC-verified attestation found. Waiting for Flare nodes to reach consensus...", state)
                log_agent("Auditor", "The AI doesn't trust raw API data - it requires FDC attestation.", state)
                if voting_round_id:
                    log_agent("Auditor", f"📋 Voting Round ID: {voting_round_id} (but no valid carbon intensity data)", state)
        else:
            # Error or no verification data
            log_agent("Auditor", "❌ FDC verification check failed or returned no data", state)
            attestation_valid = False
        
        # If attestation is missing or invalid, route to ERROR_HALT
        if not attestation_valid or not is_fdc_verified:
            error_msg = f"FDC attestation missing or invalid. Voting Round ID: {voting_round_id or 'N/A'}"
            log_agent("Auditor", f"🚨 ERROR: {error_msg}", state)
            log_agent("Auditor", "Routing to ERROR_HALT node - cannot proceed without verified FDC attestation", state)
            
            return {
                **state,
                "errors": state.get("errors", []) + [{"agent": "Auditor", "error": error_msg}],
                "carbon_audit": {
                    "intensity": None,
                    "status": "Error",
                    "status_emoji": "🚨",
                    "region": "Oxford",
                    "data_source": "FDC Verification Failed",
                    "is_fdc_verified": False,
                    "voting_round_id": voting_round_id,
                    "error": error_msg,
                    "attestation_valid": False
                },
                "fdc_verification_status": "ERROR_HALT",
                "should_halt": True  # Flag to route to ERROR_HALT node
            }
        
        # Determine energy status based on intensity
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
        
        # Create Carbon Audit
        carbon_audit = {
            "intensity": intensity,
            "status": status,
            "status_emoji": status_emoji,
            "region": "Oxford",
            "green_threshold": GREEN_THRESHOLD,
            "amber_threshold": AMBER_THRESHOLD,
            "data_source": data_source,
            "is_fdc_verified": is_fdc_verified,
            "voting_round_id": voting_round_id,
            "fdc_round_id": voting_round_id,  # For backward compatibility
            "timestamp": int(time.time()),
            "is_green": status == "Green",
            "is_amber": status == "Amber",
            "is_red": status == "Red",
            "attestation_valid": attestation_valid
        }
        
        log_agent("Auditor", f"Carbon Intensity: {intensity} gCO2/kWh - Status: {status_emoji} {status}", state)
        log_agent("Auditor", f"Verification Status: {verification_status}", state)
        log_agent("Auditor", f"📋 Voting Round ID: {voting_round_id} (logged for auditability)", state)
        log_agent("Auditor", "Carbon Audit generated. Sending to Manager...", state)
        
        return {
            **state,
            "carbon_audit": carbon_audit,
            "fdc_verification_status": verification_status,
            "should_halt": False  # No error, can proceed
        }
        
    except Exception as e:
        error_msg = f"Exception in Environmental Auditor: {str(e)}"
        log_agent("Auditor", f"ERROR: {error_msg}", state)
        log_agent("Auditor", "Routing to ERROR_HALT node due to exception", state)
        
        # Route to ERROR_HALT on exception
        return {
            **state,
            "errors": state.get("errors", []) + [{"agent": "Auditor", "error": error_msg}],
            "carbon_audit": {
                "intensity": None,
                "status": "Error",
                "status_emoji": "🚨",
                "region": "Oxford",
                "data_source": "Exception in FDC Verification",
                "is_fdc_verified": False,
                "error": error_msg,
                "attestation_valid": False
            },
            "fdc_verification_status": "ERROR_HALT",
            "should_halt": True  # Flag to route to ERROR_HALT node
        }


def manager_agent(state: TreasuryState) -> TreasuryState:
    """
    Manager Agent (Decision Node)
    Makes decision based on price and carbon data
    """
    log_agent("Manager", "Evaluating conditions for trade execution...", state)
    
    ftso_price = state.get("ftso_price")
    fdc_proof_valid = state.get("fdc_proof_valid", False)
    
    if ftso_price is None:
        log_agent("Manager", "⚠️ No price data available. Cannot make decision.", state)
        return {
            **state,
            "treasury_decision": "WAIT",
            "decision_reason": "No price data available"
        }
    
    if fdc_proof_valid is None:
        log_agent("Manager", "⚠️ FDC proof status unknown. Cannot make decision.", state)
        return {
            **state,
            "treasury_decision": "WAIT",
            "decision_reason": "FDC proof status unknown"
        }
    
    # Decision logic: price < target AND carbon < threshold (fdc_proof_valid)
    price_below_target = ftso_price < XRP_TARGET_PRICE
    carbon_below_threshold = fdc_proof_valid
    
    log_agent("Manager", f"Price: ${ftso_price:.4f} (target: ${XRP_TARGET_PRICE})", state)
    log_agent("Manager", f"FDC Proof Valid: {fdc_proof_valid} (carbon < {GREEN_THRESHOLD} gCO2/kWh)", state)
    
    if price_below_target and carbon_below_threshold:
        log_agent("Manager", "✅ Conditions met: Price < target AND Carbon < threshold", state)
        log_agent("Manager", "Decision: Proceed to Settlement", state)
        return {
            **state,
            "treasury_decision": "EXECUTE_BUY",
            "decision_reason": f"Price ${ftso_price:.4f} < ${XRP_TARGET_PRICE} AND FDC proof valid"
        }
    else:
        if not price_below_target:
            reason = f"Price ${ftso_price:.4f} >= ${XRP_TARGET_PRICE}"
        elif not carbon_below_threshold:
            reason = f"FDC proof not valid (carbon >= {GREEN_THRESHOLD} gCO2/kWh)"
        else:
            reason = "Conditions not met"
        
        log_agent("Manager", f"⏸️ Conditions not met: {reason}", state)
        log_agent("Manager", "Decision: Wait", state)
        return {
            **state,
            "treasury_decision": "WAIT",
            "decision_reason": reason
        }


def treasury_manager_agent(state: TreasuryState) -> TreasuryState:
    """
    Treasury Manager (Supervisor Node)
    Takes Market Report and Carbon Audit
    Logic Gates:
    - If Energy is 'Green' AND FDC-verified (STATE_GREEN_VERIFIED) AND XRP Price < $1.10: EXECUTE_BUY
    - If Energy is 'Red': HALT_ACTIVITY
    - If FDC not verified: WAIT (AI doesn't trust unverified data)
    """
    log_agent("Manager", "Evaluating Market Report and Carbon Audit...", state)
    
    market_report = state.get("market_report")
    carbon_audit = state.get("carbon_audit")
    fdc_status = state.get("fdc_verification_status")
    
    # Check for oracle timeout error
    if market_report and market_report.get("error") == "ORACLE_TIMEOUT":
        decision = "HALT_ACTIVITY"
        reason = "Oracle Timeout: FTSO data is stale (>3 minutes). Trading halted for safety."
        log_agent("Manager", f"DECISION: {decision} - {reason}", state)
        return {
            **state,
            "treasury_decision": decision,
            "decision_reason": reason
        }
    
    # Check if we have required data
    if not market_report or not carbon_audit:
        decision = "HALT_ACTIVITY"
        reason = "Missing required data: Market Report or Carbon Audit unavailable"
        log_agent("Manager", f"DECISION: {decision} - {reason}", state)
        return {
            **state,
            "treasury_decision": decision,
            "decision_reason": reason
        }
    
    # Extract values
    xrp_price = market_report.get("xrp_usd", 0)
    energy_status = carbon_audit.get("status", "Unknown")
    is_green = carbon_audit.get("is_green", False)
    is_red = carbon_audit.get("is_red", False)
    is_fdc_verified = carbon_audit.get("is_fdc_verified", False)
    intensity = carbon_audit.get("intensity", 999)
    
    log_agent("Manager", f"XRP Price: ${xrp_price:.4f} | Energy Status: {energy_status} ({intensity} gCO2/kWh)", state)
    log_agent("Manager", f"FDC Verification Status: {fdc_status}", state)
    
    # Critical: Check if FDC proof is verified
    if not is_fdc_verified or fdc_status != "STATE_GREEN_VERIFIED":
        decision = "WAIT"
        if not is_fdc_verified:
            reason = "FDC proof not verified. Waiting for Flare nodes to reach consensus. AI doesn't trust unverified data."
            log_agent("Manager", "⚠️ Carbon data is not FDC-verified. AI requires consensus before trading.", state)
        elif fdc_status == "VERIFIED":
            reason = f"FDC verified but carbon is not low ({intensity} gCO2/kWh). Waiting for Green energy."
        else:
            reason = "FDC verification pending. Waiting for consensus."
        
        log_agent("Manager", f"DECISION: {decision} - {reason}", state)
        return {
            **state,
            "treasury_decision": decision,
            "decision_reason": reason
        }
    
    # Logic Gate 1: If Energy is 'Red', HALT_ACTIVITY
    if is_red:
        decision = "HALT_ACTIVITY"
        reason = f"Energy is Red ({intensity} gCO2/kWh > {AMBER_THRESHOLD}). Halting activity to save on carbon impact fees."
        log_agent("Manager", f"DECISION: {decision} - {reason}", state)
        return {
            **state,
            "treasury_decision": decision,
            "decision_reason": reason
        }
    
    # Logic Gate 2: If Energy is 'Green' AND FDC-verified (STATE_GREEN_VERIFIED) AND XRP Price < $1.10, EXECUTE_BUY
    if is_green and fdc_status == "STATE_GREEN_VERIFIED" and xrp_price < XRP_TARGET_PRICE:
        decision = "EXECUTE_BUY"
        reason = f"✅ STATE_GREEN_VERIFIED: FDC consensus confirmed low carbon ({intensity} gCO2/kWh < {GREEN_THRESHOLD}) AND XRP Price (${xrp_price:.4f}) is below target (${XRP_TARGET_PRICE}). Executing buy signal."
        log_agent("Manager", f"DECISION: {decision} - {reason}", state)
        log_agent("Manager", "✅ All conditions met: FDC-verified Green energy + favorable XRP price", state)
        return {
            **state,
            "treasury_decision": decision,
            "decision_reason": reason
        }
    
    # Default: WAIT
    decision = "WAIT"
    if not is_green:
        reason = f"Energy is {energy_status} ({intensity} gCO2/kWh), not Green. Waiting for Green energy."
    elif xrp_price >= XRP_TARGET_PRICE:
        reason = f"XRP Price (${xrp_price:.4f}) is above target (${XRP_TARGET_PRICE}). Waiting for better entry."
    else:
        reason = "Conditions not met. Waiting."
    
    log_agent("Manager", f"DECISION: {decision} - {reason}", state)
    
    return {
        **state,
        "treasury_decision": decision,
        "decision_reason": reason
    }


def settlement_agent(state: TreasuryState) -> TreasuryState:
    """
    Settlement Agent (Plasma Node)
    Executes gasless USDT payout via Plasma
    Updates payout_status in state
    """
    log_agent("Settlement", "Executing Plasma payout...", state)
    
    try:
        # Import plasma settlement
        import subprocess
        import os
        
        recipient = os.getenv("PLASMA_RECIPIENT_ADDRESS", "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
        amount = "1.0"
        
        log_agent("Settlement", f"Sending {amount} USDT to {recipient} via Plasma Paymaster", state)
        log_agent("Settlement", "Gas Fee: $0.00 (covered by Plasma Paymaster)", state)
        
        # Call plasma_settlement.ts script
        try:
            result = subprocess.run(
                ["npx", "ts-node", "scripts/plasma/plasma_settlement.ts", recipient, amount],
                cwd=os.path.dirname(os.path.dirname(__file__)),
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
                
                payout_status = {
                    "executed": True,
                    "transaction_hash": tx_hash,
                    "amount_usdt": float(amount),
                    "recipient": recipient,
                    "gas_fee": 0.0,
                    "status": "COMPLETED",
                    "timestamp": int(time.time())
                }
                
                log_agent("Settlement", f"✅ Plasma payout executed! TX: {tx_hash}", state)
                log_agent("Settlement", "💚 Recipient received USDT with $0 gas fees!", state)
                
                return {
                    **state,
                    "payout_status": payout_status,
                    "settlement_status": payout_status  # For backward compatibility
                }
            else:
                error_msg = result.stderr or result.stdout
                log_agent("Settlement", f"❌ Plasma payout failed: {error_msg}", state)
                return {
                    **state,
                    "payout_status": {
                        "executed": False,
                        "error": error_msg,
                        "status": "FAILED"
                    }
                }
        except subprocess.TimeoutExpired:
            error_msg = "Plasma payout timed out"
            log_agent("Settlement", f"❌ {error_msg}", state)
            return {
                **state,
                "payout_status": {
                    "executed": False,
                    "error": error_msg,
                    "status": "FAILED"
                }
            }
        except Exception as e:
            error_msg = f"Exception in Plasma payout: {str(e)}"
            log_agent("Settlement", f"❌ {error_msg}", state)
            return {
                **state,
                "payout_status": {
                    "executed": False,
                    "error": error_msg,
                    "status": "FAILED"
                }
            }
            
    except Exception as e:
        error_msg = f"Exception in Settlement Agent: {str(e)}"
        log_agent("Settlement", f"ERROR: {error_msg}", state)
        return {
            **state,
            "errors": state.get("errors", []) + [{"agent": "Settlement", "error": error_msg}],
            "payout_status": {
                "executed": False,
                "error": error_msg,
                "status": "FAILED"
            }
        }


def settlement_agent_old(state: TreasuryState) -> TreasuryState:
    """
    Settlement Agent (Plasma Node)
    Upon EXECUTE_BUY signal, triggers a real Plasma Payment
    Sends 1 USDT "Green Reward" to user's wallet with zero-fee Paymaster logic
    """
    log_agent("Settlement", "Checking for EXECUTE_BUY signal...", state)
    
    decision = state.get("treasury_decision")
    
    if decision != "EXECUTE_BUY":
        log_agent("Settlement", f"No buy signal (decision: {decision}). Skipping settlement.", state)
        return {
            **state,
            "settlement_status": {
                "executed": False,
                "reason": f"Decision was {decision}, not EXECUTE_BUY"
            }
        }
    
    log_agent("Settlement", "EXECUTE_BUY signal received. Initiating Plasma Payment...", state)
    
    try:
        # Import plasma payout module
        try:
            from plasma_payout import send_plasma_reward, check_plasma_setup
        except ImportError:
            log_agent("Settlement", "⚠️ Plasma payout module not available. Using mock payment.", state)
            # Fallback to mock payment
            return _mock_plasma_payment(state)
        
        # Check Plasma setup
        setup_status = check_plasma_setup()
        if not setup_status["configured"]:
            log_agent("Settlement", f"⚠️ Plasma not configured: {setup_status['issues']}", state)
            log_agent("Settlement", "Using mock payment. Configure Plasma to enable real payouts.", state)
            return _mock_plasma_payment(state)
        
        # Get recipient address from environment or use default
        import os
        user_wallet = os.getenv("PLASMA_RECIPIENT_ADDRESS", "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
        amount_usdt = 1.0
        reason = "EXECUTE_BUY - Green Energy Verified via FDC"
        
        log_agent("Settlement", f"Sending Plasma Payment: {amount_usdt} USDT to {user_wallet}", state)
        log_agent("Settlement", "Gas Fee: $0.00 (Covered by Plasma Paymaster)", state)
        
        # Send the actual Plasma payment
        result = send_plasma_reward(
            recipient_address=user_wallet,
            amount_usdt=amount_usdt,
            reason=reason
        )
        
        if result.get("success"):
            settlement_status = {
                "executed": True,
                "transaction_hash": result.get("transaction_hash", "Pending"),
                "amount_usdt": amount_usdt,
                "recipient": user_wallet,
                "fee": 0.0,
                "payment_type": "Green Reward (Plasma)",
                "status": "COMPLETED",
                "timestamp": int(time.time()),
                "network": "Plasma Testnet"
            }
            
            log_agent("Settlement", f"✅ Plasma Payment executed successfully!", state)
            log_agent("Settlement", f"TX Hash: {result.get('transaction_hash', 'Pending')}", state)
            log_agent("Settlement", f"Amount: {amount_usdt} USDT (Green Reward)", state)
            log_agent("Settlement", "💚 Recipient received USDT with $0 gas fees!", state)
            
            return {
                **state,
                "settlement_status": settlement_status
            }
        else:
            error_msg = result.get("error", "Unknown error")
            log_agent("Settlement", f"❌ Plasma payment failed: {error_msg}", state)
            log_agent("Settlement", "Falling back to mock payment for demonstration...", state)
            return _mock_plasma_payment(state, error_msg)
        
    except Exception as e:
        error_msg = f"Exception in Settlement Agent: {str(e)}"
        log_agent("Settlement", f"ERROR: {error_msg}", state)
        log_agent("Settlement", "Falling back to mock payment...", state)
        return _mock_plasma_payment(state, error_msg)


def _mock_plasma_payment(state: TreasuryState, error_msg: str = None) -> TreasuryState:
    """Fallback mock payment when Plasma is not configured"""
    import os
    user_wallet = os.getenv("PLASMA_RECIPIENT_ADDRESS", "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
    amount_usdt = 1.0
    fee = 0.0
    
    log_agent("Settlement", f"Simulating Plasma Payment: {amount_usdt} USDT to {user_wallet}", state)
    log_agent("Settlement", f"Paymaster Fee: ${fee:.2f} (Zero-Fee)", state)
    if error_msg:
        log_agent("Settlement", f"Note: {error_msg}", state)
    
    # Simulate transaction processing
    time.sleep(0.5)
    
    # Mock transaction hash
    tx_hash = f"0x{''.join([f'{i:02x}' for i in range(32)])}"
    
    settlement_status = {
        "executed": True,
        "transaction_hash": tx_hash,
        "amount_usdt": amount_usdt,
        "recipient": user_wallet,
        "fee": fee,
        "payment_type": "Green Reward (Mock)",
        "status": "COMPLETED",
        "timestamp": int(time.time()),
        "note": "Mock payment - Configure Plasma for real payouts"
    }
    
    log_agent("Settlement", f"✅ Mock Plasma Payment executed (configure Plasma for real payouts)", state)
    
    return {
        **state,
        "settlement_status": settlement_status
    }


def error_halt_agent(state: TreasuryState) -> TreasuryState:
    """
    ERROR_HALT Node
    Handles errors when FDC attestation is missing or invalid
    Stops all trading activity for safety
    """
    log_agent("ERROR_HALT", "🚨 ERROR_HALT: FDC attestation verification failed", state)
    log_agent("ERROR_HALT", "All trading activity has been halted for safety", state)
    
    errors = state.get("errors", [])
    if errors:
        log_agent("ERROR_HALT", f"Errors encountered: {len(errors)}", state)
        for error in errors:
            log_agent("ERROR_HALT", f"  - {error.get('agent', 'Unknown')}: {error.get('error', 'Unknown error')}", state)
    
    carbon_audit = state.get("carbon_audit", {})
    voting_round_id = carbon_audit.get("voting_round_id") or carbon_audit.get("fdc_round_id")
    if voting_round_id:
        log_agent("ERROR_HALT", f"Last Voting Round ID checked: {voting_round_id}", state)
    
    return {
        **state,
        "treasury_decision": "ERROR_HALT",
        "decision_reason": "FDC attestation verification failed - trading halted for safety"
    }


def should_route_to_settlement(state: TreasuryState) -> Literal["settlement", END]:
    """
    Conditional edge from Manager:
    If price < target AND carbon < threshold (fdc_proof_valid), go to Settlement
    Otherwise, go to END
    """
    ftso_price = state.get("ftso_price")
    fdc_proof_valid = state.get("fdc_proof_valid", False)
    
    if ftso_price is None or fdc_proof_valid is None:
        return END
    
    price_below_target = ftso_price < XRP_TARGET_PRICE
    carbon_below_threshold = fdc_proof_valid
    
    if price_below_target and carbon_below_threshold:
        return "settlement"
    return END


def should_continue_to_settlement(state: TreasuryState) -> Literal["settlement", END]:
    """
    Conditional edge: Only go to settlement if decision is EXECUTE_BUY
    """
    decision = state.get("treasury_decision")
    if decision == "EXECUTE_BUY":
        return "settlement"
    return END


def should_route_to_error_halt(state: TreasuryState) -> Literal["error_halt", "treasury_manager"]:
    """
    Conditional edge: Route to ERROR_HALT if FDC attestation is invalid
    """
    should_halt = state.get("should_halt", False)
    fdc_status = state.get("fdc_verification_status")
    
    if should_halt or fdc_status == "ERROR_HALT":
        return "error_halt"
    return "treasury_manager"


def create_veridifi_swarm_graph():
    """
    Create the LangGraph StateGraph for the VeridiFi Swarm
    
    Flow: START -> Scout (Price) -> Auditor (Carbon) -> Manager (Decision) -> Settlement (Plasma)
    Conditional edge from Manager: If price < target AND carbon < threshold -> Settlement, else -> END
    """
    workflow = StateGraph(TreasuryState)
    
    # Add nodes (agents)
    workflow.add_node("scout", scout_agent)  # Price node
    workflow.add_node("auditor", auditor_agent)  # Carbon node
    workflow.add_node("manager", manager_agent)  # Decision node
    workflow.add_node("settlement", settlement_agent)  # Plasma payout node
    
    # Set entry point
    workflow.set_entry_point("scout")
    
    # Link nodes: START -> Scout -> Auditor -> Manager -> Settlement
    workflow.add_edge("scout", "auditor")
    workflow.add_edge("auditor", "manager")
    
    # Conditional edge from Manager:
    # If price < target AND carbon < threshold -> Settlement
    # Otherwise -> END
    workflow.add_conditional_edges(
        "manager",
        should_route_to_settlement,
        {
            "settlement": "settlement",
            END: END
        }
    )
    
    # Settlement is final
    workflow.add_edge("settlement", END)
    
    # Compile the graph
    app = workflow.compile()
    
    return app


def create_green_treasury_graph():
    """
    Create the LangGraph StateGraph for the Green Treasury swarm (legacy)
    """
    workflow = StateGraph(TreasuryState)
    
    # Add nodes (agents)
    workflow.add_node("oracle_scout", oracle_scout_agent)
    workflow.add_node("environmental_auditor", environmental_auditor_agent)
    workflow.add_node("error_halt", error_halt_agent)
    workflow.add_node("treasury_manager", treasury_manager_agent)
    workflow.add_node("settlement", settlement_agent_old)
    
    # Set entry point - run scout and auditor in parallel
    workflow.set_entry_point("oracle_scout")
    
    # After scout, run auditor (they can run in parallel, but we'll sequence for clarity)
    workflow.add_edge("oracle_scout", "environmental_auditor")
    
    # After auditor, conditionally route to ERROR_HALT or treasury manager
    workflow.add_conditional_edges(
        "environmental_auditor",
        should_route_to_error_halt,
        {
            "error_halt": "error_halt",
            "treasury_manager": "treasury_manager"
        }
    )
    
    # ERROR_HALT is a terminal node
    workflow.add_edge("error_halt", END)
    
    # After manager, conditionally go to settlement or END
    workflow.add_conditional_edges(
        "treasury_manager",
        should_continue_to_settlement,
        {
            "settlement": "settlement",
            END: END
        }
    )
    
    # Settlement is final
    workflow.add_edge("settlement", END)
    
    # Compile the graph
    app = workflow.compile()
    
    return app


def run_veridifi_swarm():
    """
    Run the VeridiFi Swarm with streaming output for live monitoring
    """
    print("=" * 80)
    print("🌱 VERIDIFI SWARM - Multi-Agent Decision System")
    print("=" * 80)
    print("\nSwarm Flow:")
    print("  START -> Scout (Price) -> Auditor (Carbon) -> Manager (Decision) -> Settlement (Plasma)")
    print("\nNodes:")
    print("  1. Scout (FTSO Node) - Fetches XRP/USD price")
    print("  2. Auditor (FDC Node) - Validates FDC proof for carbon data")
    print("  3. Manager (Decision Node) - Evaluates: price < target AND carbon < threshold")
    print("  4. Settlement (Plasma Node) - Executes gasless USDT payout")
    print("\n" + "=" * 80 + "\n")
    
    # Create the graph
    app = create_veridifi_swarm_graph()
    
    # Initial state
    initial_state: TreasuryState = {
        "ftso_price": None,
        "fdc_proof_valid": None,
        "payout_status": None,
        "market_report": None,
        "carbon_audit": None,
        "fdc_verification_status": None,
        "treasury_decision": None,
        "decision_reason": None,
        "settlement_status": None,
        "errors": [],
        "agent_history": []
    }
    
    # Run with streaming for live monitoring
    print("🚀 Starting VeridiFi Swarm Execution...\n")
    print("-" * 80)
    
    final_state = None
    for state in app.stream(initial_state):
        # Print each node's output
        for node_name, node_state in state.items():
            print(f"\n📊 [{node_name.upper()}] Node Output:")
            print("-" * 80)
            
            # Display key state updates
            if "ftso_price" in node_state and node_state["ftso_price"] is not None:
                print(f"  💰 FTSO Price: ${node_state['ftso_price']:.4f}")
            
            if "fdc_proof_valid" in node_state and node_state["fdc_proof_valid"] is not None:
                status = "✅ VALID" if node_state["fdc_proof_valid"] else "❌ INVALID"
                print(f"  🌍 FDC Proof Valid: {status}")
            
            if "treasury_decision" in node_state and node_state["treasury_decision"]:
                print(f"  🎯 Decision: {node_state['treasury_decision']}")
                if node_state.get("decision_reason"):
                    print(f"  📝 Reason: {node_state['decision_reason']}")
            
            if "payout_status" in node_state and node_state["payout_status"]:
                payout = node_state["payout_status"]
                if payout.get("executed"):
                    print(f"  💚 Payout Status: ✅ EXECUTED")
                    print(f"  📦 Amount: {payout.get('amount_usdt', 0)} USDT")
                    if payout.get("transaction_hash"):
                        print(f"  🔗 TX Hash: {payout['transaction_hash']}")
                else:
                    print(f"  ❌ Payout Status: FAILED")
                    if payout.get("error"):
                        print(f"  ⚠️  Error: {payout['error']}")
            
            # Show errors if any
            if node_state.get("errors"):
                print(f"  ⚠️  Errors: {len(node_state['errors'])}")
                for error in node_state["errors"][-3:]:  # Show last 3 errors
                    print(f"     - {error.get('agent', 'Unknown')}: {error.get('error', 'Unknown')}")
            
            print("-" * 80)
        
        # Store final state
        final_state = state
    
    print("\n" + "=" * 80)
    print("✅ VeridiFi Swarm Execution Complete")
    print("=" * 80)
    
    return final_state


def run_green_treasury():
    """
    Run the Green Treasury multi-agent swarm (legacy)
    """
    print("=" * 80)
    print("🌱 GREEN TREASURY - Autonomous Multi-Agent Orchestration System")
    print("=" * 80)
    print("\nSwarm Roles & Nodes:")
    print("  1. Oracle Scout (FTSO Node) - Polls BTC/USD and XRP/USD prices")
    print("  2. Environmental Auditor (FDC Node) - Fetches Carbon Intensity for Oxford")
    print("  3. Treasury Manager (Supervisor) - Makes trading decisions")
    print("  4. Settlement Agent (Plasma Node) - Executes mock Plasma Payments")
    print("\n" + "=" * 80 + "\n")
    
    # Create the graph
    app = create_green_treasury_graph()
    
    # Initial state
    initial_state: TreasuryState = {
        "ftso_price": None,
        "fdc_proof_valid": None,
        "payout_status": None,
        "market_report": None,
        "carbon_audit": None,
        "fdc_verification_status": None,
        "treasury_decision": None,
        "decision_reason": None,
        "settlement_status": None,
        "errors": [],
        "agent_history": []
    }
    
    # Run the graph
    result = app.invoke(initial_state)
    
    # Print final summary
    print("\n" + "=" * 80)
    print("📊 FINAL TREASURY REPORT")
    print("=" * 80)
    
    if result.get("market_report"):
        mr = result["market_report"]
        if mr.get("status") == "VALID":
            print(f"\n📈 Market Report:")
            print(f"   BTC/USD: ${mr['btc_usd']:,.2f}")
            print(f"   XRP/USD: ${mr['xrp_usd']:,.4f}")
            print(f"   Data Freshness: BTC {mr['btc_freshness_seconds']}s, XRP {mr['xrp_freshness_seconds']}s")
        else:
            print(f"\n❌ Market Report Error: {mr.get('error', 'Unknown')}")
    
    if result.get("carbon_audit"):
        ca = result["carbon_audit"]
        print(f"\n🌍 Carbon Audit:")
        print(f"   Intensity: {ca['intensity']} gCO2/kWh")
        print(f"   Status: {ca['status_emoji']} {ca['status']}")
        print(f"   Region: {ca['region']}")
        print(f"   Source: {ca['data_source']}")
    
    if result.get("treasury_decision"):
        print(f"\n💼 Treasury Decision: {result['treasury_decision']}")
        print(f"   Reason: {result['decision_reason']}")
    
    if result.get("settlement_status") and result["settlement_status"].get("executed"):
        ss = result["settlement_status"]
        print(f"\n💸 Settlement Status: {ss['status']}")
        print(f"   Amount: {ss['amount_usdt']} USDT")
        print(f"   Recipient: {ss['recipient']}")
        print(f"   TX Hash: {ss['transaction_hash']}")
    
    if result.get("errors"):
        print(f"\n⚠️  Errors: {len(result['errors'])}")
        for error in result["errors"]:
            print(f"   [{error['agent']}]: {error['error']}")
    
    print("\n" + "=" * 80)
    
    return result


if __name__ == "__main__":
    # Run the new VeridiFi Swarm with streaming output
    run_veridifi_swarm()

