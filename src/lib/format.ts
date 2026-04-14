/**
 * Human-friendly relative time, e.g. "3h", "2d", "1mo".
 */
export function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.round(months / 12);
  return `${years}y`;
}

/**
 * Open a URL in a new tab. Uses the `tabs` API when available so the popup
 * stays open on sites that would otherwise block `window.open`.
 */
export function openInNewTab(url: string): void {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    void chrome.tabs.create({ url });
    return;
  }
  window.open(url, '_blank', 'noopener');
}

export function ownerRepoFromUrl(htmlUrl: string): string {
  try {
    const u = new URL(htmlUrl);
    const [, owner, repo] = u.pathname.split('/');
    if (owner && repo) return `${owner}/${repo}`;
  } catch {
    // ignore — fall through
  }
  return '';
}
