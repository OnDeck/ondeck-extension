import type { DateRange, FilterState } from '../filters';

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  repoOptions: string[];
}

const RANGES: Array<{ id: DateRange; label: string }> = [
  { id: 'any', label: 'Any' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
];

export function FilterBar({ value, onChange, repoOptions }: Props) {
  return (
    <div className="flex flex-col gap-1 border-b border-gh-border-default bg-gh-canvas-default px-2 py-1.5">
      <div className="flex items-center gap-1">
        <select
          aria-label="Filter by repo"
          value={value.repo}
          onChange={(e) => onChange({ ...value, repo: e.target.value })}
          className="min-w-0 flex-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-[11px] text-gh-fg-default focus:border-gh-accent-emphasis focus:outline-none"
        >
          <option value="">All repos</option>
          {repoOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          aria-label="Filter by label"
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          placeholder="Label"
          className="min-w-0 flex-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-[11px] text-gh-fg-default placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-1">
        {RANGES.map((r) => {
          const active = r.id === value.dateRange;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onChange({ ...value, dateRange: r.id })}
              className={
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' +
                (active
                  ? 'border-gh-accent-emphasis text-gh-accent-emphasis'
                  : 'border-gh-border-muted text-gh-fg-muted hover:text-gh-fg-default')
              }
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
