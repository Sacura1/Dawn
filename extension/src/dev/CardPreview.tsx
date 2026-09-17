import { createRoot } from "react-dom/client";
import { TokenBadge } from "../components/TokenBadge";
import { DEFAULT_SETTINGS } from "../lib/types";
import lensStyles from "../styles/lens.css?inline";

const host = document.getElementById("lens-host")!;
host.dataset.theme = "light";
host.dataset.mode = "inline";
const shadow = host.attachShadow({ mode: "open" });
const style = document.createElement("style");
style.textContent = lensStyles;
const mount = document.createElement("div");
shadow.append(style, mount);

createRoot(mount).render(
  <TokenBadge
    detected={{ raw: "$ENA", normalized: "ENA", kind: "cashtag", start: 18, end: 22 }}
    settings={{ ...DEFAULT_SETTINGS, apiBaseUrl: "http://localhost:8788", hoverCards: true }}
    mode="inline"
  />
);
