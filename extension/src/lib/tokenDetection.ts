import type { DetectedToken } from "./types";

const CASHTAG = /\$[A-Za-z][A-Za-z0-9]{1,14}\b/g;
const EVM_ADDRESS = /\b0x[a-fA-F0-9]{40}\b/g;
const SUI_COIN_TYPE = /\b0x[a-fA-F0-9]{64}(?:::[A-Za-z_][A-Za-z0-9_]*::[A-Za-z_][A-Za-z0-9_]*)?\b/g;
const SOLANA_ADDRESS = /(?<![1-9A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{32,44}(?![1-9A-HJ-NP-Za-km-z])/g;

function overlaps(candidate: DetectedToken, existing: DetectedToken[]) {
  return existing.some((item) => candidate.start < item.end && candidate.end > item.start);
}

function looksLikeSolanaAddress(value: string) {
  return /[A-Za-z]/.test(value) && /[1-9]/.test(value);
}

export function detectTokens(text: string): DetectedToken[] {
  const found: DetectedToken[] = [];

  for (const match of text.matchAll(SUI_COIN_TYPE)) {
    if (match.index === undefined) continue;
    found.push({
      raw: match[0],
      normalized: match[0].toLowerCase(),
      kind: "contract",
      addressFormat: "sui",
      start: match.index,
      end: match.index + match[0].length
    });
  }

  for (const match of text.matchAll(EVM_ADDRESS)) {
    if (match.index === undefined) continue;
    const candidate: DetectedToken = {
      raw: match[0],
      normalized: match[0].toLowerCase(),
      kind: "contract",
      addressFormat: "evm",
      start: match.index,
      end: match.index + match[0].length
    };
    if (!overlaps(candidate, found)) found.push(candidate);
  }

  for (const match of text.matchAll(SOLANA_ADDRESS)) {
    if (match.index === undefined || !looksLikeSolanaAddress(match[0])) continue;
    const candidate: DetectedToken = {
      raw: match[0],
      normalized: match[0],
      kind: "contract",
      addressFormat: "solana",
      start: match.index,
      end: match.index + match[0].length
    };
    if (!overlaps(candidate, found)) found.push(candidate);
  }

  for (const match of text.matchAll(CASHTAG)) {
    if (match.index === undefined) continue;
    const candidate: DetectedToken = {
      raw: match[0],
      normalized: match[0].slice(1).toUpperCase(),
      kind: "cashtag",
      start: match.index,
      end: match.index + match[0].length
    };
    if (!overlaps(candidate, found)) found.push(candidate);
  }

  return found
    .sort((a, b) => a.start - b.start)
    .filter((item, index, items) => {
      const first = items.findIndex(
        (candidate) =>
          candidate.kind === item.kind && candidate.normalized === item.normalized
      );
      return first === index;
    });
}
