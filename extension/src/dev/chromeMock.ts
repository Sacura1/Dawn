const syncStore: Record<string, unknown> = { apiBaseUrl: "http://localhost:8788" };
const localStore: Record<string, unknown> = { scannedToday: 14, scanDay: new Date().toISOString().slice(0, 10) };

function area(store: Record<string, unknown>) {
  return {
    async get(keys?: string | string[] | Record<string, unknown>) {
      if (!keys) return { ...store };
      if (typeof keys === "string") return { [keys]: store[keys] };
      if (Array.isArray(keys)) return Object.fromEntries(keys.map((key) => [key, store[key]]));
      return { ...keys, ...store };
    },
    async set(values: Record<string, unknown>) {
      Object.assign(store, values);
    },
    async remove(keys: string | string[]) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete store[key];
    }
  };
}

globalThis.chrome = {
  storage: {
    sync: area(syncStore),
    local: area(localStore),
    onChanged: { addListener() {} }
  }
} as unknown as typeof chrome;
