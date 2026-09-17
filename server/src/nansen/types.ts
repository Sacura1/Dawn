export type PreviewMetrics = {
  priceUsd: number | null;
  volumeUsd: number | null;
  smartMoneyNetflowUsd: number | null;
  smartMoneyTraders: number | null;
};

export type TokenSnapshot = {
  logoUrl?: string;
  deployedAt?: string;
  websiteUrl?: string;
  xUrl?: string;
  telegramUrl?: string;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  volumeUsd: number | null;
  buyVolumeUsd: number | null;
  sellVolumeUsd: number | null;
  totalBuys: number | null;
  totalSells: number | null;
  uniqueBuyers: number | null;
  uniqueSellers: number | null;
  liquidityUsd: number | null;
  totalHolders: number | null;
};

export type TokenOption = {
  chain: string;
  address: string;
  symbol: string;
  name?: string;
  preview: PreviewMetrics;
  snapshot?: TokenSnapshot;
};

export type Resolution =
  | { status: "resolved"; token: TokenOption; source: "nansen" | "fixture" }
  | { status: "ambiguous"; options: TokenOption[]; source: "nansen" | "fixture" }
  | { status: "not_found"; source: "nansen" | "fixture" };

export type FlowMetrics = {
  smartTraderNetflowUsd: number | null;
  smartTraderAvgFlowUsd: number | null;
  smartTraderWalletCount: number | null;
  whaleNetflowUsd: number | null;
  whaleAvgFlowUsd: number | null;
  whaleWalletCount: number | null;
  exchangeNetflowUsd: number | null;
  exchangeAvgFlowUsd: number | null;
  freshWalletNetflowUsd: number | null;
  freshWalletAvgFlowUsd: number | null;
  publicFigureNetflowUsd: number | null;
  publicFigureAvgFlowUsd: number | null;
  publicFigureWalletCount: number | null;
  topPnlNetflowUsd: number | null;
  topPnlAvgFlowUsd: number | null;
  topPnlWalletCount: number | null;
  warnings: string[];
};

export type NansenUsage = {
  upstreamCalls: number;
  creditsUsed: number;
  byEndpoint: Record<string, number>;
};
