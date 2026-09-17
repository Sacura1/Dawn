import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { resolveToken } from "../lib/api";
import type { DetectedToken, LensSettings, Resolution, TokenOption } from "../lib/types";
import badgeStyles from "../styles/lens.css?inline";
import { ErrorCard } from "./ErrorCard";
import { IntelligenceCard } from "./IntelligenceCard";

function metricLabel(value: number | null) {
  if (value === null) return "Smart Money";
  const formatted = Intl.NumberFormat("en", {
    notation: "compact",
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 1
  }).format(Math.abs(value));
  return `${value >= 0 ? "+" : "−"}${formatted} SM`;
}

function optionKey(token: TokenOption) {
  return `${token.chain}:${token.address}`;
}

function InlineOverlay({
  children,
  theme
}: {
  children: ReactNode;
  theme: "light" | "dark";
}) {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const host = document.createElement("div");
    host.dataset.dawnOverlay = "true";
    host.dataset.theme = theme;
    host.style.position = "fixed";
    host.style.inset = "0";
    host.style.zIndex = "2147483647";
    host.style.pointerEvents = "none";

    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = badgeStyles;
    const portalMount = document.createElement("div");
    shadow.append(style, portalMount);
    document.documentElement.appendChild(host);
    setMount(portalMount);

    return () => {
      setMount(null);
      host.remove();
    };
  }, [theme]);

  return mount ? createPortal(children, mount) : null;
}

export function TokenBadge({
  detected,
  settings,
  mode = "badge"
}: {
  detected: DetectedToken;
  settings: LensSettings;
  mode?: "badge" | "inline";
}) {
  const panelId = useId();
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [selected, setSelected] = useState<TokenOption | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>();

  const cancelClose = () => {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const openFromHover = () => {
    cancelClose();
    if (settings.hoverCards) setOpen(true);
  };

  const closeFromHover = () => {
    if (!settings.hoverCards) return;
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 140);
  };

  useEffect(() => {
    if ((mode === "inline" && !open) || resolution) return;
    let active = true;
    setError(null);
    resolveToken(settings.apiBaseUrl, detected)
      .then(async (result) => {
        if (!active) return;
        setResolution(result);
        if (result.status === "resolved") setSelected(result.token);
        if (result.status === "ambiguous") {
          const stored = await chrome.storage.local.get("selectedMappings");
          const mappings = (stored.selectedMappings ?? {}) as Record<string, string>;
          const remembered = result.options.find(
            (option) => optionKey(option) === mappings[detected.normalized]
          );
          if (active && remembered) setSelected(remembered);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "The service did not respond.");
      });
    return () => {
      active = false;
    };
  }, [detected, settings.apiBaseUrl, attempt, mode, open, resolution]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  useEffect(() => () => cancelClose(), []);

  useLayoutEffect(() => {
    if (!open || mode !== "inline" || !triggerRef.current) return;
    const position = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 350;
      const estimatedHeight = Math.min(520, window.innerHeight - 24);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - estimatedHeight - 12));
      setPopoverStyle({ left, position: "fixed", top });
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [mode, open]);

  const choose = async (option: TokenOption) => {
    setSelected(option);
    const stored = await chrome.storage.local.get("selectedMappings");
    await chrome.storage.local.set({
      selectedMappings: {
        ...(stored.selectedMappings ?? {}),
        [detected.normalized]: optionKey(option)
      }
    });
  };

  const unresolved = resolution?.status === "not_found";
  const unresolvedContract = unresolved && detected.kind === "contract";
  const displayIdentifier = detected.kind === "contract"
    ? `${detected.raw.slice(0, 6)}…${detected.raw.slice(-4)}`
    : detected.raw;
  const ambiguous = resolution?.status === "ambiguous" && !selected;
  const badgeText = selected
    ? metricLabel(selected.preview.smartMoneyNetflowUsd)
    : ambiguous
      ? "Choose token"
      : unresolved
        ? unresolvedContract ? "Unavailable" : "No match"
        : error
          ? "Couldn’t fetch"
          : "Checking chain";
  const polarity = selected?.preview.smartMoneyNetflowUsd === null || !selected
    ? "neutral"
    : selected.preview.smartMoneyNetflowUsd > 0
      ? "positive"
      : selected.preview.smartMoneyNetflowUsd < 0
        ? "negative"
      : "neutral";

  const theme = triggerRef.current?.getRootNode() instanceof ShadowRoot
    ? ((triggerRef.current.getRootNode() as ShadowRoot).host.getAttribute("data-theme") === "dark" ? "dark" : "light")
    : "light";

  const popover = open ? (
    <div
      className="lens-popover"
      id={panelId}
      style={mode === "inline" ? popoverStyle : undefined}
      onMouseEnter={cancelClose}
      onMouseLeave={closeFromHover}
    >
      {error ? (
        <ErrorCard message={error} onRetry={() => setAttempt((value) => value + 1)} />
      ) : ambiguous && resolution?.status === "ambiguous" ? (
        <section className="lens-card" aria-label={`Choose a token for ${detected.raw}`}>
          {resolution.source === "fixture" ? <span className="lens-dev">DEV DATA</span> : null}
          <header className="lens-picker__header">
            <strong>Which {detected.normalized}?</strong>
            <span>A few tokens use this symbol.</span>
          </header>
          <div className="lens-picker">
            {resolution.options.map((option) => (
              <button key={optionKey(option)} type="button" onClick={() => void choose(option)}>
                <span><strong>{option.symbol}</strong> · {option.chain}</span>
                <small>{`${option.address.slice(0, 6)}…${option.address.slice(-4)}`}</small>
              </button>
            ))}
          </div>
        </section>
      ) : selected ? (
        <IntelligenceCard apiBaseUrl={settings.apiBaseUrl} token={selected} />
      ) : unresolved ? (
        <section className="lens-card lens-card--center">
          <strong>{unresolvedContract ? "No Nansen data for this contract." : "Nothing useful here yet."}</strong>
          <span>
            {unresolvedContract
              ? "It may be on a chain Nansen doesn’t support yet, or it may not be indexed."
              : "Nansen didn’t return an exact token-symbol match."}
          </span>
        </section>
      ) : (
        <div className="lens-card lens-card--center" role="status">
          <span className="lens-orbit" aria-hidden="true" />
          <span>Checking Nansen…</span>
        </div>
      )}
    </div>
  ) : null;

  return (
    <span
      className={`lens-wrap${mode === "inline" ? " lens-wrap--inline" : ""}`}
      onMouseEnter={openFromHover}
      onMouseLeave={closeFromHover}
    >
      {mode === "inline" ? (
        <span
          ref={(node) => { triggerRef.current = node; }}
          className="lens-inline-trigger"
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`View Nansen intelligence for ${detected.raw}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen((value) => !value);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            setOpen((value) => !value);
          }}
        >
          {detected.raw}
        </span>
      ) : (
        <button
          ref={(node) => { triggerRef.current = node; }}
          type="button"
          className={`lens-badge lens-badge--${polarity}${unresolved || error ? " lens-badge--muted" : ""}`}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${detected.raw}: ${badgeText}`}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="lens-eye" aria-hidden="true"><span /></span>
          <span className="lens-badge__token" title={detected.kind === "contract" ? detected.raw : undefined}>
            {displayIdentifier}
          </span>
          <span className="lens-badge__divider" aria-hidden="true" />
          <span className="lens-badge__metric">{badgeText}</span>
          {!resolution && !error ? <span className="lens-dots" aria-hidden="true">•••</span> : null}
        </button>
      )}

      {mode === "inline" && popover ? <InlineOverlay theme={theme}>{popover}</InlineOverlay> : popover}
    </span>
  );
}
