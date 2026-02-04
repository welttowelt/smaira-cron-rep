# Smaira Cron Rep

**Starknet Market Intelligence & Automated Reporting Agent**

A comprehensive market monitoring, reporting, and automation system powered by [AVNU SDK](https://docs.avnu.fi). Built for autonomous agents and cron-based DeFi operations on Starknet.

## Features

### 📊 Market Intelligence

- Real-time price feeds for all Starknet tokens
- Volume and liquidity tracking
- Price change alerts (configurable thresholds)
- Market cap rankings

### 📈 Automated Reports

- Daily market snapshots
- Weekly trend analysis
- Custom watchlist tracking
- Markdown and JSON output formats

### 🔄 DCA (Dollar Cost Averaging)

- Automated recurring token purchases
- Multiple frequency options (hourly, daily, weekly, monthly)
- Order tracking and performance metrics
- Slippage protection

### ⚡ Price Alerts

- Configurable price thresholds
- Percentage change triggers
- Volume spike detection
- Webhook/notification support

### ⏰ Cron Scheduler

- Built-in job scheduler
- Multiple report types
- Configurable intervals
- State persistence

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
# Network
STARKNET_NETWORK=mainnet

# Watchlist (comma-separated symbols)
WATCHLIST=ETH,STRK,USDC,LORDS,ZEND

# Alert Thresholds
PRICE_CHANGE_THRESHOLD=5
VOLUME_SPIKE_THRESHOLD=200

# Output
REPORTS_DIR=./reports
OUTPUT_FORMAT=markdown
```

## Usage

### Quick Commands

```bash
# Get current market snapshot
npm run snapshot

# Generate full market report
npm run report

# Check price alerts
npm run alerts

# View DCA opportunities
npm run dca

# Start cron scheduler
npm run cron
```

### Programmatic Usage

```typescript
import { Smaira } from 'smaira-cron-rep';

const smaira = new Smaira();

// Get market snapshot
const snapshot = await smaira.getSnapshot();

// Get top tokens by volume
const top = await smaira.getTopByVolume(10);

// Check for price alerts
const alerts = await smaira.checkAlerts({
  priceChangeThreshold: 5,
  volumeSpikeThreshold: 200,
});

// Generate report
const report = await smaira.generateReport('daily');
```

## Architecture

```
smaira-cron-rep/
├── src/
│   ├── index.ts              # Main entry point
│   ├── core/
│   │   ├── smaira.ts         # Core Smaira class
│   │   ├── markets.ts        # Market data fetching
│   │   ├── tokens.ts         # Token utilities
│   │   └── alerts.ts         # Alert system
│   ├── cron/
│   │   ├── scheduler.ts      # Cron job scheduler
│   │   └── jobs.ts           # Job definitions
│   ├── reports/
│   │   ├── generator.ts      # Report generator
│   │   ├── templates/        # Report templates
│   │   └── formats/          # Output formatters
│   ├── dca/
│   │   ├── engine.ts         # DCA execution engine
│   │   └── tracker.ts        # Order tracking
│   └── utils/
│       ├── config.ts         # Configuration
│       └── logger.ts         # Logging
├── reports/                   # Generated reports
└── data/                      # Persistent state
```

## Report Types

### Daily Snapshot

- Top 20 tokens by volume
- Notable price movements (>5%)
- New verified tokens
- Liquidity changes

### Weekly Analysis

- 7-day performance summary
- Trend identification
- Volume analysis
- DCA performance tracking

### Custom Watchlist

- Personalized token tracking
- Entry/exit signals
- Portfolio simulation

## API Reference

### Smaira Class

```typescript
class Smaira {
  // Market Data
  getSnapshot(): Promise<MarketSnapshot>
  getTopByVolume(count: number): Promise<TokenData[]>
  getTokenPrice(symbol: string): Promise<number>
  
  // Alerts
  checkAlerts(config: AlertConfig): Promise<Alert[]>
  setAlert(alert: AlertDefinition): void
  
  // Reports
  generateReport(type: ReportType): Promise<Report>
  saveReport(report: Report, path?: string): Promise<void>
  
  // DCA
  analyzeDCAOpportunity(params: DCAParams): Promise<DCAAnalysis>
  trackDCAOrder(orderId: string): Promise<DCAStatus>
  
  // Cron
  scheduleJob(job: CronJob): void
  getScheduledJobs(): CronJob[]
}
```

## Built With

- [AVNU SDK](https://docs.avnu.fi) - Starknet liquidity infrastructure
- [starknet.js](https://starknetjs.com) - Starknet JavaScript SDK
- [node-cron](https://github.com/node-cron/node-cron) - Task scheduler

## License

MIT

## Author

Built by [stormforge](https://github.com/stormforge) for autonomous agent operations on Starknet.
