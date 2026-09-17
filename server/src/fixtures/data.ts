import type { FlowMetrics, Resolution, TokenOption } from "../nansen/types.js";

const ENA: TokenOption = {
  chain: "ethereum",
  address: "0x57e114B691Db790C35207b2e685D4A43181e6061",
  symbol: "ENA",
  name: "Ethena",
  preview: {
    priceUsd: 0.31,
    volumeUsd: 18_200_000,
    smartMoneyNetflowUsd: 84_500,
    smartMoneyTraders: 7
  },
  snapshot: {
    deployedAt: "2024-04-02T00:00:00.000Z",
    marketCapUsd: 580_000_000,
    fdvUsd: 4_650_000_000,
    circulatingSupply: 1_860_000_000,
    totalSupply: 15_000_000_000,
    volumeUsd: 18_200_000,
    buyVolumeUsd: 9_700_000,
    sellVolumeUsd: 8_500_000,
    totalBuys: 4_200,
    totalSells: 3_900,
    uniqueBuyers: 2_100,
    uniqueSellers: 1_870,
    liquidityUsd: 21_400_000,
    totalHolders: 54_200
  }
};

const SOL: TokenOption = {
  chain: "solana",
  address: "So11111111111111111111111111111111111111112",
  symbol: "SOL",
  name: "Wrapped SOL",
  preview: {
    priceUsd: 142.4,
    volumeUsd: 530_000_000,
    smartMoneyNetflowUsd: -41_200,
    smartMoneyTraders: 12
  },
  snapshot: {
    marketCapUsd: null,
    fdvUsd: null,
    circulatingSupply: null,
    totalSupply: null,
    volumeUsd: 530_000_000,
    buyVolumeUsd: 278_000_000,
    sellVolumeUsd: 252_000_000,
    totalBuys: 95_000,
    totalSells: 88_000,
    uniqueBuyers: 41_000,
    uniqueSellers: 38_000,
    liquidityUsd: 318_000_000,
    totalHolders: 2_700_000
  }
};

const ABC_OPTIONS: TokenOption[] = [
  { ...ENA, symbol: "ABC", name: "ABC on Ethereum" },
  { ...SOL, symbol: "ABC", name: "ABC on Solana" }
];

export function fixtureResolution(identifier: string): Resolution {
  const key = identifier.toUpperCase();
  if (key === "ENA" || identifier.toLowerCase() === ENA.address.toLowerCase()) {
    return { status: "resolved", token: ENA, source: "fixture" };
  }
  if (key === "SOL" || identifier === SOL.address) {
    return { status: "resolved", token: SOL, source: "fixture" };
  }
  if (key === "ABC") return { status: "ambiguous", options: ABC_OPTIONS, source: "fixture" };
  return { status: "not_found", source: "fixture" };
}

export function fixtureFlow(address: string): FlowMetrics | null {
  if (address.toLowerCase() === ENA.address.toLowerCase()) {
    return {
      smartTraderNetflowUsd: 84_500,
      smartTraderAvgFlowUsd: 12_071,
      smartTraderWalletCount: 7,
      whaleNetflowUsd: 22_400,
      whaleAvgFlowUsd: 7_467,
      whaleWalletCount: 3,
      exchangeNetflowUsd: -12_300,
      exchangeAvgFlowUsd: 6_150,
      freshWalletNetflowUsd: 7_100,
      freshWalletAvgFlowUsd: 2_367,
      publicFigureNetflowUsd: 3_200,
      publicFigureAvgFlowUsd: 3_200,
      publicFigureWalletCount: 1,
      topPnlNetflowUsd: 19_800,
      topPnlAvgFlowUsd: 9_900,
      topPnlWalletCount: 2,
      warnings: []
    };
  }
  if (address === SOL.address) {
    return {
      smartTraderNetflowUsd: -41_200,
      smartTraderAvgFlowUsd: 3_433,
      smartTraderWalletCount: 12,
      whaleNetflowUsd: -18_700,
      whaleAvgFlowUsd: 6_233,
      whaleWalletCount: 3,
      exchangeNetflowUsd: 30_200,
      exchangeAvgFlowUsd: 15_100,
      freshWalletNetflowUsd: null,
      freshWalletAvgFlowUsd: null,
      publicFigureNetflowUsd: 0,
      publicFigureAvgFlowUsd: null,
      publicFigureWalletCount: 0,
      topPnlNetflowUsd: -9_500,
      topPnlAvgFlowUsd: 4_750,
      topPnlWalletCount: 2,
      warnings: []
    };
  }
  return null;
}

export function fixtureTokenInformation(address: string): TokenOption | null {
  if (address.toLowerCase() === ENA.address.toLowerCase()) return ENA;
  if (address === SOL.address) return SOL;
  return null;
}
