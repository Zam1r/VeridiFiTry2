# VeridiFi



**VeridiFi** is an autonomous, environmentally-conscious trading system that makes intelligent trading decisions based on verified on-chain data from the Flare Network. By combining real-time price data from FTSO (Flare Time Series Oracle) with carbon intensity verification via FDC (Flare Data Connector), VeridiFi ensures that trading activities only execute when both market conditions and environmental criteria are met.

## 🌟 What VeridiFi Does

VeridiFi orchestrates a multi-agent system that:

1. **Monitors Market Conditions**: Fetches real-time XRP/USD prices from FTSO oracles
2. **Verifies Carbon Footprint**: Validates carbon intensity data through FDC proofs, ensuring energy consumption is below sustainable thresholds
3. **Makes Autonomous Decisions**: Executes trades only when:
   - Price conditions are favorable (XRP < $1.10)
   - Carbon intensity is verified and below 50 gCO2/kWh
4. **Executes Gasless Payments**: Uses Plasma Paymaster for zero-fee USDT payouts when conditions are met

## 🏗️ Architecture

VeridiFi uses a **LangGraph-based multi-agent orchestration system** with four specialized agents:

```
START → Scout (Price) → Auditor (Carbon) → Manager (Decision) → Settlement (Plasma)
```

### Agent Flow

1. **Scout Agent (FTSO Node)**
   - Fetches XRP/USD price from Flare Time Series Oracle
   - Provides verified, on-chain price data
   - Updates state with current market conditions

2. **Auditor Agent (FDC Node)**
   - Validates FDC proof for carbon intensity data
   - Verifies carbon intensity is below 50 gCO2/kWh threshold
   - Ensures data integrity through on-chain proofs

3. **Manager Agent (Decision Node)**
   - Evaluates both price and carbon conditions
   - Makes autonomous trading decisions
   - Only proceeds to settlement when both criteria are met

4. **Settlement Agent (Plasma Node)**
   - Executes gasless USDT payouts via Plasma Paymaster
   - Provides zero-fee transactions for verified green trades
   - Records transaction hashes for auditability

## 🔑 Key Features

- ✅ **On-Chain Verified Data**: All price and carbon data is verified on-chain via FTSO and FDC
- ✅ **Autonomous Decision Making**: Multi-agent system makes intelligent decisions without manual intervention
- ✅ **Environmental Compliance**: Only executes trades when carbon intensity is verified and below threshold
- ✅ **Gasless Transactions**: Uses Plasma Paymaster for zero-fee payouts
- ✅ **Real-Time Monitoring**: Dashboard provides live monitoring of agent activities
- ✅ **Auditable**: All decisions and proofs are logged with voting round IDs for full transparency

## 🚀 Quick Start

### Prerequisites

- Node.js and Yarn (or npm)
- Python 3.8+
- Flare Network account (Coston2 testnet)
- Environment variables configured

### Installation

1. **Clone and install dependencies:**

   ```bash
   git clone <repository-url>
   cd flare-hardhat-starter
   yarn install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env
   ```

   Configure your `.env` file with:
   ```env
   # Contract addresses
   PRICE_ORACLE_ADDRESS=0x...
   VERIDIFI_CORE_ADDRESS=0x...
   
   # Network
   RPC_URL=https://coston2-api.flare.network/ext/C/rpc
   
   # Plasma (for gasless payments)
   PLASMA_RPC_URL=https://testnet-rpc.plasmadlt.com
   PLASMA_USDT_ADDRESS=0x...
   PLASMA_RECIPIENT_ADDRESS=0x...
   
   # Private key
   PRIVATE_KEY=0x...
   ```

3. **Install Python dependencies:**

   ```bash
   cd agents
   pip install -r requirements.txt
   ```

4. **Deploy contracts:**

   ```bash
   # Deploy PriceOracle
   yarn hardhat run scripts/deployPriceOracle.ts --network coston2
   
   # Deploy VeridiFiCore
   yarn hardhat run scripts/veridiFi/deployVeridiFiCore.ts --network coston2
   ```

5. **Run VeridiFi Swarm:**

   ```bash
   cd agents
   python green_treasury_swarm.py
   ```

6. **Start Dashboard (optional):**

   ```bash
   cd agents
   python dashboard_server.py
   ```

   Access the dashboard at `http://localhost:5000`

## 📊 Decision Logic

VeridiFi executes trades when **both** conditions are met:

- **Price Condition**: `XRP/USD < $1.10` (verified via FTSO)
- **Carbon Condition**: `Carbon Intensity < 50 gCO2/kWh` (verified via FDC proof)

If either condition is not met, the system waits or halts trading to ensure environmental compliance.

## 🛠️ Technology Stack

- **Blockchain**: Flare Network (Coston2 testnet)
- **Smart Contracts**: Solidity (Hardhat)
- **Multi-Agent System**: LangGraph (Python)
- **Price Data**: FTSO (Flare Time Series Oracle)
- **Carbon Data**: FDC (Flare Data Connector)
- **Payments**: Plasma Paymaster (gasless transactions)
- **Web Interface**: Flask dashboard with real-time monitoring

## 📁 Project Structure

```
├── contracts/          # Solidity smart contracts
│   ├── VeridiFiCore.sol    # Carbon intensity verification
│   └── PriceOracle.sol     # FTSO price oracle interface
├── agents/            # Multi-agent system
│   ├── green_treasury_swarm.py  # Main swarm orchestration
│   ├── dashboard_server.py      # Web dashboard
│   └── static/                  # Dashboard frontend
├── scripts/           # Deployment and interaction scripts
│   └── veridiFi/      # VeridiFi-specific scripts
└── docs/              # Documentation
```

## 🔍 How It Works

1. **Scout Agent** queries the PriceOracle contract for XRP/USD price via FTSO
2. **Auditor Agent** queries VeridiFiCore contract for carbon intensity data via FDC
3. **Manager Agent** evaluates both conditions:
   - If price < $1.10 AND carbon < 50 gCO2/kWh → Proceed to Settlement
   - Otherwise → Wait or Halt
4. **Settlement Agent** executes gasless USDT payout via Plasma Paymaster

All data is verified on-chain, ensuring trustless and transparent decision-making.

## 📚 Documentation

- [VeridiFi Swarm Architecture](agents/VERIDIFI_SWARM_README.md)
- [Green Treasury System](agents/GREEN_TREASURY_README.md)
- [Complete Setup Guide](COMPLETE_SETUP_GUIDE.md)
- [Dashboard Guide](agents/DASHBOARD_README.md)

## 🤝 Contributing

Before opening a pull request, please lint and format the code:

```bash
yarn format:fix
yarn lint:fix
```

## 📄 License

MIT

## 🔗 Resources

- [Flare Developer Hub](https://dev.flare.network/)
- [FTSO Documentation](https://docs.flare.network/tech/ftso/)
- [FDC Documentation](https://docs.flare.network/tech/fdc/)
- [Plasma Documentation](https://docs.plasmadlt.com/)

---

**VeridiFi** - Making trading decisions that are both profitable and sustainable. 🌱
