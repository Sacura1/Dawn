export type IdentifierKind = "cashtag" | "contract";

export type DetectedToken = {
  raw: string;
  normalized: string;
  kind: IdentifierKind;
  addressFormat?: "evm" | "solana" | "sui";
  start: number;
  end: number;
};

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

export type Signal = {
  type: "positive" | "negative" | "mixed" | "unusual" | "insufficient";
  label: string;
  explanation: string;
};

export type Intelligence = {
  token: Pick<TokenOption, "chain" | "address" | "symbol" | "name">;
  snapshot: TokenSnapshot | null;
  timeframe: "1d";
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
  signal: Signal;
  updatedAt: string;
  source: "nansen" | "fixture";
};

export type LensSettings = {
  enabled: boolean;
  hoverCards: boolean;
  apiBaseUrl: string;
};

export const DEFAULT_SETTINGS: LensSettings = {
  enabled: true,
  hoverCards: true,
  apiBaseUrl: "http://localhost:8787"
};
