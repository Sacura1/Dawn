# Dawn

Dawn is a browser extension that shows Nansen-powered token information when you hover over contract addresses and cashtags on X.

## Supported chains

* Ethereum
* Base
* Solana
* Sui
* BNB Chain
* Arbitrum
* Robinhood
* Arc

## Token data

The Dawn hover modal can display:

* Token symbol
* Token name
* Chain
* Token age
* Price
* Market cap
* FDV
* Liquidity
* 24h volume
* Holders
* Total supply
* 24h buy volume
* 24h sell volume
* Total buys
* Total sells
* Unique buyers
* Unique sellers
* Smart Trader net flow and wallet count
* Top PnL net flow and wallet count
* Public Figure net flow and wallet count
* Whale net flow and wallet count
* Exchange net flow
* Fresh Wallet net flow
* Onchain signal and explanation
* Website, X, Telegram, and Nansen links when available

## Requirements

* Node.js 20 or newer
* A Nansen API key
* Chrome or Microsoft Edge

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

Open `server\.env` and add your key:

```env
NANSEN_API_KEY=your_key_here
```

Start the server:

```powershell
npm run dev:server
```

Keep the server running. In a second terminal, build the extension:

```powershell
cd dawn
npm run build --workspace extension
```

Open `edge://extensions` or `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose the generated `extension\dist` folder.

```text
extension\dist
```

Open or refresh [X](https://x.com). Hover over a detected contract address or cashtag to view its token information.

After changing extension code, rebuild it, click **Reload** on the extensions page, and refresh X.
