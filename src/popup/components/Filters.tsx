import { useEffect, useState } from 'react';

export interface FilterState {
  repo: string;
  label: string;
  range: 'any' | 'today' | 'week' | 'month';
}

interface Props {
  initial?: Partial<FilterState>;
  onChange: (state: FilterState) => void;
}

const RANGE_OPTIONS: { id: FilterState['range']; label: string }[] = [
  { id: 'any', label: 'Any' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

export function Filters({ initial, onChange }: Props) {
  const [state, setState] = useState<FilterState>({
    repo: initial?.repo ?? '',
    label: initial?.label ?? '',
    range: initial?.range ?? 'any',
  });

  useEffect(() => {
    onChange(state);
    // We deliberately omit onChange from the dep list to avoid a re-render loop
    // if the parent passes a new identity each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="flex flex-col gap-2 border-b border-gh-border-default bg-gh-canvas-subtle px-3 py-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={state.repo}
          onChange={(e) => setState((s) => ({ ...s, repo: e.target.value }))}
          placeholder="org/repo"
          className="min-w-0 flex-1 rounded-md border border-gh-border-default bg-gh-canvas-default px-2 py-1 text-[11px] text-gh-fg-default outline-none placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis"
        />
        <input
          type="text"
          value={state.label}
          onChange={(e) => setState((s) => ({ ...s, label: e.target.value }))}
          placeholder="label"
          className="min-w-0 flex-1 rounded-md border border-gh-border-default bg-gh-canvas-default px-2 py-1 text-[11px] text-gh-fg-default outline-none placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis"
        />
      </div>
      <div className="flex gap-1">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setState((s) => ({ ...s, range: opt.id }))}
            className={`rounded-md border px-2 py-[2px] text-[10px] ${
              state.range === opt.id
                ? 'border-gh-accent-emphasis text-gh-fg-default'
                : 'border-gh-border-default text-gh-fg-muted hover:text-gh-fg-default'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function applyFilters<
  T extends {
    repository_url?: string;
    repository?: { full_name: string };
    labels?: { name: string }[];
    updated_at: string;
  },
>(items: T[], filters: FilterState): T[] {
  const repoLc = filters.repo.trim().toLowerCase();
  const labelLc = filters.label.trim().toLowerCase();
  const cutoff = (() => {
    const now = Date.now();
    switch (filters.range) {
      case 'today':
        return now - 24 * 60 * 60 * 1000;
      case 'week':
        return now - 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return now - 30 * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  })();
  return items.filter((item) => {
    if (repoLc) {
      const repo = (
        item.repository?.full_name ??
        item.repository_url?.split('/repos/')[1] ??
        ''
      ).toLowerCase();
      if (!repo.includes(repoLc)) return false;
    }
    if (labelLc) {
      const labels = item.labels ?? [];
      if (!labels.some((l) => l.name.toLowerCase().includes(labelLc))) return false;
    }
    if (cutoff > 0 && new Date(item.updated_at).getTime() < cutoff) return false;
    return true;
  });
}
