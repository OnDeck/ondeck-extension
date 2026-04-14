import type { ListFilters } from '../lib/filters';

interface Props {
  filters: ListFilters;
  repos: string[];
  labels: string[];
  onChange: (next: ListFilters) => void;
}

export function FilterBar({ filters, repos, labels, onChange }: Props) {
  const update = (patch: Partial<ListFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gh-border-muted px-4 py-2 text-[11px]">
      <select
        value={filters.repo}
        onChange={(e) => update({ repo: e.target.value })}
        className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-gh-fg-default"
      >
        <option value="all">All repos</option>
        {repos.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select
        value={filters.label}
        onChange={(e) => update({ label: e.target.value })}
        className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-gh-fg-default"
      >
        <option value="all">All labels</option>
        {labels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <select
        value={filters.range}
        onChange={(e) => update({ range: e.target.value as ListFilters['range'] })}
        className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-gh-fg-default"
      >
        <option value="any">Any time</option>
        <option value="today">Today</option>
        <option value="week">Last 7d</option>
        <option value="month">Last 30d</option>
      </select>
    </div>
  );
}
