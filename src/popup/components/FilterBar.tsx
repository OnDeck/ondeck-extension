import type { DateRange, FilterState } from '../../lib/filters';

interface Props {
  state: FilterState;
  repos: string[];
  labels: string[];
  onChange: (next: FilterState) => void;
}

const RANGES: { value: DateRange; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
];

export function FilterBar({ state, repos, labels, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gh-border-default bg-gh-canvas-subtle px-4 py-2 text-[11px]">
      <select
        value={state.repo ?? ''}
        onChange={(e) =>
          onChange({ ...state, repo: e.target.value || null })
        }
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
        value={state.label ?? ''}
        onChange={(e) =>
          onChange({ ...state, label: e.target.value || null })
        }
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
        value={state.range}
        onChange={(e) =>
          onChange({ ...state, range: e.target.value as DateRange })
        }
        className="rounded-md border border-gh-border-default bg-gh-canvas-default px-1 py-0.5 text-gh-fg-default"
      >
        {RANGES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    </div>
  );
}
