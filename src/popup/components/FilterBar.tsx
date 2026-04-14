import type { DateRange, Filters } from '../lib/filters';

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
}

const RANGES: { key: DateRange; label: string }[] = [
  { key: 'any', label: 'Any' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: '1w' },
  { key: 'month', label: '1mo' },
];

export function FilterBar({ filters, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 border-b border-gh-border-muted px-4 py-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Repo"
          value={filters.repo}
          onChange={(e) => onChange({ ...filters, repo: e.target.value })}
          className="min-w-0 flex-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-[11px] text-gh-fg-default outline-none placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis"
        />
        <input
          type="text"
          placeholder="Label"
          value={filters.label}
          onChange={(e) => onChange({ ...filters, label: e.target.value })}
          className="min-w-0 flex-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-[11px] text-gh-fg-default outline-none placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis"
        />
      </div>
      <div className="flex gap-1">
        {RANGES.map((range) => (
          <button
            key={range.key}
            type="button"
            onClick={() => onChange({ ...filters, range: range.key })}
            className={
              'rounded-md border px-2 py-0.5 text-[10px] ' +
              (filters.range === range.key
                ? 'border-gh-accent-emphasis text-gh-fg-default'
                : 'border-gh-border-default text-gh-fg-muted hover:text-gh-fg-default')
            }
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}
