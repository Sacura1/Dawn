const POST_SELECTOR = 'article[data-testid="tweet"]';

export class PostObserver {
  private readonly discovered = new WeakSet<HTMLElement>();
  private readonly visibleObserver: IntersectionObserver;
  private readonly mutationObserver: MutationObserver;

  constructor(
    private readonly onVisible: (post: HTMLElement) => void,
    private readonly onRemoved: (post: HTMLElement) => void
  ) {
    this.visibleObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          this.visibleObserver.unobserve(entry.target);
          this.onVisible(entry.target as HTMLElement);
        }
      },
      { rootMargin: "220px 0px", threshold: 0.01 }
    );

    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) this.discoverInside(node);
        for (const node of mutation.removedNodes) this.cleanupInside(node);
      }
    });
  }

  start() {
    this.discoverInside(document.body);
    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  stop() {
    this.mutationObserver.disconnect();
    this.visibleObserver.disconnect();
  }

  private register(post: HTMLElement) {
    if (this.discovered.has(post)) return;
    this.discovered.add(post);
    this.visibleObserver.observe(post);
  }

  private discoverInside(node: Node) {
    if (!(node instanceof HTMLElement)) return;
    if (node.matches(POST_SELECTOR)) this.register(node);
    for (const post of node.querySelectorAll<HTMLElement>(POST_SELECTOR)) this.register(post);
  }

  private cleanupInside(node: Node) {
    if (!(node instanceof HTMLElement)) return;
    if (node.matches(POST_SELECTOR)) this.onRemoved(node);
    for (const post of node.querySelectorAll<HTMLElement>(POST_SELECTOR)) this.onRemoved(post);
  }
}

