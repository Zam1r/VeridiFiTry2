"""
Main LangGraph swarm orchestration for VeridiFi 3-Agent System
"""
from langgraph.graph import StateGraph, END
from agents import AgentState, market_analyst_agent, green_guardrail_agent, supervisor_agent
from typing import Literal


def should_continue(state: AgentState) -> Literal["supervisor", END]:
    """
    Determine the next step based on current state
    """
    # Check if we have errors that prevent continuation
    market_data = state.get("market_data", {})
    carbon_data = state.get("carbon_data", {})
    
    if "error" in market_data or "error" in carbon_data:
        # Still go to supervisor to make a decision based on errors
        return "supervisor"
    
    # If we have both data points, go to supervisor
    if market_data and carbon_data:
        return "supervisor"
    
    # Default to supervisor
    return "supervisor"


def create_swarm_graph():
    """
    Create the LangGraph state graph for the 3-agent swarm
    """
    # Create the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes (agents)
    workflow.add_node("market_analyst", market_analyst_agent)
    workflow.add_node("green_guardrail", green_guardrail_agent)
    workflow.add_node("supervisor", supervisor_agent)
    
    # Set entry point - both agents can run in parallel
    workflow.set_entry_point("market_analyst")
    
    # After market analyst, run green guardrail
    workflow.add_edge("market_analyst", "green_guardrail")
    
    # After green guardrail, check if we should continue to supervisor
    workflow.add_conditional_edges(
        "green_guardrail",
        should_continue,
        {
            "supervisor": "supervisor",
            END: END
        }
    )
    
    # Supervisor is the final node
    workflow.add_edge("supervisor", END)
    
    # Compile the graph
    app = workflow.compile()
    
    return app


def run_swarm():
    """
    Run the 3-agent swarm
    """
    print("=" * 60)
    print("VeridiFi 3-Agent Swarm: On-Chain Trading Decision System")
    print("=" * 60)
    print("\nAgents:")
    print("  1. Market Analyst - Fetches BTC/XRP prices via FTSO")
    print("  2. Green Guardrail - Checks carbon intensity via FDC")
    print("  3. Supervisor - Executes trade only if both conditions met")
    print("\n" + "=" * 60 + "\n")
    
    # Create the graph
    app = create_swarm_graph()
    
    # Initial state
    initial_state = {
        "messages": [],
        "market_data": {},
        "carbon_data": {},
        "decision": ""
    }
    
    # Run the graph
    result = app.invoke(initial_state)
    
    # Return the final decision
    return result


if __name__ == "__main__":
    result = run_swarm()
    print("\n" + "=" * 60)
    print("FINAL RESULT:")
    print("=" * 60)
    print(f"Decision: {result.get('decision', 'N/A')}")
    print("=" * 60)

