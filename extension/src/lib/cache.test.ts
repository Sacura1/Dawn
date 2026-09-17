import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "./cache";

describe("TtlCache", () => {
  it("returns a cache hit before expiry", () => {
    const cache = new TtlCache(() => 100);
    cache.set("ethereum:0x1:flow", "value", 50);
    expect(cache.get("ethereum:0x1:flow")).toBe("value");
  });

  it("expires values", () => {
    let now = 100;
    const cache = new TtlCache(() => now);
    cache.set("key", "value", 50);
    now = 151;
    expect(cache.get("key")).toBeUndefined();
  });

  it("keeps chain and address keys independent", () => {
    const cache = new TtlCache<string>();
    cache.set("ethereum:0x1:flow", "eth", 1000);
    cache.set("base:0x1:flow", "base", 1000);
    expect(cache.get("ethereum:0x1:flow")).toBe("eth");
    expect(cache.get("base:0x1:flow")).toBe("base");
  });

  it("coalesces simultaneous loads", async () => {
    const loader = vi.fn(async () => "value");
    const cache = new TtlCache<string>();
    const [first, second] = await Promise.all([
      cache.getOrLoad("key", 1000, loader),
      cache.getOrLoad("key", 1000, loader)
    ]);
    expect([first, second]).toEqual(["value", "value"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

