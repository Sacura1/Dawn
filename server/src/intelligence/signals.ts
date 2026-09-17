import type { FlowMetrics } from "../nansen/types.js";

export type Signal = {
  type: "positive" | "negative" | "mixed" | "unusual" | "insufficient";
  label: string;
  explanation: string;
};

// Absolute MVP thresholds. They are descriptive, not price predictions.
export const SIGNAL_THRESHOLDS = {
  meaningfulFlowUsd: 25_000,
  unusualFlowUsd: 100_000,
  minimumWallets: 3,
  opposingFlowUsd: 10_000
} as const;

export function deriveSignal(metrics: FlowMetrics): Signal {
  const smart = metrics.smartTraderNetflowUsd;
  const wallets = metrics.smartTraderWalletCount;
  const whale = metrics.whaleNetflowUsd;

  if (smart === null || wallets === null) {
    return {
      type: "insufficient",
      label: "Not enough data",
      explanation: "Smart Trader flow or wallet coverage is unavailable."
    };
  }

  if (
    whale !== null &&
    Math.abs(smart) >= SIGNAL_THRESHOLDS.opposingFlowUsd &&
    Math.abs(whale) >= SIGNAL_THRESHOLDS.opposingFlowUsd &&
    Math.sign(smart) !== Math.sign(whale)
  ) {
    return {
      type: "mixed",
      label: "Mixed signals",
      explanation: "Smart Trader and whale flows are moving in opposite directions."
    };
  }

  if (Math.abs(smart) >= SIGNAL_THRESHOLDS.unusualFlowUsd && wallets >= 2) {
    return {
      type: "unusual",
      label: "Something moved",
      explanation: "Smart Trader net flow crossed the documented $100k activity threshold."
    };
  }

  if (smart >= SIGNAL_THRESHOLDS.meaningfulFlowUsd && wallets >= SIGNAL_THRESHOLDS.minimumWallets) {
    return {
      type: "positive",
      label: "Smart money is peeking 👀",
      explanation: "Net flow is positive across at least three tracked Smart Trader wallets."
    };
  }

  if (smart <= -SIGNAL_THRESHOLDS.meaningfulFlowUsd && wallets >= SIGNAL_THRESHOLDS.minimumWallets) {
    return {
      type: "negative",
      label: "Smart money cooling off",
      explanation: "Net flow is negative across at least three tracked Smart Trader wallets."
    };
  }

  return {
    type: "insufficient",
    label: "Not enough data",
    explanation: "Activity did not cross the documented signal thresholds."
  };
}

