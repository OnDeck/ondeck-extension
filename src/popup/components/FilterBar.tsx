import type { DateRange, FilterState } from '../../lib/filters';

interface Props {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
  repos: string[];
  labels: string[];
}

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

export function FilterBar({ filter, onChange, repos, labels }: Props) {
  const selectClass =
    'rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-0.5 text-[11px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis';

  return (
    <div className="flex flex-wrap items-center gap-1 text-[11px]">
      <select
        aria-label="Repository filter"
        className={selectClass}
        value={filter.repo}
        onChange={(e) => onChange({ ...filter, repo: e.target.value })}
      >
        <option value="">All repos</option>
        {repos.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <select
        aria-label="Label filter"
        className={selectClass}
        value={filter.label}
        onChange={(e) => onChange({ ...filter, label: e.target.value })}
      >
        <option value="">All labels</option>
        {labels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      <div className="inline-flex overflow-hidden rounded-md border border-gh-border-default">
        {RANGE_OPTIONS.map((opt) => {
          const active = filter.range === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...filter, range: opt.value })}
              className={
                'px-2 py-0.5 text-[10px] font-semibold ' +
                (active
                  ? 'bg-gh-accent-emphasis text-white'
                  : 'text-gh-fg-muted hover:text-gh-fg-default')
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
