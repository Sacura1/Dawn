import { detectTokens } from "../lib/tokenDetection";

export type ScannedPost = {
  article: HTMLElement;
  textElement: HTMLElement;
  tokens: ReturnType<typeof detectTokens>;
};

export function scanPost(article: HTMLElement): ScannedPost | null {
  const textElement = article.querySelector<HTMLElement>('[data-testid="tweetText"]');
  if (!textElement) return null;
  const tokens = detectTokens(textElement.innerText);
  if (tokens.length === 0) return null;
  return { article, textElement, tokens };
}

