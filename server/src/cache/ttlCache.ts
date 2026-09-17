type Entry<T> = { value: T; expiresAt: number };

export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly pending = new Map<string, Promise<T>>();

  constructor(private readonly now: () => number = Date.now) {}

  get(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  getOrLoad(key: string, ttlMs: number, loader: () => Promise<T>) {
    const value = this.get(key);
    if (value !== undefined) return Promise.resolve(value);
    const inflight = this.pending.get(key);
    if (inflight) return inflight;

    const request = loader()
      .then((loaded) => {
        this.entries.set(key, { value: loaded, expiresAt: this.now() + ttlMs });
        return loaded;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }
}

