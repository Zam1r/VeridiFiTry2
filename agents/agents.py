"""
Agent definitions for the VeridiFi 3-Agent Swarm
"""
from typing import TypedDict, Annotated
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from contract_interface import ContractInterface
import json

# Initialize contract interface
contract_interface = ContractInterface()

# Initialize LLM
llm = ChatOpenAI(temperature=0, model="gpt-4o-mini")


class AgentState(TypedDict):
    """Shared state across all agents"""
    messages: Annotated[list, "Messages passed between agents"]
    market_data: Annotated[dict, "Market data from Agent 1"]
    carbon_data: Annotated[dict, "Carbon intensity data from Agent 2"]
    decision: Annotated[str, "Final decision from Agent 3"]


def market_analyst_agent(state: AgentState) -> AgentState:
    """
    Agent 1: The Market Analyst
    Calls the deployed contract to check BTC/XRP prices via FTSO
    """
    print("\n[Agent 1: Market Analyst] Analyzing market prices...")
    
    # Get prices from on-chain contract
    price_data = contract_interface.get_latest_prices()
    
    if not price_data:
        error_msg = "Failed to fetch prices from contract. Contract may not be deployed or RPC connection failed."
        print(f"[Agent 1] ERROR: {error_msg}")
        return {
            **state,
            "market_data": {"error": error_msg},
            "messages": state["messages"] + [
                HumanMessage(content=f"Market Analyst Error: {error_msg}")
            ]
        }
    
    # Format the analysis
    analysis = f"""
    MARKET ANALYSIS (On-Chain FTSO Data):
    =====================================
    BTC/USD Price: ${price_data['btc_price']:,.2f}
    XRP/USD Price: ${price_data['xrp_price']:,.4f}
    BTC Timestamp: {price_data['btc_timestamp']}
    XRP Timestamp: {price_data['xrp_timestamp']}
    
    Price Ratio (BTC/XRP): {price_data['btc_price'] / price_data['xrp_price']:.2f}
    
    Data Source: On-chain FTSO Oracle (Verified)
    Contract Address: {contract_interface.price_oracle.address if contract_interface.price_oracle else 'N/A'}
    """
    
    print(analysis)
    
    return {
        **state,
        "market_data": price_data,
        "messages": state["messages"] + [
            HumanMessage(content=f"Market Analyst Report:\n{analysis}")
        ]
    }


def green_guardrail_agent(state: AgentState) -> AgentState:
    """
    Agent 2: The Green Guardrail
    Checks the FDC state for 'Green' energy via VeridiFiCore contract
    """
    print("\n[Agent 2: Green Guardrail] Checking carbon intensity...")
    
    # Get carbon intensity from on-chain contract
    carbon_data = contract_interface.get_carbon_intensity()
    
    if not carbon_data:
        error_msg = "Failed to fetch carbon intensity from contract. Contract may not be deployed or RPC connection failed."
        print(f"[Agent 2] ERROR: {error_msg}")
        return {
            **state,
            "carbon_data": {"error": error_msg},
            "messages": state["messages"] + [
                HumanMessage(content=f"Green Guardrail Error: {error_msg}")
            ]
        }
    
    # Format the analysis
    status_emoji = "✅" if carbon_data["is_green"] else "❌"
    analysis = f"""
    CARBON INTENSITY ANALYSIS (On-Chain FDC Data):
    ===============================================
    Carbon Intensity: {carbon_data['intensity']} gCO2/kWh
    Green Energy Threshold: < {carbon_data['threshold']} gCO2/kWh
    Status: {status_emoji} {carbon_data['status']}
    
    Data Source: On-chain FDC (Flare Data Connector) - Verified
    Contract Address: {contract_interface.veridiFi_core.address if contract_interface.veridiFi_core else 'N/A'}
    """
    
    print(analysis)
    
    return {
        **state,
        "carbon_data": carbon_data,
        "messages": state["messages"] + [
            HumanMessage(content=f"Green Guardrail Report:\n{analysis}")
        ]
    }


def supervisor_agent(state: AgentState) -> AgentState:
    """
    Agent 3: The Supervisor/Executor
    Only outputs 'EXECUTE_TRADE' if both conditions are met:
    1. Price data is valid (from Agent 1)
    2. Energy is Green (from Agent 2)
    """
    print("\n[Agent 3: Supervisor] Evaluating trade conditions...")
    
    market_data = state.get("market_data", {})
    carbon_data = state.get("carbon_data", {})
    
    # Check for errors
    if "error" in market_data:
        decision = "HOLD - Market data unavailable"
        reason = f"Market Analyst Error: {market_data['error']}"
    elif "error" in carbon_data:
        decision = "HOLD - Carbon data unavailable"
        reason = f"Green Guardrail Error: {carbon_data['error']}"
    else:
        # Both conditions must be met
        prices_valid = market_data.get("btc_price", 0) > 0 and market_data.get("xrp_price", 0) > 0
        energy_green = carbon_data.get("is_green", False)
        
        if prices_valid and energy_green:
            decision = "EXECUTE_TRADE"
            reason = f"""
            ✅ TRADE APPROVED
            - Market prices verified on-chain (BTC: ${market_data['btc_price']:,.2f}, XRP: ${market_data['xrp_price']:,.4f})
            - Energy is Green ({carbon_data['intensity']} gCO2/kWh < {carbon_data['threshold']} threshold)
            - Both conditions met: Price data valid AND energy is green
            """
        elif not prices_valid:
            decision = "HOLD - Invalid price data"
            reason = "Price data is invalid or missing"
        elif not energy_green:
            decision = "HOLD - Energy not green"
            reason = f"Carbon intensity ({carbon_data['intensity']} gCO2/kWh) exceeds green threshold ({carbon_data['threshold']} gCO2/kWh)"
        else:
            decision = "HOLD - Conditions not met"
            reason = "Unknown condition failure"
    
    # Use LLM to format the final decision
    system_prompt = """You are a trading supervisor that makes decisions based on on-chain verified data.
    You have received:
    1. Market data from the Market Analyst (FTSO price feeds)
    2. Carbon intensity data from the Green Guardrail (FDC verified data)
    
    Your decision must be grounded in the on-chain proofs provided. Only approve trades when BOTH conditions are met."""
    
    user_prompt = f"""
    Market Data: {json.dumps(market_data, indent=2)}
    Carbon Data: {json.dumps(carbon_data, indent=2)}
    
    Decision: {decision}
    Reason: {reason}
    
    Provide a final executive summary of the trade decision.
    """
    
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ])
    
    final_summary = f"""
    ============================================
    SUPERVISOR DECISION: {decision}
    ============================================
    {reason}
    
    Executive Summary:
    {response.content}
    ============================================
    """
    
    print(final_summary)
    
    return {
        **state,
        "decision": decision,
        "messages": state["messages"] + [
            HumanMessage(content=f"Supervisor Decision:\n{final_summary}")
        ]
    }

