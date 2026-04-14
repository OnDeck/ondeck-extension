export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < week) return `${Math.floor(diff / day)}d ago`;
  if (diff < 4 * week) return `${Math.floor(diff / week)}w ago`;
  const months = Math.floor(diff / (30 * day));
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function parseOwnerRepoFromRepositoryUrl(url: string): string | null {
  const match = /\/repos\/([^/]+\/[^/]+)$/.exec(url);
  return match ? match[1] : null;
}

export function openInNewTab(url: string): void {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    void chrome.tabs.create({ url, active: true });
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
