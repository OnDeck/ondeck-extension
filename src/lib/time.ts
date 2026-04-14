/**
 * Tiny relative-time formatter. Avoids pulling in a date library for
 * the one place the extension needs to format "age" on list rows.
 * Returns strings like "5m", "3h", "2d", "1w".
 */
export function relativeAge(iso: string, nowMs: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Math.max(0, nowMs - then);
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.round(days / 365);
  return `${years}y`;
}
