# Vercel Serverless Function: Carbon Intensity API

## Overview

This Vercel serverless function fetches carbon intensity data from `carbonintensity.org.uk/api/v1/intensity` and returns only the 'actual' intensity value as a raw JSON object.

## File Structure

```
api/
  └── carbon-intensity.py    # Serverless function handler
vercel.json                   # Vercel configuration
requirements.txt              # Python dependencies (if needed)
```

## Function Details

### Endpoint
- **URL**: `/api/carbon-intensity`
- **Method**: GET
- **Runtime**: Python 3.9

### Response Format

**Success (200):**
```json
{
  "actual": 159
}
```

**Error (500):**
```json
{
  "error": "Error message here"
}
```

## Usage

### Local Development

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Run locally:
   ```bash
   vercel dev
   ```

3. Test the endpoint:
   ```bash
   curl http://localhost:3000/api/carbon-intensity
   ```

### Production Deployment

1. Deploy to Vercel:
   ```bash
   vercel
   ```

2. Access the function:
   ```
   https://your-project.vercel.app/api/carbon-intensity
   ```

## How It Works

1. **Fetches data** from `https://carbonintensity.org.uk/api/v1/intensity`
2. **Strips headers** - Uses minimal headers (only Accept: application/json)
3. **Extracts** the 'actual' intensity value from the response
4. **Returns** raw JSON with just `{ "actual": <number> }`

## API Response Structure

The UK Carbon Intensity API returns:
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

This function extracts and returns only:
```json
{
  "actual": 159
}
```

## Error Handling

The function handles:
- Network errors (URLError)
- JSON parsing errors
- Missing data fields
- Timeout errors (10 second timeout)

## Testing

### Test with curl:
```bash
curl https://your-project.vercel.app/api/carbon-intensity
```

### Expected Response:
```json
{"actual": 159}
```

## Integration with FDC

This serverless function can be used as an alternative endpoint for FDC verifier if the direct API is blocked:

1. Deploy this function to Vercel
2. Use the Vercel URL in your FDC request:
   ```typescript
   const apiUrl = "https://your-project.vercel.app/api/carbon-intensity";
   ```

This provides a clean, stripped-down endpoint that returns only the intensity value.

## Notes

- Uses Python standard library (`urllib`) - no external dependencies required
- 10 second timeout for API requests
- Minimal headers to avoid bot detection
- Returns raw JSON (no extra metadata)


