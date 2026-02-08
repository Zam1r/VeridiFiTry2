# Carbon Credits Market - Flare Integration

This frontend application has been fully integrated into the Flare stack and starts automatically when you run the dashboard server.

## Features

### Market Analysis
- Real-time market statistics (total credits, global CO₂ levels, market cap)
- Interactive CO₂ trends chart (12-month view)
- Carbon credits distribution by industry
- Market news feed

### Leaderboards
- **Top Performers**: Companies with the most carbon credits
- **Worst Performers**: Companies with the highest debt
- **Best Comparative**: Companies performing best vs industry average
- **Best Turnarounds**: Companies with the greatest improvement
- **Fastest Growth**: Companies with highest growth rates

### Market Trading
- **Investments**: Invest in companies to receive a share of their carbon credits
- **Financial Contracts**:
  - Go Long: Bet on company success
  - Short: Bet against company performance
  - Futures: Contracts with expiry dates
  - Options: Contracts with strike prices

### Portfolio Management
- View all holdings and investments
- Track total carbon credits earned
- Monitor income history
- ROI calculations
- Income trend visualization

### Carbon Scanning
- Interactive 3D globe (Cesium)
- Company site selection and visualization
- Flare stack integration for carbon emissions scanning
- Real-time scan results and analysis
- Location search functionality

## Integration Status

✅ **Fully Integrated**
- Frontend files served from Flask static directory
- API endpoints integrated into Flask server
- Auto-starts with dashboard server
- All features functional

## API Endpoints

All endpoints are available at `/api/*`:

- `GET /api/companies` - Get all companies
- `GET /api/companies/:id` - Get single company
- `GET /api/market` - Get market data
- `GET /api/user` - Get user data
- `POST /api/invest` - Make an investment
- `POST /api/distribute-credits` - Distribute carbon credits
- `GET /api/leaderboard/:type` - Get leaderboard data

## Flare Integration Points

The application is ready for further Flare integration:

1. **Flare Integration Module** (`flare-integration.js`)
   - Ready for Flare API connection
   - Mock implementation currently active
   - See `FLARE_INTEGRATION.md` for integration guide

2. **Scanning Feature**
   - Uses FlareIntegration class for carbon scanning
   - Terminal shows Flare API calls
   - Results displayed in analysis panel

3. **Market Data**
   - Can be connected to real Flare contract data
   - Currently uses mock data for demonstration

## Future Integration Areas

The following areas are marked for further Flare integration:

1. **Real Company Data**: Connect to Flare contracts for actual company carbon data
2. **Carbon Credit Distribution**: Integrate with Flare's carbon credit system
3. **Real-time Emissions**: Connect to Flare's carbon intensity monitoring
4. **Blockchain Transactions**: Use Flare for investment and contract execution
5. **Verification**: Integrate FDC verification for carbon data

## Development

The frontend files are located in `agents/static/`:
- `index.html` - Main HTML structure
- `app.js` - Frontend application logic
- `style.css` - Styling
- `companies.js` - Company data
- `flare-integration.js` - Flare integration interface

## Access

- **Main Application**: http://localhost:3000
- **Original Dashboard**: http://localhost:3000/dashboard
- **API Base**: http://localhost:3000/api


