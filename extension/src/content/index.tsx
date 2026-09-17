import { getSettings } from "../lib/settings";
import { cleanupAll, cleanupPost, injectBadges } from "./injector";
import { PostObserver } from "./observer";
import { scanPost } from "./scanner";

let observer: PostObserver | null = null;

async function start() {
  const settings = await getSettings();
  if (!settings.enabled || observer) return;

  observer = new PostObserver(
    (article) => {
      const post = scanPost(article);
      if (post) injectBadges(post.article, post.textElement, post.tokens, settings);
    },
    cleanupPost
  );
  observer.start();
}

function stop() {
  observer?.stop();
  observer = null;
  cleanupAll();
}

void start();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  if (changes.enabled?.newValue === false) {
    stop();
    return;
  }
  if (changes.enabled || changes.hoverCards || changes.apiBaseUrl) {
    stop();
    void start();
  }
});
