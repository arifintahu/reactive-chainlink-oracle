# Cross-Chain Price Feed Oracle

Mirror official Chainlink Price Feeds from an origin chain to a destination chain using Reactive Network's event-driven architecture. The destination chain exposes a read interface compatible with `AggregatorV3Interface` so applications can consume price data where a native Chainlink feed is not available.

## 🎯 Problem Statement

Many blockchain networks lack native Chainlink price feed infrastructure, limiting DeFi applications that require reliable price data. Traditional solutions require:
- Manual price updates (centralized, unreliable)
- Running off-chain bots (complex, requires infrastructure)
- Trust in third-party oracles (security risks)

**Reactive Contracts solve this by:**
- Automatically monitoring Chainlink feeds on origin chains
- Triggering cross-chain updates without user intervention
- Providing trustless, automated price feed mirroring
- Eliminating need for off-chain infrastructure

This is **impossible without Reactive Contracts** because you would need constant off-chain monitoring and manual transaction submission, which is:
- Expensive (requires infrastructure)
- Unreliable (single point of failure)
- Complex (requires DevOps expertise)

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│  Origin Chain   │         │  Reactive Network    │         │ Destination     │
│   (Sepolia)     │         │                      │         │  Chain          │
│                 │         │                      │         │                 │
│  Chainlink      │  event  │  Reactive Contract   │ callback│  FeedProxy      │
│  Aggregator ────┼────────>│  - Subscribes to     │────────>│  - Stores data  │
│                 │         │    AnswerUpdated     │         │  - Exposes      │
│  ETH/USD Feed   │         │  - Relays updates    │         │    AggregatorV3 │
│                 │         │                      │         │    interface    │
└─────────────────┘         └──────────────────────┘         └─────────────────┘
```

### Components

1. **PriceFeedReactiveContract** (Reactive Network)
   - Subscribes to Chainlink `AnswerUpdated` events
   - Decodes price updates (roundId, answer, timestamp)
   - Sends cross-chain messages to destination

2. **DestinationFeedProxy** (Destination Chain)
   - Receives price updates via callbacks
   - Stores historical round data
   - Exposes `AggregatorV3Interface` for DApp integration

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- Hardhat
- Wallet with:
  - Sepolia ETH (origin chain)
  - REACT tokens (Reactive Network)
  - Destination chain gas tokens

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd chainlink-cross-chain-oracle

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your private keys and RPC URLs
```

### Environment Variables

```env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_KEY
REACTIVE_RPC=https://kopli-rpc.reactive.network
ETHERSCAN_API_KEY=your_etherscan_key
```

## 📝 Deployment Instructions

### Step 1: Deploy Destination FeedProxy

Deploy the proxy contract on your destination chain (e.g., Sepolia testnet):

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

This will:
- Deploy `DestinationFeedProxy`
- Configure decimals and description
- Save deployment info to `deployments/` folder

**Expected Output:**
```
✓ DestinationFeedProxy deployed at: 0x1234...
  Decimals: 8
  Description: ETH / USD
```

### Step 2: Deploy Reactive Contract

Deploy the reactive contract on Reactive Network:

```bash
npx hardhat run scripts/deploy-reactive.js --network reactive
```

This will:
- Deploy `PriceFeedReactiveContract`
- Subscribe to Chainlink feed events
- Link to destination proxy

**Expected Output:**
```
✓ PriceFeedReactiveContract deployed at: 0x5678...
✓ Subscription ID: 12345
```

### Step 3: Configure Destination Proxy

Update the destination proxy with the reactive contract address:

```bash
npx hardhat run scripts/configure.js --network sepolia
```

Or manually via Hardhat console:

```javascript
const proxy = await ethers.getContractAt(
    "DestinationFeedProxy",
    "DESTINATION_PROXY_ADDRESS"
);
await proxy.updateReactiveContract("REACTIVE_CONTRACT_ADDRESS");
```

### Step 4: Fund Reactive Contract

Send REACT tokens to the reactive contract to pay for cross-chain callbacks:

```bash
# Recommended: 0.1 - 1 REACT for testing
# Transfer via wallet or script
```

### Step 5: Verify Deployment

Check that everything is working:

```bash
npx hardhat run scripts/verify-setup.js --network sepolia
```

## 🔄 How It Works (Step-by-Step Workflow)

### Initial Setup Phase

1. **Deploy Destination Proxy** on target chain
   - Transaction: Deploy DestinationFeedProxy contract
   - Result: Proxy ready to receive updates

2. **Deploy Reactive Contract** on Reactive Network
   - Transaction: Deploy PriceFeedReactiveContract
   - Result: Subscription created for Chainlink events

3. **Link Contracts**
   - Transaction: Call `updateReactiveContract()` on proxy
   - Result: Proxy authorizes reactive contract

4. **Fund Reactive Contract**
   - Transaction: Send REACT tokens to reactive contract
   - Result: Contract can pay for callbacks

### Automated Operation (Repeating)

5. **Chainlink Update Occurs**
   - Event: Chainlink aggregator emits `AnswerUpdated()`
   - Data: New price, roundId, timestamp
   - No action required from user

6. **Reactive Contract Detects Event**
   - Trigger: ReactVM detects subscribed event
   - Action: Calls `react()` callback function
   - Processing: Decodes price data from event

7. **Cross-Chain Message Sent**
   - Action: Reactive contract emits `Callback` event
   - Payload: Encoded `updateAnswer()` call
   - Destination: Target chain and proxy address

8. **Destination Receives Update**
   - Transaction: ReactVM submits callback transaction
   - Action: Calls `updateAnswer()` on proxy
   - Result: New price data stored

9. **DApps Consume Data**
   - Call: `proxy.latestRoundData()`
   - Returns: Latest price, timestamp, roundId
   - Use: DApps use price in their logic

## 📊 Testing

### Run Tests

```bash
# Unit tests
npx hardhat test

# Integration tests
npx hardhat test test/integration/

# Coverage
npx hardhat coverage
```

### Test Scenarios Covered

- ✅ Destination proxy storage and retrieval
- ✅ Access control (only reactive contract can update)
- ✅ AggregatorV3Interface compatibility
- ✅ Historical round data
- ✅ Edge cases (invalid data, replay attacks)
- ✅ Gas optimization

### Manual Testing

1. **Monitor Origin Events:**
```bash
npx hardhat run scripts/monitor-origin.js --network sepolia
```

2. **Check Reactive Contract:**
```bash
npx hardhat run scripts/check-reactive.js --network reactive
```

3. **Query Destination:**
```bash
npx hardhat run scripts/query-destination.js --network sepolia
```

## 📜 Contract Addresses

### Testnet Deployment

| Contract | Network | Address | Transaction Hash |
|----------|---------|---------|------------------|
| DestinationFeedProxy | Sepolia | `0x...` | `0x...` |
| PriceFeedReactiveContract | Reactive Kopli | `0x...` | `0x...` |

**Configuration:**
- Origin Chain: Ethereum Sepolia (Chain ID: 11155111)
- Chainlink Feed: ETH/USD (0x694AA1769357215DE4FAC081bf1f309aDC325306)
- Destination Chain: Ethereum Sepolia
- Decimals: 8

### Mainnet Deployment (Future)

Coming soon after testnet validation.

## 🔍 Monitoring & Verification

### View Price Feed Updates

```bash
# Check latest price on destination
npx hardhat console --network sepolia
```

```javascript
const proxy = await ethers.getContractAt(
    "DestinationFeedProxy",
    "YOUR_PROXY_ADDRESS"
);

const [roundId, answer, startedAt, updatedAt, answeredInRound] = 
    await proxy.latestRoundData();

console.log("Latest Price:", ethers.formatUnits(answer, 8), "USD");
console.log("Updated At:", new Date(Number(updatedAt) * 1000));
```

### Monitor Events

Watch for price updates in real-time:

```bash
npx hardhat run scripts/watch-events.js --network sepolia
```

## 🛡️ Security Considerations

### Access Control
- Only authorized reactive contract can update prices
- Owner can update reactive contract address if needed
- No external price manipulation vectors

### Data Validation
- Round IDs must increase monotonically
- Prices must be positive
- Timestamps validated

### Edge Cases Handled
- Stale data detection
- Missing rounds
- Network delays
- Transaction failures (automatic retry via ReactVM)

### Audit Recommendations
- Review reactive contract subscription logic
- Verify cross-chain message encoding
- Test failure scenarios extensively
- Monitor gas costs for callbacks

## 💰 Economics

### Gas Costs (Approximate)

| Operation | Gas | USD (at 50 gwei) |
|-----------|-----|------------------|
| Deploy Destination Proxy | ~800K | ~$2.00 |
| Deploy Reactive Contract | ~1.2M | ~$3.00 |
| Price Update (callback) | ~70K | ~$0.18 |

### REACT Token Requirements

- **Minimum:** 0.01 REACT per update
- **Recommended:** 0.1-1 REACT for testing
- **Production:** Monitor balance and refill as needed

## 🤝 Integration Guide

### For DApp Developers

Use the destination proxy exactly like a native Chainlink feed:

```solidity
import "./IAggregatorV3.sol";

contract MyDeFiApp {
    IAggregatorV3 public priceFeed;
    
    constructor(address _priceFeed) {
        priceFeed = IAggregatorV3(_priceFeed);
    }
    
    function getLatestPrice() public view returns (int) {
        (
            uint80 roundId,
            int answer,
            uint startedAt,
            uint updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        return answer;
    }
}
```

### Supported Functions

- `latestRoundData()` - Get latest price
- `getRoundData(roundId)` - Get historical price
- `decimals()` - Get decimal places
- `description()` - Get feed description
- `version()` - Get version

## 📚 Additional Resources

- [Reactive Network Docs](https://dev.reactive.network)
- [Chainlink Documentation](https://docs.chain.link)
- [AggregatorV3Interface Spec](https://docs.chain.link/data-feeds/api-reference)

## 🎥 Demo Video

[Link to 5-minute demo video explaining architecture, deployment, and testing]

## 📄 License

MIT License - see LICENSE file for details

## 🐛 Troubleshooting

### Common Issues

**"No data available" error**
- Ensure reactive contract is funded with REACT
- Verify Chainlink feed has recent updates
- Check event subscription is active

**Price updates not appearing**
- Confirm reactive contract address in destination proxy
- Verify network connectivity
- Check REACT balance in reactive contract

**Transaction failures**
- Increase gas limits in hardhat.config
- Ensure sufficient native tokens for gas
- Check destination chain isn't congested

## 👥 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## 📞 Support

- Telegram: https://t.me/reactivedevs
- Documentation: https://dev.reactive.network
- Issues: GitHub Issues tab