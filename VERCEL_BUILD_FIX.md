# Fixed: Vercel Build Error

## The Problem

```
Error: Command "npm run build" exited with 1
```

Vercel is trying to build your project, but:
- This is a **Hardhat project** (blockchain development), not a web app
- There's **no `build` script** in `package.json`
- We only want to deploy the **Python serverless function**, not build the entire project

## The Fix

Updated `vercel.json` to skip the build process:

```json
{
  "buildCommand": "echo 'No build needed for serverless functions'",
  "outputDirectory": ".",
  "rewrites": [
    {
      "source": "/api/carbon-intensity",
      "destination": "/api/carbon-intensity.py"
    }
  ]
}
```

## What This Does

- **`buildCommand`**: Tells Vercel to run a no-op command instead of `npm run build`
- **`outputDirectory`**: Sets the output directory (not needed for serverless functions, but required)
- **`rewrites`**: Routes `/api/carbon-intensity` to your Python function

## Deploy Again

Now run:
```bash
vercel
```

It should work! Vercel will:
1. ✅ Skip the build (no error)
2. ✅ Deploy the Python serverless function
3. ✅ Make it available at `/api/carbon-intensity`

## Alternative: Add a Build Script

If you prefer, you could also add a dummy build script to `package.json`:

```json
{
  "scripts": {
    "build": "echo 'No build needed'"
  }
}
```

But the `vercel.json` approach is cleaner for serverless-only deployments.

