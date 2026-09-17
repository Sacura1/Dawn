import { DEFAULT_SETTINGS, type LensSettings } from "./types";

export async function getSettings(): Promise<LensSettings> {
  const values = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...values } as LensSettings;
}

export async function updateSettings(patch: Partial<LensSettings>) {
  await chrome.storage.sync.set(patch);
}

