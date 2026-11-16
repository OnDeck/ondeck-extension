/** Rows in the notification list carry this attribute with their thread id. */
export const ROW_ATTRIBUTE = 'data-row-id';

/**
 * Single-key shortcuts must not fire while typing, with a modifier held, or
 * while a dialog (settings, filters) is open on top of the list.
 */
export function shouldIgnoreShortcut(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return true;
  const target = event.target as HTMLElement | null;
  if (target) {
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return true;
  }
  return document.querySelector('[role="dialog"]') !== null;
}

/** Index to move to from `current` (-1 when nothing is focused), clamped to the list. */
export function stepIndex(current: number, length: number, delta: 1 | -1): number {
  if (length === 0) return -1;
  if (current < 0) return delta === 1 ? 0 : length - 1;
  return Math.min(length - 1, Math.max(0, current + delta));
}

export function listRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`[${ROW_ATTRIBUTE}]`));
}
