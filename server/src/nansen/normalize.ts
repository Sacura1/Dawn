import type { FlowMetrics, TokenOption } from "./types.js";

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function string(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function safeUrl(value: unknown, service?: "x" | "telegram"): string | undefined {
  const raw = string(value)?.trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "").replace(/^\//, "");
  if (service === "x" && /^[A-Za-z0-9_]{1,15}$/.test(handle)) return `https://x.com/${handle}`;
  if (service === "telegram" && /^[A-Za-z0-9_]{5,32}$/.test(handle)) return `https://t.me/${handle}`;
  return undefined;
}

function normalizedDate(value: unknown): string | undefined {
  const raw = string(value);
  if (!raw) return undefined;
  const candidate = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? `${raw.replace(" ", "T")}Z`
    : raw;
  return Number.isNaN(Date.parse(candidate)) ? undefined : new Date(candidate).toISOString();
}

export function normalizeTokenScreener(payload: unknown, smartMoney: boolean): TokenOption[] {
  const root = record(payload);
  const data = Array.isArray(root?.data) ? root.data : [];
  return data.flatMap((item) => {
    const row = record(item);
    const chain = string(row?.chain);
    const address = string(row?.token_address);
    const symbol = string(row?.token_symbol);
    if (!chain || !address || !symbol) return [];
    return [{
      chain,
      address,
      symbol,
      preview: {
        priceUsd: nullableNumber(row?.price_usd),
        volumeUsd: nullableNumber(row?.volume),
        smartMoneyNetflowUsd: smartMoney ? nullableNumber(row?.netflow) : null,
        smartMoneyTraders: smartMoney ? nullableNumber(row?.nof_traders) : null
      },
      snapshot: {
        deployedAt: normalizedDate(row?.token_deployment_date),
        marketCapUsd: nullableNumber(row?.market_cap_usd),
        fdvUsd: nullableNumber(row?.fdv),
        circulatingSupply: null,
        totalSupply: null,
        volumeUsd: nullableNumber(row?.volume),
        buyVolumeUsd: nullableNumber(row?.buy_volume),
        sellVolumeUsd: nullableNumber(row?.sell_volume),
        totalBuys: nullableNumber(row?.nof_buys),
        totalSells: nullableNumber(row?.nof_sells),
        uniqueBuyers: nullableNumber(row?.nof_buyers),
        uniqueSellers: nullableNumber(row?.nof_sellers),
        liquidityUsd: nullableNumber(row?.liquidity),
        totalHolders: null
      }
    }];
  });
}

export function normalizeTokenInformation(payload: unknown, chain: string): TokenOption | null {
  const root = record(payload);
  const data = record(root?.data);
  const address = string(data?.contract_address);
  const symbol = string(data?.symbol);
  if (!address || !symbol) return null;

  const details = record(data?.token_details);
  const spot = record(data?.spot_metrics);
  return {
    chain,
    address,
    symbol,
    name: string(data?.name) ?? undefined,
    preview: {
      priceUsd: null,
      volumeUsd: nullableNumber(spot?.volume_total_usd),
      smartMoneyNetflowUsd: null,
      smartMoneyTraders: null
    },
    snapshot: {
      logoUrl: safeUrl(data?.logo),
      deployedAt: normalizedDate(details?.token_deployment_date),
      websiteUrl: safeUrl(details?.website),
      xUrl: safeUrl(details?.x, "x"),
      telegramUrl: safeUrl(details?.telegram, "telegram"),
      marketCapUsd: nullableNumber(details?.market_cap_usd),
      fdvUsd: nullableNumber(details?.fdv_usd),
      circulatingSupply: nullableNumber(details?.circulating_supply),
      totalSupply: nullableNumber(details?.total_supply),
      volumeUsd: nullableNumber(spot?.volume_total_usd),
      buyVolumeUsd: nullableNumber(spot?.buy_volume_usd),
      sellVolumeUsd: nullableNumber(spot?.sell_volume_usd),
      totalBuys: nullableNumber(spot?.total_buys),
      totalSells: nullableNumber(spot?.total_sells),
      uniqueBuyers: nullableNumber(spot?.unique_buyers),
      uniqueSellers: nullableNumber(spot?.unique_sellers),
      liquidityUsd: nullableNumber(spot?.liquidity_usd),
      totalHolders: nullableNumber(spot?.total_holders)
    }
  };
}

export function normalizeFlowIntelligence(payload: unknown): FlowMetrics | null {
  const root = record(payload);
  const first = Array.isArray(root?.data) ? record(root.data[0]) : null;
  if (!first) return null;
  return {
    smartTraderNetflowUsd: nullableNumber(first.smart_trader_net_flow_usd),
    smartTraderAvgFlowUsd: nullableNumber(first.smart_trader_avg_flow_usd),
    smartTraderWalletCount: nullableNumber(first.smart_trader_wallet_count),
    whaleNetflowUsd: nullableNumber(first.whale_net_flow_usd),
    whaleAvgFlowUsd: nullableNumber(first.whale_avg_flow_usd),
    whaleWalletCount: nullableNumber(first.whale_wallet_count),
    exchangeNetflowUsd: nullableNumber(first.exchange_net_flow_usd),
    exchangeAvgFlowUsd: nullableNumber(first.exchange_avg_flow_usd),
    freshWalletNetflowUsd: nullableNumber(first.fresh_wallets_net_flow_usd),
    freshWalletAvgFlowUsd: nullableNumber(first.fresh_wallets_avg_flow_usd),
    publicFigureNetflowUsd: nullableNumber(first.public_figure_net_flow_usd),
    publicFigureAvgFlowUsd: nullableNumber(first.public_figure_avg_flow_usd),
    publicFigureWalletCount: nullableNumber(first.public_figure_wallet_count),
    topPnlNetflowUsd: nullableNumber(first.top_pnl_net_flow_usd),
    topPnlAvgFlowUsd: nullableNumber(first.top_pnl_avg_flow_usd),
    topPnlWalletCount: nullableNumber(first.top_pnl_wallet_count),
    warnings: Array.isArray(root?.warnings)
      ? root.warnings.filter((item): item is string => typeof item === "string")
      : []
  };
}

export function uniqueOptions(options: TokenOption[]) {
  return [...new Map(options.map((item) => [`${item.chain}:${item.address}`, item])).values()];
}
