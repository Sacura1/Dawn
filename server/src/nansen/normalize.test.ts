import { describe, expect, it } from "vitest";
import { normalizeFlowIntelligence, normalizeTokenInformation } from "./normalize.js";

describe("Nansen normalization", () => {
  it("preserves the documented Token Information fields", () => {
    const token = normalizeTokenInformation({
      data: {
        name: "Bike Tyson Bag",
        symbol: "BIKETYSON",
        contract_address: "Mint123",
        logo: "https://images.example/token.png",
        token_details: {
          token_deployment_date: "2026-09-15 13:28:17",
          website: "https://example.com",
          x: "token_handle",
          telegram: "token_chat",
          market_cap_usd: 0,
          fdv_usd: 11_515,
          circulating_supply: 1_000_000_000,
          total_supply: 1_000_000_000
        },
        spot_metrics: {
          volume_total_usd: 572,
          buy_volume_usd: 343,
          sell_volume_usd: 229,
          total_buys: 25,
          total_sells: 15,
          unique_buyers: 17,
          unique_sellers: 3,
          liquidity_usd: 11_265,
          total_holders: 18
        }
      }
    }, "solana");

    expect(token).toMatchObject({
      chain: "solana",
      symbol: "BIKETYSON",
      snapshot: {
        deployedAt: "2026-09-15T13:28:17.000Z",
        xUrl: "https://x.com/token_handle",
        telegramUrl: "https://t.me/token_chat",
        fdvUsd: 11_515,
        totalBuys: 25,
        totalHolders: 18
      }
    });
  });

  it("preserves every labeled flow category and upstream warning", () => {
    const flow = normalizeFlowIntelligence({
      data: [{
        smart_trader_net_flow_usd: 100,
        smart_trader_avg_flow_usd: 50,
        smart_trader_wallet_count: 2,
        whale_net_flow_usd: 0,
        whale_avg_flow_usd: null,
        whale_wallet_count: 0,
        exchange_net_flow_usd: 200,
        exchange_avg_flow_usd: 200,
        fresh_wallets_net_flow_usd: 0,
        fresh_wallets_avg_flow_usd: 0,
        public_figure_net_flow_usd: 10,
        public_figure_avg_flow_usd: 10,
        public_figure_wallet_count: 1,
        top_pnl_net_flow_usd: -25,
        top_pnl_avg_flow_usd: 25,
        top_pnl_wallet_count: 1
      }],
      warnings: ["exchange wallet count is not tracked"]
    });

    expect(flow).toMatchObject({
      smartTraderAvgFlowUsd: 50,
      whaleNetflowUsd: 0,
      publicFigureNetflowUsd: 10,
      topPnlNetflowUsd: -25,
      warnings: ["exchange wallet count is not tracked"]
    });
  });
});
