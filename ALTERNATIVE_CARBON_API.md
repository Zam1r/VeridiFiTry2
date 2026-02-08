# Alternative Carbon API Endpoints

## Current API: api.carbonintensity.org.uk

This is the **official National Grid Carbon Intensity API** for Great Britain. We're already using the correct API.

## Available Endpoints

### 1. Current Intensity (Currently Using)
```
GET https://api.carbonintensity.org.uk/intensity
```
**Response:**
```json
{
  "data": [{
    "from": "2026-02-07T19:00Z",
    "to": "2026-02-07T19:30Z",
    "intensity": {
      "forecast": 158,
      "actual": 159,
      "index": "moderate"
    }
  }]
}
```

### 2. Regional Intensity (Oxford)
```
GET https://api.carbonintensity.org.uk/regional/intensity/{from}/{to}/postcode/OX1
```
**Example:**
```
GET https://api.carbonintensity.org.uk/regional/intensity/2024-01-01T00:00Z/2024-01-01T23:59Z/postcode/OX1
```

### 3. Date-Specific Intensity
```
GET https://api.carbonintensity.org.uk/intensity/date/{YYYY-MM-DD}
```
**Example:**
```
GET https://api.carbonintensity.org.uk/intensity/date/2026-02-07
```

## Why FDC Verifier Might Still Fail

Even though we're using the correct official API, the FDC verifier might still fail because:

1. **IP Blocking**: The API might block Flare's verifier IP addresses
2. **Rate Limiting**: Too many requests from verifier IPs
3. **Network Restrictions**: Verifier servers might not have access
4. **Bot Detection**: API might detect automated requests

## Solutions

### Solution 1: Try Different Endpoint

The regional endpoint might work better:
```typescript
const apiUrl = "https://api.carbonintensity.org.uk/regional/intensity/2024-01-01T00:00Z/2024-01-01T23:59Z/postcode/OX1";
```

### Solution 2: Contact Flare Team

This is a Flare infrastructure issue. Ask them:
- "FDC verifier cannot fetch from api.carbonintensity.org.uk"
- "Can you whitelist verifier IPs with National Grid API?"
- "Is there network access to carbonintensity.org.uk?"

### Solution 3: Use Alternative Carbon API

If the UK API continues to be blocked, consider:
- **WattTime API** (requires API key)
- **Electricity Maps API** (requires API key)
- **Other regional carbon intensity APIs**

## Current Status

✅ **API is correct**: We're using the official National Grid API
✅ **API is accessible**: Returns valid data
❌ **FDC verifier blocked**: Cannot fetch from verifier servers

This is a **Flare infrastructure issue**, not an API issue.

