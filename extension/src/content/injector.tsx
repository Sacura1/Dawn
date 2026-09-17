import { createRoot, type Root } from "react-dom/client";
import { TokenBadge } from "../components/TokenBadge";
import type { DetectedToken, LensSettings } from "../lib/types";
import badgeStyles from "../styles/lens.css?inline";

type MountedLens = { root: Root; host: HTMLElement; raw: string };

const mountsByPost = new Map<HTMLElement, MountedLens[]>();
let scanUpdate = Promise.resolve();

export function injectBadges(
  article: HTMLElement,
  textElement: HTMLElement,
  tokens: DetectedToken[],
  settings: LensSettings
) {
  if (article.dataset.dawnProcessed === "true") return;
  article.dataset.dawnProcessed = "true";

  const mounts: MountedLens[] = [];
  for (const token of tokens) {
    const match = findTextMatch(textElement, token.raw);
    if (!match) continue;

    const matchedText = match.node.splitText(match.index);
    matchedText.splitText(token.raw.length);
    const host = document.createElement("span");
    host.dataset.dawn = "token";
    host.dataset.mode = "inline";
    host.dataset.theme = surfaceTheme(article);
    host.style.display = "inline";
    host.style.font = "inherit";
    host.style.lineHeight = "inherit";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = badgeStyles;
    const mount = document.createElement("span");
    shadow.append(style, mount);
    matchedText.replaceWith(host);

    const root = createRoot(mount);
    root.render(<TokenBadge detected={token} settings={settings} mode="inline" />);
    mounts.push({ root, host, raw: token.raw });
  }
  mountsByPost.set(article, mounts);
  if (mounts.length > 0) void incrementScanned(mounts.length);
}

function findTextMatch(root: HTMLElement, raw: string): { node: Text; index: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const node = current as Text;
    const parent = node.parentElement;
    if (parent && !parent.closest("[data-dawn]")) {
      const index = (node.nodeValue ?? "").indexOf(raw);
      if (index >= 0) return { node, index };
    }
    current = walker.nextNode();
  }
  return null;
}

function surfaceTheme(element: HTMLElement): "light" | "dark" {
  let current: HTMLElement | null = element;
  while (current) {
    const color = getComputedStyle(current).backgroundColor;
    const match = color.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)(?:[, /]+([\d.]+))?\)/);
    if (match && Number(match[4] ?? 1) > 0.1) {
      const luminance = Number(match[1]) * 0.2126 + Number(match[2]) * 0.7152 + Number(match[3]) * 0.0722;
      return luminance < 128 ? "dark" : "light";
    }
    current = current.parentElement;
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function incrementScanned(count: number) {
  scanUpdate = scanUpdate.then(async () => {
    const day = new Date().toISOString().slice(0, 10);
    const stored = await chrome.storage.local.get(["scanDay", "scannedToday"]);
    const current = stored.scanDay === day ? Number(stored.scannedToday ?? 0) : 0;
    await chrome.storage.local.set({ scanDay: day, scannedToday: current + count });
  });
  return scanUpdate;
}

export function cleanupPost(article: HTMLElement) {
  for (const mounted of mountsByPost.get(article) ?? []) restoreMount(mounted);
  mountsByPost.delete(article);
}

export function cleanupAll() {
  for (const [article, mounts] of mountsByPost) {
    for (const mounted of mounts) restoreMount(mounted);
    delete article.dataset.dawnProcessed;
  }
  mountsByPost.clear();
}

function restoreMount({ root, host, raw }: MountedLens) {
  root.unmount();
  if (!host.isConnected) return;
  const parent = host.parentNode;
  host.replaceWith(document.createTextNode(raw));
  parent?.normalize();
}
