const UNITS: { limit: number; divisor: number; unit: string }[] = [
  { limit: 60_000, divisor: 1_000, unit: 's' },
  { limit: 3_600_000, divisor: 60_000, unit: 'm' },
  { limit: 86_400_000, divisor: 3_600_000, unit: 'h' },
  { limit: 604_800_000, divisor: 86_400_000, unit: 'd' },
  { limit: 2_592_000_000, divisor: 604_800_000, unit: 'w' },
  { limit: 31_536_000_000, divisor: 2_592_000_000, unit: 'mo' },
];

export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, now - then);
  for (const { limit, divisor, unit } of UNITS) {
    if (diff < limit) return `${Math.max(1, Math.floor(diff / divisor))}${unit}`;
  }
  return `${Math.floor(diff / 31_536_000_000)}y`;
}

export function repoSlug(repositoryUrl: string): string {
  // https://api.github.com/repos/owner/name  →  owner/name
  const match = /\/repos\/([^/]+\/[^/]+)\/?$/.exec(repositoryUrl);
  return match ? match[1] : repositoryUrl;
}
