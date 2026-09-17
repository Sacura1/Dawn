import { describe, expect, it } from "vitest";
import { detectTokens } from "./tokenDetection";

describe("detectTokens", () => {
  it("detects and normalizes a cashtag", () => {
    expect(detectTokens("Watching $ena")).toMatchObject([
      { raw: "$ena", normalized: "ENA", kind: "cashtag" }
    ]);
  });

  it("detects multiple cashtags and removes duplicates", () => {
    expect(detectTokens("$ENA versus $SOL and $ENA").map((item) => item.normalized)).toEqual([
      "ENA",
      "SOL"
    ]);
  });

  it("does not match currency amounts or one-letter tags", () => {
    expect(detectTokens("It costs $100 and maybe $A")).toEqual([]);
  });

  it("detects a valid EVM-format address without claiming a chain", () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    expect(detectTokens(`Token ${address}`)).toMatchObject([
      { normalized: address, kind: "contract", addressFormat: "evm" }
    ]);
  });

  it("detects a conservative Solana-format address", () => {
    const address = "So11111111111111111111111111111111111111112";
    expect(detectTokens(address)).toMatchObject([
      { normalized: address, kind: "contract", addressFormat: "solana" }
    ]);
  });

  it("detects a Sui coin type without mistaking it for an EVM address", () => {
    const address = "0xf631f902e31d96fa8fcb37a68a0ed6aa6d28ebb4afc5a3178365aff704a1e8bf::storm::STORM";
    expect(detectTokens(`CA: ${address}`)).toMatchObject([
      { normalized: address.toLowerCase(), kind: "contract", addressFormat: "sui" }
    ]);
  });

  it("rejects malformed addresses", () => {
    expect(detectTokens("0x1234 and O0Il-not-base58")).toEqual([]);
  });
});
