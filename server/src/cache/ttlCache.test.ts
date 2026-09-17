import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "./ttlCache.js";

describe("server TtlCache", () => {
  it("hits before expiry and reloads after expiry", async () => {
    let now = 0;
    const loader = vi.fn(async () => "fresh");
    const cache = new TtlCache<string>(() => now);
    expect(await cache.getOrLoad("key", 10, loader)).toBe("fresh");
    expect(await cache.getOrLoad("key", 10, loader)).toBe("fresh");
    now = 11;
    expect(await cache.getOrLoad("key", 10, loader)).toBe("fresh");
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

