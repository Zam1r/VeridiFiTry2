# Flare Integration Guide

This document explains how to integrate your Flare stack with the scanning application.

## Overview

The scanning application is pre-configured with a Flare integration interface located in `flare-integration.js`. The module provides a clean API for connecting to your Flare stack and performing carbon emissions scans.

## Integration Points

### 1. FlareIntegration Class

The `FlareIntegration` class in `flare-integration.js` contains the following methods that need to be implemented:

#### `initialize()`
Initialize connection to your Flare stack.

**Current Implementation:**
```javascript
async initialize() {
    // TODO: Initialize connection to Flare stack
    this.isInitialized = true;
    return true;
}
```

**To Integrate:**
```javascript
async initialize() {
    // Example implementation:
    this.flareClient = new FlareClient({
        apiKey: process.env.FLARE_API_KEY,
        endpoint: process.env.FLARE_ENDPOINT
    });
    await this.flareClient.connect();
    this.isInitialized = true;
    return true;
}
```

#### `scanCompany(company)`
Scan a company's sites for carbon emissions data.

**Current Implementation:**
- Uses `mockScanCompany()` for demonstration
- Returns mock data structure

**To Integrate:**
Replace the `mockScanCompany()` call with your actual Flare API call:

```javascript
async scanCompany(company) {
    // Replace mockScanCompany with:
    const results = await this.flareClient.scanCompany({
        companyId: company.id,
        companyName: company.name,
        sites: company.sites.map(site => ({
            id: site.id,
            name: site.name,
            location: site.location
        }))
    });
    
    // Transform Flare response to match expected format
    return this.transformFlareResponse(results);
}
```

#### Expected Response Format

The scan results should match this structure:

```javascript
{
    scanId: string,
    companyId: string,
    companyName: string,
    timestamp: string (ISO 8601),
    sites: [
        {
            siteId: string,
            siteName: string,
            location: { latitude: number, longitude: number },
            emissions: {
                current: number,      // Current CO2e emissions
                target: number,       // Target CO2e emissions
                trend: string,        // 'increasing', 'decreasing', 'stable'
                changePercent: string // Percentage change
            },
            status: string,           // 'onTrack', 'behind', 'ahead'
            lastUpdated: string       // ISO 8601 timestamp
        }
    ],
    overallStatus: string,            // 'onTrack', 'behind', 'ahead'
    progress: {
        onTrack: number,
        behind: number,
        ahead: number
    },
    recommendations: [
        {
            priority: string,         // 'high', 'medium', 'low'
            category: string,
            title: string,
            description: string,
            action: string
        }
    ]
}
```

#### `getSiteCarbonData(companyId, siteId)`
Get real-time carbon data for a specific site.

**To Integrate:**
```javascript
async getSiteCarbonData(companyId, siteId) {
    return await this.flareClient.getSiteData(companyId, siteId);
}
```

#### `getHistoricalData(companyId, startDate, endDate)`
Get historical carbon data for analysis.

**To Integrate:**
```javascript
async getHistoricalData(companyId, startDate, endDate) {
    return await this.flareClient.getHistoricalData(companyId, startDate, endDate);
}
```

#### `checkAvailability()`
Health check for Flare service.

**To Integrate:**
```javascript
async checkAvailability() {
    try {
        const health = await this.flareClient.healthCheck();
        return health.status === 'ok';
    } catch (error) {
        return false;
    }
}
```

## Status Calculation

The application determines site status based on current vs target emissions:

- **ahead**: Current emissions ≤ 90% of target
- **onTrack**: Current emissions between 90% and 110% of target
- **behind**: Current emissions > 110% of target

You can customize this logic in the `calculateStatus()` method.

## API Endpoints Expected

Based on the integration interface, your Flare stack should provide:

1. **POST /api/scan/company** - Scan company sites
2. **GET /api/sites/:companyId/:siteId** - Get site data
3. **GET /api/historical/:companyId** - Get historical data
4. **GET /api/health** - Health check

## Environment Variables

When integrating, you may want to add these environment variables:

```env
FLARE_API_KEY=your_api_key
FLARE_ENDPOINT=https://your-flare-api.com
FLARE_TIMEOUT=30000
```

## Testing Integration

1. Replace mock implementations in `flare-integration.js`
2. Test with a single company first
3. Verify response format matches expected structure
4. Check error handling for network failures
5. Test with multiple companies and sites

## Error Handling

The application handles Flare errors gracefully:
- Network errors are caught and displayed to the user
- Failed scans show error messages
- The UI remains functional even if Flare is unavailable

## Performance Considerations

- Scans are performed asynchronously
- Loading bar shows progress during scan
- Results are cached in `currentScanResults` variable
- Animation cleanup is handled automatically

## Next Steps

1. Implement the Flare client connection in `initialize()`
2. Replace `mockScanCompany()` with actual API calls
3. Implement other methods as needed
4. Test thoroughly with real data
5. Monitor performance and optimize as needed

## Support

For questions about the integration interface, refer to the code comments in `flare-integration.js` or the main application code in `app.js`.

