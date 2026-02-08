# Fix: Vercel "NOT_FOUND" Error

## The Problem

You used the **placeholder URL** `your-project.vercel.app` instead of your **actual deployment URL**.

## Your Actual URL

From your Vercel output:
```
✅  Preview: https://flare-hardhat-starter-ohv1wo3rr-zamirs-projects-92173cf9.vercel.app
```

## Test with Correct URL

Use your **actual URL**:

```bash
curl https://flare-hardhat-starter-ohv1wo3rr-zamirs-projects-92173cf9.vercel.app/api/carbon-intensity
```

## If It Still Shows NOT_FOUND

The Python function might need adjustment. Try:

1. **Check Vercel logs:**
   ```bash
   vercel inspect https://flare-hardhat-starter-ohv1wo3rr-zamirs-projects-92173cf9.vercel.app --logs
   ```

2. **Check function deployment:**
   - Go to: https://vercel.com/zamirs-projects-92173cf9/flare-hardhat-starter
   - Check the "Functions" tab
   - See if `api/carbon-intensity.py` is listed

3. **Test the root URL:**
   ```bash
   curl https://flare-hardhat-starter-ohv1wo3rr-zamirs-projects-92173cf9.vercel.app/
   ```

## Quick Test

Run this command with YOUR actual URL:

```bash
curl https://flare-hardhat-starter-ohv1wo3rr-zamirs-projects-92173cf9.vercel.app/api/carbon-intensity
```

Expected response:
```json
{"actual": 159}
```

## For FDC Integration

Use this URL in your `submitCarbonIntensityRequest.ts`:

```typescript
const apiUrl = "https://flare-hardhat-starter-ohv1wo3rr-zamirs-projects-92173cf9.vercel.app/api/carbon-intensity";
```

Or deploy to production for a permanent URL:

```bash
vercel --prod
```

Then use:
```typescript
const apiUrl = "https://flare-hardhat-starter.vercel.app/api/carbon-intensity";
```

