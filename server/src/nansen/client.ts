import { TtlCache } from "../cache/ttlCache.js";
import {
  normalizeFlowIntelligence,
  normalizeTokenInformation,
  normalizeTokenScreener,
  uniqueOptions
} from "./normalize.js";
import type { FlowMetrics, NansenUsage, Resolution, TokenOption } from "./types.js";

const TOKEN_SCREENER_PATH = "/api/v1/token-screener";
const FLOW_INTELLIGENCE_PATH = "/api/v1/tgm/flow-intelligence";
const TOKEN_INFORMATION_PATH = "/api/v1/tgm/token-information";
const TOKEN_SCREENER_UNSUPPORTED_CHAINS = new Set(["arc"]);

function supportedTokenScreenerChains(chains: string[]) {
  return chains.filter((chain) => !TOKEN_SCREENER_UNSUPPORTED_CHAINS.has(chain.toLowerCase()));
}

type AddressFormat = "evm" | "solana" | "sui" | undefined;

export class NansenApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly retryAfter?: number
  ) {
    super(message);
  }
}

export function toResolution(options: TokenOption[]): Resolution {
  const unique = uniqueOptions(options);
  if (unique.length === 0) return { status: "not_found", source: "nansen" };
  if (unique.length === 1) return { status: "resolved", token: unique[0], source: "nansen" };
  return { status: "ambiguous", options: unique, source: "nansen" };
}

export class NansenClient {
  private readonly cache = new TtlCache<unknown>();
  private readonly usage: NansenUsage = { upstreamCalls: 0, creditsUsed: 0, byEndpoint: {} };
  private verifiedAt = 0;

  constructor(
    private readonly apiKey: string,
    private readonly chains: string[],
    private readonly fetcher: typeof fetch = fetch
  ) {
    if (chains.length < 1 || chains.length > 20) {
      throw new Error("CHAINS must contain between one and twenty chains.");
    }
  }

  getUsage(): NansenUsage {
    return { ...this.usage, byEndpoint: { ...this.usage.byEndpoint } };
  }

  async verifyConnection() {
    if (!this.apiKey) return false;
    if (Date.now() - this.verifiedAt < 5 * 60_000) return true;
    const verificationChain = supportedTokenScreenerChains(this.chains)[0] ?? "ethereum";
    await this.post(TOKEN_SCREENER_PATH, {
      chains: [verificationChain],
      timeframe: "5m",
      pagination: { page: 1, per_page: 1 }
    });
    this.verifiedAt = Date.now();
    return true;
  }

  async resolveToken(input: {
    identifier: string;
    kind: "cashtag" | "contract";
    addressFormat?: AddressFormat;
  }): Promise<Resolution> {
    const lookupChains = input.addressFormat === "solana"
      ? ["solana"]
      : input.addressFormat === "sui"
        ? ["sui"]
        : this.chains;
    const filterKey = input.kind === "cashtag" ? "token_symbol" : "token_address";
    const normalizedIdentifier = input.kind === "cashtag" ? input.identifier.toUpperCase() : input.identifier;
    const cacheKey = `resolve:${lookupChains.join(",")}:${filterKey}:${normalizedIdentifier}`;

    return this.cache.getOrLoad(cacheKey, 15 * 60_000, async () => {
      const smartOptions = await this.screenTokens(lookupChains, {
        timeframe: "24h",
        pagination: { page: 1, per_page: 30 },
        filters: { [filterKey]: normalizedIdentifier, trader_type: "sm" }
      }, true);
      let options = this.exactMatches(
        smartOptions,
        normalizedIdentifier,
        input.kind
      );

      if (options.length === 0) {
        const generalOptions = await this.screenTokens(lookupChains, {
          timeframe: "24h",
          pagination: { page: 1, per_page: 30 },
          filters: { [filterKey]: normalizedIdentifier, trader_type: "all" }
        }, false);
        options = this.exactMatches(
          generalOptions,
          normalizedIdentifier,
          input.kind
        );
      }

      // Address format identifies these chains unambiguously. Token Screener can lag
      // very recent launches, while Token Information accepts a direct mint lookup.
      if (
        options.length === 0 &&
        input.kind === "contract" &&
        (input.addressFormat === "solana" || input.addressFormat === "sui")
      ) {
        const chain = input.addressFormat;
        const token = await this.getTokenInformation(chain, normalizedIdentifier);
        if (token && token.address.toLowerCase() === normalizedIdentifier.toLowerCase()) {
          options = [token];
        }
      }

      // Arc is supported by Token Information and Flow Intelligence, but not by
      // Token Screener. For an EVM contract that the screener cannot resolve on
      // the other configured chains, try Arc directly when Arc is enabled.
      if (
        options.length === 0 &&
        input.kind === "contract" &&
        input.addressFormat === "evm" &&
        this.chains.some((chain) => chain.toLowerCase() === "arc")
      ) {
        const token = await this.tryGetTokenInformation("arc", normalizedIdentifier);
        if (token && token.address.toLowerCase() === normalizedIdentifier.toLowerCase()) {
          options = [token];
        }
      }
      return toResolution(options);
    }) as Promise<Resolution>;
  }

  async getFlowIntelligence(chain: string, address: string): Promise<FlowMetrics | null> {
    const cacheKey = `flow:${chain}:${address}:1d`;
    return this.cache.getOrLoad(cacheKey, 10 * 60_000, async () => {
      const payload = await this.post(FLOW_INTELLIGENCE_PATH, {
        chain,
        token_address: address,
        timeframe: "1d"
      });
      return normalizeFlowIntelligence(payload);
    }) as Promise<FlowMetrics | null>;
  }

  async getTokenInformation(chain: string, address: string): Promise<TokenOption | null> {
    const cacheKey = `token-info:${chain}:${address}`;
    return this.cache.getOrLoad(cacheKey, 5 * 60_000, async () => {
      const payload = await this.post(TOKEN_INFORMATION_PATH, {
        chain,
        token_address: address,
        timeframe: "1d"
      });
      return normalizeTokenInformation(payload, chain);
    }) as Promise<TokenOption | null>;
  }

  private async tryGetTokenInformation(chain: string, address: string): Promise<TokenOption | null> {
    try {
      return await this.getTokenInformation(chain, address);
    } catch (error) {
      if (
        error instanceof NansenApiError &&
        (error.status === 400 || error.status === 404 || error.status === 422)
      ) {
        return null;
      }
      throw error;
    }
  }

  private exactMatches(options: TokenOption[], identifier: string, kind: "cashtag" | "contract") {
    return options.filter((option) =>
      kind === "cashtag"
        ? option.symbol.toUpperCase() === identifier.toUpperCase()
        : option.address.toLowerCase() === identifier.toLowerCase()
    );
  }

  private async screenTokens(
    chains: string[],
    request: Record<string, unknown>,
    smartMoney: boolean
  ): Promise<TokenOption[]> {
    const supportedChains = supportedTokenScreenerChains(chains);
    const batches: string[][] = [];
    for (let index = 0; index < supportedChains.length; index += 5) {
      batches.push(supportedChains.slice(index, index + 5));
    }
    const payloads = await Promise.all(
      batches.map((batch) => this.post(TOKEN_SCREENER_PATH, { chains: batch, ...request }))
    );
    return payloads.flatMap((payload) => normalizeTokenScreener(payload, smartMoney));
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    if (!this.apiKey) throw new NansenApiError("Nansen API key is not configured.", 503, "not_configured");
    this.usage.upstreamCalls += 1;
    this.usage.byEndpoint[path] = (this.usage.byEndpoint[path] ?? 0) + 1;

    let response: Response;
    try {
      response = await this.fetcher(`https://api.nansen.ai${path}`, {
        method: "POST",
        headers: { apikey: this.apiKey, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12_000)
      });
    } catch (error) {
      throw new NansenApiError(
        error instanceof Error ? error.message : "Nansen request failed.",
        502,
        "upstream_unavailable"
      );
    }

    const credits = Number(response.headers.get("x-nansen-credits-used") ?? 0);
    if (Number.isFinite(credits)) this.usage.creditsUsed += credits;
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      throw new NansenApiError(
        typeof payload?.message === "string" ? payload.message : `Nansen API returned ${response.status}.`,
        response.status,
        typeof payload?.code === "string" ? payload.code : undefined,
        Number(response.headers.get("retry-after") ?? 0) || undefined
      );
    }
    return payload;
  }
}