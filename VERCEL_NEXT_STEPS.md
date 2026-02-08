# Vercel Deployment - Next Steps

## ✅ Deployment Complete!

Your Python serverless function is now deployed to Vercel.

## 1. Get Your Deployment URL

After deployment, Vercel will show you:
- **Preview URL**: `https://flare-hardhat-starter-xxxxx.vercel.app`
- **Production URL**: `https://flare-hardhat-starter.vercel.app` (after you run `vercel --prod`)

Your function is available at:
```
https://your-project.vercel.app/api/carbon-intensity
```

## 2. Test the Function

### Test with curl:
```bash
curl https://your-project.vercel.app/api/carbon-intensity
```

### Expected Response:
```json
{"actual": 159}
```

### Test in Browser:
Open the URL in your browser:
```
https://your-project.vercel.app/api/carbon-intensity
```

## 3. Use with FDC Verifier

Now you can use this Vercel endpoint instead of the direct UK API in your FDC request:

### Update `submitCarbonIntensityRequest.ts`:

```typescript
// Replace this:
const apiUrl = "https://api.carbonintensity.org.uk/intensity";

// With your Vercel URL:
const apiUrl = "https://your-project.vercel.app/api/carbon-intensity";
```

### Update the jq filter:

Since the Vercel function returns `{"actual": 159}` directly, update the jq filter:

```typescript
// Old filter (for UK API):
const postProcessJq = `{actual: .data[0].intensity.actual}`;

// New filter (for Vercel function):
const postProcessJq = `.actual`;  // Or just `{actual: .actual}`

// Update ABI signature if needed:
const abiSignature = `{"components": [{"internalType": "uint256", "name": "actual", "type": "uint256"}],"name": "task","type": "tuple"}`;
```

## 4. Deploy to Production

To make it permanent (not just a preview):

```bash
vercel --prod
```

This will give you a production URL that doesn't change.

## 5. Test FDC Request

Now try submitting the FDC request again:

```bash
yarn hardhat run scripts/veridiFi/submitCarbonIntensityRequest.ts --network coston2
```

The FDC verifier should be able to fetch from your Vercel endpoint since:
- ✅ It's a clean, simple endpoint
- ✅ Returns only the data needed
- ✅ No complex headers
- ✅ Vercel's infrastructure is reliable

## 6. Monitor Function

Check your Vercel dashboard:
- View function logs
- Monitor performance
- See request/response data

## Troubleshooting

### If FDC still fails:
1. Check the Vercel function is accessible: `curl https://your-url/api/carbon-intensity`
2. Verify the response format matches what FDC expects
3. Check Vercel logs for any errors

### If you need to update the function:
1. Edit `api/carbon-intensity.py`
2. Run `vercel` again to redeploy
3. Changes deploy instantly

## Summary

✅ **Function deployed** to Vercel  
✅ **Endpoint available** at `/api/carbon-intensity`  
✅ **Ready to use** with FDC verifier  

Next: Update your FDC script to use the Vercel URL and test!


