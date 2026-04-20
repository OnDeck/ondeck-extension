// Glyph + color used to identify a notification's subject type at a glance.
// Unicode keeps the popup dependency-free; swap to SVG if we ever need pixel
// alignment or accessibility names beyond aria-hidden.

interface Entry {
  icon: string;
  color: string;
}

const SUBJECT_GLYPHS: Record<string, Entry> = {
  PullRequest: { icon: '⬈', color: 'text-gh-success-emphasis' },
  Issue: { icon: '◎', color: 'text-gh-success-emphasis' },
  Discussion: { icon: '💬', color: 'text-gh-done-emphasis' },
  Release: { icon: '⏷', color: 'text-gh-accent-emphasis' },
  Commit: { icon: '◆', color: 'text-gh-fg-muted' },
  CheckSuite: { icon: '✓', color: 'text-gh-attention-emphasis' },
};

const FALLBACK: Entry = { icon: '•', color: 'text-gh-fg-muted' };

export function SubjectIcon({ type }: { type: string }) {
  const entry = SUBJECT_GLYPHS[type] ?? FALLBACK;
  return (
    <span aria-hidden="true" className={`mt-0.5 shrink-0 text-sm ${entry.color}`}>
      {entry.icon}
    </span>
  );
}
