# Diagnose Vercel Function Issues

## Quick Test Commands

### 1. Test your function:
```bash
curl https://flare-hardhat-starter-ohv1wo3rr-zamirs-projects-92173cf9.vercel.app/api/carbon-intensity
```

### 2. Check Vercel logs:
```bash
vercel inspect https://flare-hardhat-starter-ohv1wo3rr-zamirs-projects-92173cf9.vercel.app --logs
```

### 3. Check deployment status:
```bash
vercel ls
```

## Common Errors & Fixes

### Error: "Function not found" or 404
**Fix:** Make sure `api/carbon-intensity.py` exists and is committed

### Error: "Internal Server Error" or 500
**Fix:** Check Vercel logs for Python errors

### Error: "Timeout"
**Fix:** The function has a 10-second timeout. UK API might be slow.

### Error: "Module not found"
**Fix:** All imports should be from Python standard library (urllib, json)

## What to Share

Please share:
1. **The exact command you ran**
2. **The full error message** (copy/paste)
3. **Output from:** `vercel inspect --logs`

## Redeploy After Fixes

If you make changes, redeploy:
```bash
vercel
```

## Check Function in Dashboard

1. Go to: https://vercel.com/zamirs-projects-92173cf9/flare-hardhat-starter
2. Click on your deployment
3. Go to "Functions" tab
4. Click on `api/carbon-intensity.py`
5. Check "Logs" for errors


