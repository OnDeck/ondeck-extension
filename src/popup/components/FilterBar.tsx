import type { DateBucket, ListFilters } from '../filters';

interface Props {
  filters: ListFilters;
  repos: string[];
  labels: string[];
  onChange: (next: ListFilters) => void;
}

const BUCKETS: Array<{ value: DateBucket; label: string }> = [
  { value: 'all', label: 'Any' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

const selectClass =
  'min-w-0 max-w-[120px] truncate rounded-md border border-gh-border-default bg-gh-canvas-default px-1 py-[2px] text-[10px] text-gh-fg-default';

export function FilterBar({ filters, repos, labels, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gh-border-muted bg-gh-canvas-subtle px-2 py-1">
      <label className="flex items-center gap-1 text-[10px] text-gh-fg-muted">
        Repo
        <select
          className={selectClass}
          value={filters.repo}
          onChange={(e) => onChange({ ...filters, repo: e.target.value || 'all' })}
        >
          <option value="all">All</option>
          {repos.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1 text-[10px] text-gh-fg-muted">
        Label
        <select
          className={selectClass}
          value={filters.label}
          onChange={(e) => onChange({ ...filters, label: e.target.value || 'all' })}
        >
          <option value="all">All</option>
          {labels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1 text-[10px] text-gh-fg-muted">
        Updated
        <select
          className={selectClass}
          value={filters.bucket}
          onChange={(e) => onChange({ ...filters, bucket: e.target.value as DateBucket })}
        >
          {BUCKETS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
