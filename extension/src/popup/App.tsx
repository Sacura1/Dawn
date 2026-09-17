import { useEffect, useState } from "react";
import { clearLocalCaches, getApiStatus } from "../lib/api";
import { getSettings, updateSettings } from "../lib/settings";
import { DEFAULT_SETTINGS, type LensSettings } from "../lib/types";

type ApiState = "checking" | "connected" | "fixture" | "offline";

export function App() {
  const [settings, setSettings] = useState<LensSettings>(DEFAULT_SETTINGS);
  const [apiState, setApiState] = useState<ApiState>("checking");
  const [scannedToday, setScannedToday] = useState(0);
  const [upstreamCalls, setUpstreamCalls] = useState<number | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
    void chrome.storage.local.get(["scanDay", "scannedToday"]).then((stored) => {
      const today = new Date().toISOString().slice(0, 10);
      setScannedToday(stored.scanDay === today ? Number(stored.scannedToday ?? 0) : 0);
    });
  }, []);

  useEffect(() => {
    setApiState("checking");
    getApiStatus(settings.apiBaseUrl)
      .then((status) => {
        setApiState(status.fixtureMode ? "fixture" : status.connected ? "connected" : "offline");
        setUpstreamCalls(status.upstreamCalls);
      })
      .catch(() => setApiState("offline"));
  }, [settings.apiBaseUrl]);

  const change = async (patch: Partial<LensSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await updateSettings(patch);
  };

  const clearCache = async () => {
    clearLocalCaches();
    await chrome.storage.local.remove("selectedMappings");
  };

  const operatingState = !settings.enabled
    ? "Paused"
    : apiState === "connected"
      ? "Live"
      : apiState === "fixture"
        ? "Fixture"
        : apiState === "checking"
          ? "Syncing"
          : "Offline";

  const connectionLabel = apiState === "checking"
    ? "Checking Nansen"
    : apiState === "connected"
      ? "Nansen connected"
      : apiState === "fixture"
        ? "Development data"
        : "Nansen disconnected";

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div className="popup-brand">
          <img src="/icons/dawn-48.png" alt="" />
          <div>
            <strong>Dawn</strong>
            <span>Onchain signal layer</span>
          </div>
        </div>
        <span className={`operating-state operating-state--${operatingState.toLowerCase()}`}>
          <i />{operatingState}
        </span>
      </header>

      <section className="popup-intro">
        <h1>{settings.enabled ? <>Token intelligence<br />is active.</> : <>Token intelligence<br />is paused.</>}</h1>
        <p>Read the chain without leaving the feed.</p>
        <span className="horizon" aria-hidden="true" />
      </section>

      <div className="popup-body">
        <section className={`connection connection--${apiState}`} aria-label="Nansen API status">
          <div>
            <i className="api-dot" />
            <span><small>Data source</small><strong>{connectionLabel}</strong></span>
          </div>
          <b>{apiState === "connected" ? "Ready" : apiState === "checking" ? "Wait" : "Check"}</b>
        </section>

        <section className="controls" aria-label="Extension preferences">
          <label>
            <span><strong>Token details</strong><small>Detect supported assets on X</small></span>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => void change({ enabled: event.target.checked })}
            />
          </label>
          <label>
            <span><strong>Open on hover</strong><small>Click remains available</small></span>
            <input
              type="checkbox"
              checked={settings.hoverCards}
              onChange={(event) => void change({ hoverCards: event.target.checked })}
            />
          </label>
        </section>

        <section className="pulse" aria-label="Activity">
          <div><span>Tokens seen</span><strong>{String(scannedToday).padStart(2, "0")}</strong></div>
          <div><span>API calls</span><strong>{upstreamCalls === null ? "—" : String(upstreamCalls).padStart(2, "0")}</strong></div>
        </section>

        <footer>
          <span>Dawn keeps running after this closes.</span>
          <button type="button" onClick={() => void clearCache()}>Clear cache</button>
        </footer>
      </div>
    </main>
  );
}
