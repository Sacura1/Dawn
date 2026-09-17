import { describe, expect, it } from "vitest";
import { deriveSignal } from "./signals.js";
import type { FlowMetrics } from "../nansen/types.js";

const base: FlowMetrics = {
  smartTraderNetflowUsd: 0,
  smartTraderAvgFlowUsd: null,
  smartTraderWalletCount: 0,
  whaleNetflowUsd: 0,
  whaleAvgFlowUsd: null,
  whaleWalletCount: 0,
  exchangeNetflowUsd: null,
  exchangeAvgFlowUsd: null,
  freshWalletNetflowUsd: null,
  freshWalletAvgFlowUsd: null,
  publicFigureNetflowUsd: null,
  publicFigureAvgFlowUsd: null,
  publicFigureWalletCount: null,
  topPnlNetflowUsd: null,
  topPnlAvgFlowUsd: null,
  topPnlWalletCount: null,
  warnings: []
};

describe("deriveSignal", () => {
  it("returns positive evidence", () => {
    expect(deriveSignal({ ...base, smartTraderNetflowUsd: 30_000, smartTraderWalletCount: 4 }).type).toBe("positive");
  });

  it("returns negative evidence", () => {
    expect(deriveSignal({ ...base, smartTraderNetflowUsd: -30_000, smartTraderWalletCount: 4 }).type).toBe("negative");
  });

  it("prioritizes opposing smart and whale flow as mixed", () => {
    expect(deriveSignal({ ...base, smartTraderNetflowUsd: 30_000, smartTraderWalletCount: 4, whaleNetflowUsd: -20_000 }).type).toBe("mixed");
  });

  it("treats missing fields as insufficient", () => {
    expect(deriveSignal({ ...base, smartTraderNetflowUsd: null }).type).toBe("insufficient");
  });

  it("distinguishes zero from missing", () => {
    expect(deriveSignal(base)).toMatchObject({ type: "insufficient", explanation: expect.not.stringContaining("unavailable") });
    expect(deriveSignal({ ...base, smartTraderWalletCount: null }).explanation).toContain("unavailable");
  });

  it("returns unusual for a large move", () => {
    expect(deriveSignal({ ...base, smartTraderNetflowUsd: 120_000, smartTraderWalletCount: 2 }).type).toBe("unusual");
  });
});
