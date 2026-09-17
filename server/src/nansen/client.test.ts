import { describe, expect, it } from "vitest";
import { NansenApiError, NansenClient, toResolution } from "./client.js";
import type { TokenOption } from "./types.js";

const option = (chain: string, address: string): TokenOption => ({
  chain,
  address,
  symbol: "ABC",
  preview: { priceUsd: null, volumeUsd: null, smartMoneyNetflowUsd: null, smartMoneyTraders: null }
});

describe("toResolution", () => {
  it("resolves exactly one result", () => {
    expect(toResolution([option("ethereum", "0x1")])).toMatchObject({ status: "resolved" });
  });

  it("returns ambiguity for multiple results", () => {
    expect(toResolution([option("ethereum", "0x1"), option("base", "0x2")])).toMatchObject({ status: "ambiguous" });
  });

  it("returns not_found for no result", () => {
    expect(toResolution([])).toEqual({ status: "not_found", source: "nansen" });
  });

  it("deduplicates repeated API rows", () => {
    expect(toResolution([option("ethereum", "0x1"), option("ethereum", "0x1")])).toMatchObject({ status: "resolved" });
  });

  it("surfaces API failures without manufacturing a resolution", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ message: "upstream failed", code: "internal_error" }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    const client = new NansenClient("test-key", ["ethereum"], fetcher as typeof fetch);
    await expect(
      client.resolveToken({ identifier: "ABC", kind: "cashtag" })
    ).rejects.toBeInstanceOf(NansenApiError);
  });

  it("uses the current trader-type filter before a general exact lookup", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fetcher = async (_input: string | URL | Request, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };
    const client = new NansenClient("test-key", ["ethereum"], fetcher as typeof fetch);

    await client.resolveToken({ identifier: "ABC", kind: "cashtag" });

    expect(bodies).toHaveLength(2);
    expect(bodies[0]?.filters).toEqual({ token_symbol: "ABC", trader_type: "sm" });
    expect(bodies[1]?.filters).toEqual({ token_symbol: "ABC", trader_type: "all" });
  });

  it("falls back to Token Information for a new Solana mint", async () => {
    const paths: string[] = [];
    const mint = "J1ushngfQwowfhx4qXnDG4SBMLKrAgbKoPaoionJw1uY";
    const fetcher = async (input: string | URL | Request) => {
      const path = new URL(String(input)).pathname;
      paths.push(path);
      const payload = path.endsWith("token-information")
        ? {
            data: {
              name: "Bike Tyson Bag",
              symbol: "BIKETYSON",
              contract_address: mint,
              spot_metrics: { volume_total_usd: 306.95 }
            }
          }
        : { data: [] };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };
    const client = new NansenClient("test-key", ["solana"], fetcher as typeof fetch);

    const result = await client.resolveToken({
      identifier: mint,
      kind: "contract",
      addressFormat: "solana"
    });

    expect(paths).toEqual([
      "/api/v1/token-screener",
      "/api/v1/token-screener",
      "/api/v1/tgm/token-information"
    ]);
    expect(result).toMatchObject({
      status: "resolved",
      token: { chain: "solana", address: mint, symbol: "BIKETYSON" }
    });
  });

  it("batches more than five configured chains and resolves Robinhood tokens", async () => {
    const address = "0x948647a06a6422dceea3711297f82aef68ec641c";
    const batches: string[][] = [];
    const fetcher = async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { chains: string[] };
      batches.push(body.chains);
      const data = body.chains.includes("robinhood")
        ? [{ chain: "robinhood", token_address: address, token_symbol: "WAIFU" }]
        : [];
      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };
    const client = new NansenClient(
      "test-key",
      ["ethereum", "base", "solana", "sui", "bnb", "arbitrum", "robinhood"],
      fetcher as typeof fetch
    );

    const result = await client.resolveToken({ identifier: address, kind: "contract", addressFormat: "evm" });

    expect(batches.every((batch) => batch.length <= 5)).toBe(true);
    expect(result).toMatchObject({ status: "resolved", token: { chain: "robinhood", symbol: "WAIFU" } });
  });
});
