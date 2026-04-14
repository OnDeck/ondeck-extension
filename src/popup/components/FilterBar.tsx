import type { DateRange, FilterState } from '../lib/filters';

interface Props {
  filter: FilterState;
  repos: string[];
  labels: string[];
  onChange: (next: FilterState) => void;
}

const RANGES: Array<{ id: DateRange; label: string }> = [
  { id: 'any', label: 'Any time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
];

export function FilterBar({ filter, repos, labels, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-2 text-[10px]">
      <select
        value={filter.repo}
        onChange={(e) => onChange({ ...filter, repo: e.target.value })}
        className="rounded-md border border-gh-border-default bg-gh-canvas-default px-1 py-0.5 text-gh-fg-default"
      >
        <option value="">All repos</option>
        {repos.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <select
        value={filter.label}
        onChange={(e) => onChange({ ...filter, label: e.target.value })}
        className="rounded-md border border-gh-border-default bg-gh-canvas-default px-1 py-0.5 text-gh-fg-default"
      >
        <option value="">All labels</option>
        {labels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      <select
        value={filter.range}
        onChange={(e) => onChange({ ...filter, range: e.target.value as DateRange })}
        className="rounded-md border border-gh-border-default bg-gh-canvas-default px-1 py-0.5 text-gh-fg-default"
      >
        {RANGES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
    </div>
  );
}
