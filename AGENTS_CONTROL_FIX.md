# Fixed: Unified Agent Control

## What I Fixed

The "Stop Agents" button now stops **ALL agents together**, including:
- ✅ Dashboard data collection loop
- ✅ LangGraph agents (multi-agent system)

## How It Works Now

### Start Agents Button
When you click "Start Agents":
1. Starts data collection loop (prices, carbon data)
2. Starts LangGraph agents in a background thread
3. Agents run every 30 seconds automatically

### Stop Agents Button
When you click "Stop Agents":
1. Stops data collection loop
2. Stops LangGraph agents (checks flag and halts execution)
3. All agent activity pauses

## Changes Made

1. **Added `run_swarm_loop()` function** - Runs LangGraph agents in a controlled loop
2. **Updated `start_agents()` endpoint** - Starts both data collection and LangGraph agents
3. **Updated `stop_agents()` endpoint** - Stops both systems together
4. **Added stop check in `green_treasury_swarm.py`** - Agents check `agents_running` flag and stop if needed

## How to Use

1. **Start Dashboard:**
   ```bash
   cd agents
   python3 dashboard_server.py
   ```

2. **Open Dashboard:**
   ```
   http://localhost:3000
   ```

3. **Click "Start Agents"** - Starts everything
4. **Click "Stop Agents"** - Stops everything

## What Gets Stopped

When you click "Stop Agents":
- ✅ Data collection stops (no more price/carbon updates)
- ✅ LangGraph agents stop (no more agent executions)
- ✅ All background threads pause
- ✅ Dashboard remains accessible (just no updates)

## Restart

After stopping, click "Start Agents" again to resume everything.

---

**Now the dashboard controls ALL agents together!** 🎉

