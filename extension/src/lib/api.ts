import { TtlCache } from "./cache";
import type { DetectedToken, Intelligence, Resolution, TokenOption } from "./types";

const resolutionCache = new TtlCache<Resolution>();
const intelligenceCache = new TtlCache<Intelligence>();

async function request<T>(apiBaseUrl: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function resolveToken(apiBaseUrl: string, token: DetectedToken) {
  const key = `${token.kind}:${token.addressFormat ?? "symbol"}:${token.normalized}`;
  return resolutionCache.getOrLoad(key, 5 * 60_000, () =>
    request<Resolution>(apiBaseUrl, "/api/resolve", {
      identifier: token.normalized,
      kind: token.kind,
      addressFormat: token.addressFormat
    })
  );
}

export function getIntelligence(apiBaseUrl: string, token: TokenOption) {
  const key = `${token.chain}:${token.address}:flow:1d`;
  return intelligenceCache.getOrLoad(key, 5 * 60_000, () =>
    request<Intelligence>(apiBaseUrl, "/api/intelligence", {
      chain: token.chain,
      address: token.address,
      symbol: token.symbol,
      name: token.name
    })
  );
}

export function getApiStatus(apiBaseUrl: string) {
  return request<{
    connected: boolean;
    fixtureMode: boolean;
    upstreamCalls: number;
    creditsUsed: number;
  }>(apiBaseUrl, "/api/status");
}

export function clearLocalCaches() {
  resolutionCache.clear();
  intelligenceCache.clear();
}
