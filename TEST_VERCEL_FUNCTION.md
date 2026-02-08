# Testing Your Vercel Function

## Your Vercel URL

```
https://flare-hardhat-starter-ohv1wo3rr-zamirs-projects-92173cf9.vercel.app
```

## Test Commands

### 1. Test the function endpoint:
```bash
curl https://flare-hardhat-starter-ohv1wo3rr-zamirs-projects-92173cf9.vercel.app/api/carbon-intensity
```

### 2. Test with verbose output (to see errors):
```bash
curl -v https://flare-hardhat-starter-ohv1wo3rr-zamirs-projects-92173cf9.vercel.app/api/carbon-intensity
```

### 3. Test in browser:
Open this URL:
```
https://flare-hardhat-starter-ohv1wo3rr-zamirs-projects-92173cf9.vercel.app/api/carbon-intensity
```

## Check Vercel Logs

If you get an error, check the Vercel logs:

```bash
vercel inspect https://flare-hardhat-starter-ohv1wo3rr-zamirs-projects-92173cf9.vercel.app --logs
```

Or check in the Vercel dashboard:
- Go to: https://vercel.com/zamirs-projects-92173cf9/flare-hardhat-starter
- Click on the deployment
- Go to "Functions" tab
- Check logs for `api/carbon-intensity.py`

## Common Issues

### Issue 1: Function Not Found (404)
- Check that `api/carbon-intensity.py` exists
- Verify the file is in the `api/` directory
- Make sure it's committed to git (if using git)

### Issue 2: Internal Server Error (500)
- Check Vercel logs for Python errors
- Verify the UK API is accessible
- Check function syntax

### Issue 3: Timeout
- The function has a 10-second timeout
- UK API might be slow

### Issue 4: Wrong Response Format
- Should return: `{"actual": 159}`
- If different, check the jq filter in FDC script

## Expected Response

```json
{"actual": 159}
```

## If Function Doesn't Work

1. **Check Vercel dashboard** for deployment status
2. **View function logs** to see errors
3. **Test the UK API directly** to verify it's accessible
4. **Redeploy** if needed: `vercel`

## Share the Error

Please share:
- The exact command you ran
- The full error message
- Any output from `vercel inspect --logs`

