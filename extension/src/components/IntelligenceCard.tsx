import { useEffect, useState } from "react";
import { getIntelligence } from "../lib/api";
import type { Intelligence, TokenOption, TokenSnapshot } from "../lib/types";
import { ErrorCard } from "./ErrorCard";
import { LoadingCard } from "./LoadingCard";

function compactUsd(value: number | null, signed = true) {
  if (value === null) return "Unavailable";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${Intl.NumberFormat("en", {
    notation: Math.abs(value) >= 1_000 ? "compact" : "standard",
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) < 1_000 ? 0 : 1
  }).format(value)}`;
}

function tokenPrice(value: number | null) {
  if (value === null) return "Unavailable";
  const maximumFractionDigits = value < 0.01 ? 6 : value < 1 ? 4 : 2;
  return Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits
  }).format(value);
}

function compactNumber(value: number | null) {
  if (value === null) return "Unavailable";
  return Intl.NumberFormat("en", {
    notation: Math.abs(value) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(value);
}

function titleCase(value: string) {
  return value.replace(/(^|[-_])\w/g, (part) => part.replace(/[-_]/, " ").toUpperCase());
}

function tokenAge(value?: string) {
  if (!value) return null;
  const elapsed = Date.now() - Date.parse(value);
  if (!Number.isFinite(elapsed) || elapsed < 0) return null;
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just launched";
  if (minutes < 60) return `Launched ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `Launched ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Launched ${days}d ago`;
}

function walletDetail(value: number | null) {
  if (value === null) return "Wallet count unavailable";
  return `${compactNumber(value)} ${value === 1 ? "wallet" : "wallets"}`;
}

function MarketSnapshot({ snapshot, priceUsd }: { snapshot: TokenSnapshot; priceUsd: number | null }) {
  const facts = [
    ["Price", tokenPrice(priceUsd), priceUsd],
    ["Market cap", compactUsd(snapshot.marketCapUsd, false), snapshot.marketCapUsd],
    ["FDV", compactUsd(snapshot.fdvUsd, false), snapshot.fdvUsd],
    ["Liquidity", compactUsd(snapshot.liquidityUsd, false), snapshot.liquidityUsd],
    ["24h volume", compactUsd(snapshot.volumeUsd, false), snapshot.volumeUsd],
    ["Holders", compactNumber(snapshot.totalHolders), snapshot.totalHolders],
    ["Supply", compactNumber(snapshot.totalSupply), snapshot.totalSupply]
  ].filter(([, , value]) => value !== null) as Array<[string, string, number]>;

  if (facts.length === 0) return null;
  return (
    <section className="lens-section">
      <h3>Market snapshot</h3>
      <dl className="lens-market-grid">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function TradingActivity({ snapshot }: { snapshot: TokenSnapshot }) {
  const buy = snapshot.buyVolumeUsd;
  const sell = snapshot.sellVolumeUsd;
  if (
    buy === null && sell === null && snapshot.totalBuys === null && snapshot.totalSells === null &&
    snapshot.uniqueBuyers === null && snapshot.uniqueSellers === null
  ) return null;

  const total = (buy ?? 0) + (sell ?? 0);
  const buyShare = total > 0 ? Math.round(((buy ?? 0) / total) * 100) : 50;
  return (
    <section className="lens-section lens-trading">
      <h3>Trading activity <span>24h</span></h3>
      {buy !== null || sell !== null ? (
        <>
          <div className="lens-volume-labels">
            <span>Buys <strong>{compactUsd(buy, false)}</strong></span>
            <span>Sells <strong>{compactUsd(sell, false)}</strong></span>
          </div>
          <div className="lens-volume-bar" aria-label={`${buyShare}% buy volume`}>
            <span style={{ width: `${buyShare}%` }} />
          </div>
        </>
      ) : null}
      <div className="lens-activity-counts">
        {(snapshot.totalBuys !== null || snapshot.totalSells !== null) ? (
          <span>{compactNumber(snapshot.totalBuys)} buys · {compactNumber(snapshot.totalSells)} sells</span>
        ) : null}
        {(snapshot.uniqueBuyers !== null || snapshot.uniqueSellers !== null) ? (
          <span>{compactNumber(snapshot.uniqueBuyers)} buyers · {compactNumber(snapshot.uniqueSellers)} sellers</span>
        ) : null}
      </div>
    </section>
  );
}

function FlowRow({ label, value, detail }: { label: string; value: number | null; detail?: string }) {
  if (value === null) return null;
  const polarity = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
  return (
    <div className="lens-flow-row">
      <div><strong>{label}</strong>{detail ? <span>{detail}</span> : null}</div>
      <b className={`lens-flow-value lens-flow-value--${polarity}`}>{compactUsd(value)}</b>
    </div>
  );
}

export function IntelligenceCard({ apiBaseUrl, token }: { apiBaseUrl: string; token: TokenOption }) {
  const [data, setData] = useState<Intelligence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    getIntelligence(apiBaseUrl, token)
      .then((result) => active && setData(result))
      .catch((reason: unknown) =>
        active && setError(reason instanceof Error ? reason.message : "The service did not respond.")
      );
    return () => {
      active = false;
    };
  }, [apiBaseUrl, token, attempt]);

  if (error) return <ErrorCard message={error} onRetry={() => setAttempt((value) => value + 1)} />;
  if (!data) return <LoadingCard />;

  const identity = data.token;
  const snapshot = data.snapshot ?? token.snapshot ?? null;
  const age = tokenAge(snapshot?.deployedAt);
  const nansenUrl = `https://app.nansen.ai/token-god-mode?chain=${encodeURIComponent(identity.chain)}&tokenAddress=${encodeURIComponent(identity.address)}`;
  const links = [
    snapshot?.websiteUrl ? ["Website", snapshot.websiteUrl] : null,
    snapshot?.xUrl ? ["X", snapshot.xUrl] : null,
    snapshot?.telegramUrl ? ["Telegram", snapshot.telegramUrl] : null,
    ["Nansen", nansenUrl]
  ].filter(Boolean) as Array<[string, string]>;

  return (
    <section className="lens-card lens-dossier" aria-label={`${identity.symbol} on-chain intelligence`} onClick={(event) => event.stopPropagation()}>
      {data.source === "fixture" ? <span className="lens-dev">DEV DATA</span> : null}
      <header className="lens-card__header">
        {snapshot?.logoUrl ? (
          <img className="lens-token-logo" src={snapshot.logoUrl} alt="" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} />
        ) : <span className="lens-token-monogram" aria-hidden="true">{identity.symbol.slice(0, 1)}</span>}
        <div className="lens-identity">
          <strong className="lens-token">{identity.symbol}</strong>
          <span className="lens-name">{identity.name || "Token"}</span>
          <span className="lens-token-meta">{titleCase(identity.chain)}{age ? ` · ${age}` : ""}</span>
        </div>
      </header>

      {data.signal.type !== "insufficient" ? (
        <div className={`lens-signal lens-signal--${data.signal.type}`}>
          <span className="lens-signal__dot" aria-hidden="true" />
          <div><strong>{data.signal.label}</strong><span>{data.signal.explanation}</span></div>
        </div>
      ) : null}

      {snapshot ? <MarketSnapshot snapshot={snapshot} priceUsd={token.preview.priceUsd} /> : null}
      {snapshot ? <TradingActivity snapshot={snapshot} /> : null}

      <section className="lens-section lens-flows">
        <h3>Labeled wallet flows <span>24h</span></h3>
        <FlowRow label="Smart Traders" value={data.smartTraderNetflowUsd} detail={walletDetail(data.smartTraderWalletCount)} />
        <FlowRow label="Top PnL" value={data.topPnlNetflowUsd} detail={walletDetail(data.topPnlWalletCount)} />
        <FlowRow label="Public Figures" value={data.publicFigureNetflowUsd} detail={walletDetail(data.publicFigureWalletCount)} />
        <FlowRow label="Whales" value={data.whaleNetflowUsd} detail={walletDetail(data.whaleWalletCount)} />
        <FlowRow label="Exchanges" value={data.exchangeNetflowUsd} detail="Wallet count not tracked" />
        <FlowRow label="Fresh Wallets" value={data.freshWalletNetflowUsd} />
      </section>

      <footer className="lens-card__footer">
        <time dateTime={data.updatedAt}>Updated now</time>
        <nav aria-label="Token links">
          {links.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer">{label} ↗</a>)}
        </nav>
      </footer>
    </section>
  );
}
