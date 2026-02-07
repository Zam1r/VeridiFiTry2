# Flare Network Environment Variables Guide

Based on your `hardhat.config.ts` file, here are the environment variables used in the Flare tech stack and where to find them:

## Environment Variables in Your Project

### 1. **PRIVATE_KEY** (Line 1 typically)

- **What it is**: Your wallet's private key for signing transactions
- **Where to get it**: Export from your MetaMask or other wallet
- **⚠️ Security**: NEVER commit this to git! Keep it secret.

### 2. **FLARE_RPC_API_KEY** (Line 2-3 typically)

- **What it is**: API key for accessing Flare's RPC endpoints with enhanced features (tracer endpoints)
- **Where to get it**:
    - Visit: https://dev.flare.network/
    - Look for API key registration or RPC access
    - The tracer endpoints (`flare-api-tracer.flare.network`) require this key
    - Without it, you can use the public endpoints (no key needed)
- **Usage**: Used for Coston, Coston2, Songbird, and Flare mainnet RPC connections

### 3. **FLARE_EXPLORER_API_KEY** (Line 4 typically)

- **What it is**: API key for Flare's Blockscout explorer API
- **Where to get it**:
    - Visit the Flare explorer: https://flare-explorer.flare.network
    - Or testnet explorers:
        - Coston: https://coston-explorer.flare.network
        - Coston2: https://coston2-explorer.flare.network
        - Songbird: https://songbird-explorer.flare.network
    - Look for API key registration on the explorer site
- **Usage**: Used for contract verification on Etherscan/Blockscout

### 4. **COSTON_EXPLORER_URL** (Line 5 typically)

- **What it is**: Custom explorer URL for Coston testnet (optional)
- **Default**: `https://coston-explorer.flare.network`
- **Where to get it**: Usually not needed unless using a custom explorer

### 5. **COSTON2_EXPLORER_URL** (Line 6 typically)

- **What it is**: Custom explorer URL for Coston2 testnet (optional)
- **Default**: `https://coston2-explorer.flare.network`
- **Where to get it**: Usually not needed unless using a custom explorer

### 6. **SONGBIRD_EXPLORER_URL** (Line 7 typically)

- **What it is**: Custom explorer URL for Songbird canary network (optional)
- **Default**: `https://songbird-explorer.flare.network`
- **Where to get it**: Usually not needed unless using a custom explorer

### 7. **FLARE_EXPLORER_URL** (Line 8 typically)

- **What it is**: Custom explorer URL for Flare mainnet (optional)
- **Default**: `https://flare-explorer.flare.network`
- **Where to get it**: Usually not needed unless using a custom explorer

### 8. **COSTON_RPC_URL** (Line 9 typically)

- **What it is**: Custom RPC URL for Coston testnet (optional)
- **Default**: Uses public endpoint or tracer endpoint with API key
- **Where to get it**: Only needed if using a custom RPC provider

### 9. **COSTON2_RPC_URL** (Line 10 typically)

- **What it is**: Custom RPC URL for Coston2 testnet (optional)
- **Default**: Uses public endpoint or tracer endpoint with API key
- **Where to get it**: Only needed if using a custom RPC provider

## Additional Variables (if needed)

### **SONGBIRD_RPC_URL**

- Custom RPC URL for Songbird network

### **FLARE_RPC_URL**

- Custom RPC URL for Flare mainnet

### **XRPLEVM_RPC_URL_TESTNET**

- RPC URL for XRPL EVM testnet

### **VERIFIER_API_KEY_TESTNET**

- API key for contract verification on testnet

### **TENDERLY_USERNAME**

- Your Tenderly username (for debugging)

### **TENDERLY_PROJECT_SLUG**

- Your Tenderly project slug (for debugging)

### **XRPLEVM_EXPLORER_URL_TESTNET**

- Explorer URL for XRPL EVM testnet

## How to Get API Keys

### For FLARE_RPC_API_KEY:

1. Visit https://dev.flare.network/
2. Look for "RPC Access" or "API Keys" section
3. Sign up/register for an account
4. Generate an API key
5. This key enables access to enhanced tracer endpoints

### For FLARE_EXPLORER_API_KEY:

1. Visit one of the Flare explorers:
    - Mainnet: https://flare-explorer.flare.network
    - Testnet: https://coston2-explorer.flare.network
2. Look for "API" or "Developer" section
3. Register and generate an API key
4. This is used for contract verification

## Important Notes

- **API keys are optional**: The config file has fallbacks to public endpoints
- **Private key is required**: You need this to sign transactions
- **Testnet first**: Start with Coston2 testnet before using mainnet
- **Never commit secrets**: Make sure `.env` is in `.gitignore`

## Example .env File Structure

```env
# Required
PRIVATE_KEY=your_private_key_here

# Optional but recommended for better performance
FLARE_RPC_API_KEY=your_rpc_api_key_here
FLARE_EXPLORER_API_KEY=your_explorer_api_key_here

# Optional - only if you need custom URLs
COSTON_EXPLORER_URL=https://coston-explorer.flare.network
COSTON2_EXPLORER_URL=https://coston2-explorer.flare.network
SONGBIRD_EXPLORER_URL=https://songbird-explorer.flare.network
FLARE_EXPLORER_URL=https://flare-explorer.flare.network
COSTON_RPC_URL=
COSTON2_RPC_URL=
```

## Resources

- [Flare Developer Hub](https://dev.flare.network/)
- [Flare Network Documentation](https://docs.flare.network/)
- [Flare Explorer](https://flare-explorer.flare.network)
