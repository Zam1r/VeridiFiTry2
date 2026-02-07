# Green Treasury Dashboard

A sleek, professional real-time dashboard for monitoring the Green Treasury multi-agent system.

## Features

### 🌐 Live Truth Feed
- **Real-time FTSO prices** updating every 1.8 seconds
- **Pulsing green animation** when prices update
- Shows BTC/USD and XRP/USD with timestamps
- Visual feedback for price changes

### 🌍 Carbon Dial
- **Circular gauge** showing current carbon intensity
- **Color-coded status**: Green (<50), Amber (50-150), Red (>150)
- Real-time updates from FDC (Flare Data Connector)
- Shows region, data source, and last update time

### 🤖 AI Agent Log
- **Scrolling terminal-style log** showing agent communications
- Color-coded by agent type:
  - 🟢 Scout (Green) - Price updates
  - 🟡 Auditor (Amber) - Carbon intensity checks
  - 🔵 Manager (Blue) - Trading decisions
  - 🟣 Settlement (Purple) - Payment execution
- Real-time agent "conversations"
- Auto-scrolling with smooth animations

## Quick Start

### 1. Install Dependencies

```bash
cd agents
pip install -r requirements.txt
```

### 2. Configure Environment

Make sure your `.env` file is set up (see `SETUP_GUIDE.md`):

```env
PRICE_ORACLE_ADDRESS=0x...
VERIDIFI_CORE_ADDRESS=0x...
RPC_URL=https://coston2-api.flare.network/ext/C/rpc
```

### 3. Start the Dashboard Server

```bash
cd agents
python dashboard_server.py
```

You should see:
```
============================================================
🌱 Green Treasury Dashboard Server
============================================================
Server running at: http://localhost:3000
Dashboard available at: http://localhost:3000
API endpoint: http://localhost:3000/api/data
============================================================
```

### 4. Open the Dashboard

Open your browser and navigate to:
```
http://localhost:3000
```

The dashboard will automatically start fetching data and displaying it in real-time!

## Dashboard Components

### Live Truth Feed
- Updates every **1.8 seconds**
- Green pulse animation on price changes
- Shows both BTC and XRP prices with freshness timestamps
- Connection status indicator

### Carbon Dial
- Updates every **10 seconds** (or on demand)
- Visual gauge with color zones:
  - **Green zone**: 0-50 gCO₂/kWh
  - **Amber zone**: 50-150 gCO₂/kWh
  - **Red zone**: >150 gCO₂/kWh
- Status badge showing current energy status
- Additional info: region, data source, last update

### AI Agent Log
- Real-time agent communications
- Timestamped entries
- Color-coded by agent type
- Auto-scrolling to latest entries
- Keeps last 50 entries visible

## API Endpoints

### GET `/api/data`
Returns current dashboard data (available at `http://localhost:3000/api/data`):
```json
{
  "market_report": {
    "btc_usd": 65432.10,
    "xrp_usd": 0.6234,
    "btc_timestamp": 1234567890,
    "xrp_timestamp": 1234567890,
    "status": "VALID"
  },
  "carbon_audit": {
    "intensity": 42,
    "status": "Green",
    "region": "Oxford",
    "data_source": "FDC (On-Chain via VeridiFiCore)"
  },
  "treasury_decision": {
    "decision": "EXECUTE_BUY",
    "reason": "..."
  },
  "agent_logs": [...]
}
```

### GET `/api/health`
Health check endpoint:
```json
{
  "status": "healthy",
  "contracts_configured": {
    "price_oracle": true,
    "veridiFi_core": true
  },
  "rpc_url": "https://coston2-api.flare.network/ext/C/rpc"
}
```

## Architecture

```
┌─────────────────┐
│  Dashboard HTML │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/JSON
         │ (every 1.8s)
         ▼
┌─────────────────┐
│  Flask Server   │
│   (Backend)     │
└────────┬────────┘
         │
         ├──► Contract Interface
         │    ├──► PriceOracle (FTSO)
         │    └──► VeridiFiCore (FDC)
         │
         └──► National Grid API
              (Fallback for carbon data)
```

## Customization

### Change Update Intervals

Edit `dashboard.html`:
```javascript
const UPDATE_INTERVAL = 1800; // milliseconds (1.8 seconds)
```

Edit `dashboard_server.py`:
```python
time.sleep(1.8)  # Update interval in seconds
```

### Change Carbon Thresholds

Edit `dashboard_server.py`:
```python
GREEN_THRESHOLD = 50
AMBER_THRESHOLD = 150
```

### Customize Colors

Edit CSS in `dashboard.html`:
```css
.price-value {
    color: #00ff88; /* Change green color */
}
```

## Troubleshooting

### Dashboard shows "Disconnected"
- Check if `dashboard_server.py` is running
- Verify the server is accessible at `http://localhost:3000`
- Check browser console for errors

### Prices not updating
- Verify `PRICE_ORACLE_ADDRESS` is set in `.env`
- Check RPC connection
- Look at server logs for errors

### Carbon dial shows "Loading..."
- Verify `VERIDIFI_CORE_ADDRESS` is set in `.env`
- System will fallback to National Grid API if on-chain fails
- Check server logs for FDC errors

### Agent log not showing
- Check server logs for agent messages
- Verify contracts are configured correctly
- Agent logs are generated by the backend server

## Mock Data Mode

If contracts are not configured, the dashboard will use mock data:
- Random price fluctuations
- Simulated carbon intensity
- Mock agent communications

This is useful for testing the dashboard UI without deployed contracts.

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Internet Explorer (not supported)

## Performance

- **Update frequency**: 1.8 seconds for prices
- **Carbon updates**: Every 10 seconds
- **Log entries**: Keeps last 50 entries
- **Memory usage**: Minimal (~5-10 MB)

## Security Notes

- Dashboard server runs on `0.0.0.0:3000` (accessible from network)
- For production, use a reverse proxy (nginx) with HTTPS
- Consider adding authentication for production use

## Screenshots

The dashboard features:
- Dark theme with green accents
- Smooth animations and transitions
- Responsive design (works on mobile)
- Professional, sleek appearance

## Next Steps

1. **Deploy contracts** (see `SETUP_GUIDE.md`)
2. **Start dashboard server**: `python dashboard_server.py`
3. **Open dashboard**: `http://localhost:3000`
4. **Monitor in real-time**!

Enjoy your Green Treasury dashboard! 🚀

