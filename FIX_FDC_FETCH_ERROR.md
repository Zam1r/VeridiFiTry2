# Fix: FDC Fetch Error - UK Carbon Intensity API

## Problem

The FDC verifier is returning:
```
Prepared request data: { status: 'INVALID: FETCH ERROR' }
Error: Failed to prepare attestation request
```

This means the FDC verifier cannot successfully fetch data from the UK Carbon Intensity API.

## Possible Causes

1. **API blocking the verifier's IP** - The API might be blocking requests from Flare's verifier servers
2. **Missing or incorrect headers** - The API might require specific headers
3. **API endpoint changed** - The API structure might have changed
4. **Network connectivity** - The verifier might not be able to reach the API

## Solutions

### Solution 1: Test API Directly

First, verify the API is accessible and returns the expected format:

```bash
curl -s -H "Accept: application/json" "https://api.carbonintensity.org.uk/intensity" | python3 -m json.tool
```

Expected response:
```json
{
  "data": [
    {
      "intensity": {
        "actual": 123,
        "forecast": 125,
        "index": "moderate"
      },
      "from": "2024-01-01T00:00Z",
      "to": "2024-01-01T00:30Z"
    }
  ]
}
```

### Solution 2: Update Headers

The API might require different headers. Try updating the headers in `submitCarbonIntensityRequest.ts`:

```typescript
const headers = JSON.stringify({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
});
```

### Solution 3: Use Alternative Endpoint

Try the regional endpoint instead:

```typescript
const apiUrl = "https://api.carbonintensity.org.uk/regional/intensity/2024-01-01T00:00Z/2024-01-01T23:59Z/postcode/OX1";
```

### Solution 4: Check Verifier Configuration

Make sure you have the correct verifier URL and API key in `.env`:

```env
VERIFIER_URL_TESTNET=https://fdc-verifiers-testnet.flare.network
VERIFIER_API_KEY_TESTNET=your_api_key_here
COSTON2_DA_LAYER_URL=https://coston2-da-layer.flare.network
```

### Solution 5: Use Mock Data for Testing

For development/testing, you can temporarily use mock carbon data:

1. **Modify the Auditor Agent** to accept mock data when FDC is unavailable
2. **Or manually set carbon intensity** in VeridiFiCore for testing

## Quick Fix: Test with Different Headers

Update `scripts/veridiFi/submitCarbonIntensityRequest.ts`:

```typescript
const headers = JSON.stringify({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
});
```

Then try again:
```bash
yarn hardhat run scripts/veridiFi/submitCarbonIntensityRequest.ts --network coston2
```

## Alternative: Manual Carbon Data Entry

If FDC continues to fail, you can manually process carbon data for testing:

1. Get carbon intensity from API manually
2. Use a script to directly call `processCarbonIntensityProof` on VeridiFiCore
3. This bypasses FDC for testing purposes

## Next Steps

1. **Test API directly** - Verify it's accessible
2. **Update headers** - Try different header combinations
3. **Contact Flare team** - If verifier can't reach the API, it might be a network issue
4. **Use alternative data source** - Consider a different carbon intensity API

## For Now: System Still Works

**Important:** Even without FDC data, your system is still working:
- ✅ PriceOracle is fetching prices
- ✅ Dashboard is showing live data
- ✅ Agents are making decisions (correctly waiting)

The system will work once:
- FDC data is available, OR
- You use mock data for testing

