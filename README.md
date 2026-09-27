# 🌅 Dawn

**Nansen-powered token intelligence directly on X.**

Dawn is a browser extension that detects contract addresses and cashtags on X and displays Nansen-powered token information when you hover over them.

It brings market data, trading activity, labeled wallet flows, and on-chain signals into the X browsing experience.

## Features

### Token Detection

Dawn detects:

- `$CASHTAGS`
- EVM contract addresses
- Solana addresses
- Sui addresses

Detected tokens become interactive on X. Hovering over one opens the Dawn intelligence card.

### Nansen-Powered Token Data

Dawn integrates with Nansen's:

- Token Screener
- Token Information
- Flow Intelligence

Depending on data availability, the hover card can display:

- Token symbol and name
- Chain
- Token age
- Price
- Market cap
- FDV
- Liquidity
- 24h volume
- Holders
- Total supply
- 24h buy and sell volume
- Total buys and sells
- Unique buyers and sellers

### Labeled Wallet Flows

Dawn displays 24-hour Nansen flow intelligence for:

- **Smart Traders** — net flow and wallet count
- **Top PnL** — net flow and wallet count
- **Public Figures** — net flow and wallet count
- **Whales** — net flow and wallet count
- **Exchanges** — net flow
- **Fresh Wallets** — net flow

### On-Chain Signals

Dawn derives simple descriptive signals from Nansen wallet-flow data.

Current signals include:

- Smart money activity
- Smart money cooling off
- Unusual Smart Trader activity
- Mixed Smart Trader and whale flows
- Insufficient activity/data

Signals are based on defined flow and wallet-count thresholds and are not price predictions.

### Token Links

When available, the card provides links to:

- Website
- X
- Telegram
- Nansen

## Supported Chains

Dawn supports:

- Ethereum
- Base
- Solana
- Sui
- BNB Chain
- Arbitrum
- Robinhood
- Arc

## How It Works

```text
X post
  ↓
Dawn detects a cashtag or contract address
  ↓
User hovers over the token
  ↓
Dawn resolves the token using Nansen
  ↓
Token Information + Flow Intelligence
  ↓
Dawn intelligence card
```

The browser extension handles token detection and the interface.

A local Node.js server communicates with the Nansen API, normalizes the returned data, caches responses, and derives the on-chain signal shown in the extension.

## Requirements

- Node.js 20 or newer
- A Nansen API key
- Chrome or Microsoft Edge

## Run Dawn

From the project folder, install the dependencies:

```powershell
cd dawn
npm install
```

Create the server environment file:

```powershell
Copy-Item server\.env.example server\.env
```

Open `server\.env` and add your Nansen API key:

```env
NANSEN_API_KEY=your_key_here
```

Start the server:

```powershell
npm run dev:server
```

Keep the server running.

In a second terminal, build the extension:

```powershell
cd dawn
npm run build --workspace extension
```

Open:

```text
edge://extensions
```

or:

```text
chrome://extensions
```

Enable **Developer mode**, select **Load unpacked**, and choose:

```text
extension\dist
```

Open or refresh X and hover over a detected contract address or cashtag.

## Development

After changing extension code:

```powershell
npm run build --workspace extension
```

Then click **Reload** on the browser extensions page and refresh X.

## Configuration

The server can be configured through `server/.env`:

```env
NANSEN_API_KEY=your_key_here
PORT=8787
CHAINS=ethereum,base,solana,sui,bnb,arbitrum,robinhood,arc
DEV_USE_FIXTURES=false
```

`DEV_USE_FIXTURES=true` enables development fixture data. Fixture responses are visibly marked as **DEV DATA** in the extension.

## Nansen API Usage

Nansen is the data source behind Dawn's token intelligence.

Dawn currently uses:

- `/api/v1/token-screener` for token resolution
- `/api/v1/tgm/token-information` for token details and market activity
- `/api/v1/tgm/flow-intelligence` for labeled wallet-flow data

Responses are cached for short periods to reduce unnecessary API requests while browsing.

## About Dawn

Dawn is built around a simple interaction: **see a token, hover, and understand what's happening on-chain.**

By combining token data with labeled wallet flows from Nansen, Dawn gives users additional on-chain context without interrupting their browsing experience.
