# Fixed: Vercel Runtime Error

## The Problem

Error: `Function Runtimes must have a valid version, for example 'now-php@1.0.0'.`

## Why It Failed

The `vercel.json` had an incorrect Python runtime configuration:
```json
{
  "functions": {
    "api/carbon-intensity.py": {
      "runtime": "python3.9"  // ❌ Invalid format
    }
  }
}
```

Vercel doesn't use `python3.9` as a runtime identifier. It auto-detects Python files in the `api/` directory.

## The Fix

Removed the `functions` configuration. Vercel will:
- ✅ Auto-detect Python files in `api/` directory
- ✅ Use the correct Python runtime automatically
- ✅ Deploy the function correctly

## Updated vercel.json

```json
{
  "rewrites": [
    {
      "source": "/api/carbon-intensity",
      "destination": "/api/carbon-intensity.py"
    }
  ]
}
```

## Deploy Again

Now run:
```bash
vercel
```

It should work! Vercel will:
1. Auto-detect the Python function
2. Use the correct runtime
3. Deploy successfully

