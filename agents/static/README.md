# Carbon Credits Market Application

A comprehensive carbon credits market platform featuring market analysis, leaderboards, trading capabilities, and portfolio management.

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

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3001
```

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express
- **Charts**: Chart.js
- **Data Storage**: In-memory (easily replaceable with database)

## Memory Efficiency

The application is designed with memory efficiency in mind:
- Virtual scrolling for large lists
- Lazy loading of data
- Efficient data structures
- Component-based rendering
- Minimal dependencies

## API Endpoints

- `GET /api/companies` - Get all companies
- `GET /api/companies/:id` - Get single company
- `GET /api/market` - Get market data
- `GET /api/user` - Get user data
- `POST /api/invest` - Make an investment
- `POST /api/distribute-credits` - Distribute carbon credits
- `GET /api/leaderboard/:type` - Get leaderboard data

## Future Integration

This application is designed to be easily integrated with the Flare stack foundation. The architecture allows for:
- Seamless connection to Flare's carbon analysis system
- Real-time updates from Flare's scanning infrastructure
- Integration with Flare's carbon credit calculation engine

## Project Structure

```
market/
├── index.html      # Main HTML structure
├── style.css       # Styling and themes
├── app.js          # Frontend application logic
├── server.js       # Backend API server
├── package.json    # Dependencies
└── README.md       # Documentation
```

