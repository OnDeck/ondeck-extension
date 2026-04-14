/**
 * Build a short context snippet for a mention. Given a body of text and the
 * handle that was mentioned, returns ~120 chars centred on the mention, or
 * the first slice of the body if the mention isn't found inline.
 */
export function buildMentionSnippet(
  body: string | null | undefined,
  login: string,
  maxLength = 120,
): string {
  if (!body) return '';
  const trimmed = body.replace(/\s+/g, ' ').trim();
  if (trimmed.length === 0) return '';
  const handle = `@${login}`;
  const idx = trimmed.toLowerCase().indexOf(handle.toLowerCase());
  if (idx < 0) {
    return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
  }
  const radius = Math.floor((maxLength - handle.length) / 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(trimmed.length, idx + handle.length + radius);
  const slice = trimmed.slice(start, end);
  return (start > 0 ? '…' : '') + slice + (end < trimmed.length ? '…' : '');
}
