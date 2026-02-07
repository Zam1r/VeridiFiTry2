"""
Example usage of the Green Treasury Multi-Agent System

This script demonstrates how to run the Green Treasury swarm.
Make sure to set your environment variables in .env file first.
"""

from green_treasury_swarm import run_green_treasury

if __name__ == "__main__":
    print("Starting Green Treasury Multi-Agent System...\n")
    result = run_green_treasury()
    
    # Access the result for further processing
    if result.get("treasury_decision") == "EXECUTE_BUY":
        print("\n✅ Buy signal executed! Settlement completed.")
    elif result.get("treasury_decision") == "HALT_ACTIVITY":
        print("\n⛔ Trading halted for safety reasons.")
    else:
        print("\n⏳ Waiting for better conditions...")

